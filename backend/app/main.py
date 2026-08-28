from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uvicorn
import os
import uuid

from .models.schemas import (
    ProspectProfile,
    DossierResponse,
    OutreachCampaign,
    RealEstateProject,
    TriageRequest,
    TriageResponse,
    TaxComparison
)
from .collectors.radar_worker import intent_radar
from .enrichment.profiler import enrich_signal_to_prospect, get_preset_prospects
from .financial_engine.tax_model import calculate_tax_arbitrage, TAX_RATES_DATABASE
from .inventory.projects import get_all_projects, match_projects_for_budget
from .ai_generator.dossier_agent import build_dossier
from .outreach.dispatcher import create_outreach_campaign, triage_incoming_response, get_all_campaigns

app = FastAPI(
    title="Dubai Capital Radar API",
    description="Autonomous Capital Flight & Crypto Liquidity Real Estate Acquisition System for Dubai",
    version="1.0.0"
)

# Enable CORS for frontend clients (Localhost and Render domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio
import httpx

# In-Memory State for fast prototyping and live demo
PROSPECTS_STORE: Dict[str, ProspectProfile] = {}
DOSSIERS_STORE: Dict[str, DossierResponse] = {}
AUTOPILOT_ENABLED: bool = False
AUTOPILOT_DISPATCH_COUNT: int = 0

from .safety.anti_ban import anti_ban_guard
from .crm.sync_tadh import crm_bridge

WHATSAPP_GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://localhost:3001")

async def dispatch_whatsapp_direct(to_phone: str, message: str, bypass_shield: bool = False):
    """
    Delivers message via WhatsApp Web Gateway while respecting the Anti-Ban Safety Protocol.
    """
    if not bypass_shield:
        can_send, reason = anti_ban_guard.can_send()
        if not can_send:
            print(f"🛡️ [ANTI-BAN SHIELD] Outbound paused: {reason}")
            return {"success": False, "throttled": True, "reason": reason}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/send", json={"to": to_phone, "message": message})
            data = res.json()
            if data.get("success"):
                anti_ban_guard.record_send()
                print(f"📨 [ANTI-BAN SHIELD] Message safely delivered to {to_phone} ({anti_ban_guard.daily_sent_count}/{anti_ban_guard.max_daily_limit} today)")
            return data
    except Exception as e:
        return {"success": False, "error": str(e), "simulated": True}

async def autopilot_daemon():
    """Continuous background worker with Anti-Ban Protection and CRM Synchronization."""
    global AUTOPILOT_ENABLED, AUTOPILOT_DISPATCH_COUNT
    while True:
        try:
            if AUTOPILOT_ENABLED:
                new_sig = radar_engine.trigger_live_scan()
                prospect = enrich_signal_to_prospect(new_sig)
                PROSPECTS_STORE[prospect.id] = prospect

                # Auto-generate AI Dossier with Gemini
                dossier = build_dossier(prospect)
                DOSSIERS_STORE[dossier.slug] = dossier
                DOSSIERS_STORE[dossier.dossier_id] = dossier

                # Create multi-channel campaign
                campaign = create_outreach_campaign(prospect, dossier)
                prospect.status = "contacted"
                AUTOPILOT_DISPATCH_COUNT += 1

                # 1. Automatically sync Lead to CRM Real Estate TDAH (https://tadh-crm.netlify.app/)
                await crm_bridge.sync_lead_to_crm(prospect, dossier)

                # 2. Safely dispatch WhatsApp message via Anti-Ban shield
                if prospect.phone and campaign.whatsapp_message:
                    await dispatch_whatsapp_direct(prospect.phone, campaign.whatsapp_message)

                # 3. Add humanized randomized cooldown between outreach actions
                jitter = anti_ban_guard.get_randomized_delay()
                print(f"⏳ [ANTI-BAN SHIELD] Humanized pause: next scan in {jitter}s")
                await asyncio.sleep(jitter)
                continue

        except Exception as err:
            print(f"⚠️ [AUTOPILOT DAEMON ERROR]: {err}")

        # Standard cycle if autopilot is idle
        await asyncio.sleep(60)

PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://dubai-capital-radar.onrender.com")

async def keep_alive_pulse_daemon():
    """
    Continuous keep-alive pinger running every 8 minutes (480s) 
    to guarantee Render containers never enter sleep/spin-down mode.
    """
    await asyncio.sleep(60)  # Initial wait after cold start
    while True:
        try:
            target_url = f"{PUBLIC_APP_URL}/api/health"
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(target_url, headers={"User-Agent": "Dubai-Capital-Radar-Pulse/1.0 (Keep-Alive)"})
                print(f"💓 [KEEP-ALIVE PULSE] Heartbeat delivered to {target_url} -> Status: {res.status_code} (100% Uptime Active)")
        except Exception as err:
            print(f"⚠️ [KEEP-ALIVE PULSE WARNING]: {err}")
        
        # Ping every 8 minutes (Render sleeps at 15 minutes of inactivity)
        await asyncio.sleep(480)

@app.on_event("startup")
async def startup_seed():
    # Seed preset high-conviction prospects
    preset_prospects = get_preset_prospects()
    for p in preset_prospects:
        PROSPECTS_STORE[p.id] = p
        # Pre-generate dossiers for seed prospects
        dos = build_dossier(p)
        DOSSIERS_STORE[dos.slug] = dos
        DOSSIERS_STORE[dos.dossier_id] = dos
        # Pre-seed sample campaign
        create_outreach_campaign(p, dos)

    # Start the continuous Autopilot background daemon (1 minute interval)
    asyncio.create_task(autopilot_daemon())

    # Start the continuous Keep-Alive pulse daemon (8 minute interval)
    asyncio.create_task(keep_alive_pulse_daemon())

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Dubai Capital Radar Core API",
        "gemini_ai_connected": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "cached_signals": len(radar_engine.get_latest_signals()),
        "active_prospects": len(PROSPECTS_STORE),
        "dossiers_generated": len(DOSSIERS_STORE) // 2,
        "autopilot_enabled": AUTOPILOT_ENABLED,
        "autopilot_dispatches": AUTOPILOT_DISPATCH_COUNT
    }

# --- AUTOPILOT ENDPOINTS ---

@app.get("/api/autopilot/status")
def get_autopilot_status():
    global AUTOPILOT_ENABLED, AUTOPILOT_DISPATCH_COUNT
    return {
        "autopilot_enabled": AUTOPILOT_ENABLED,
        "dispatches_count": AUTOPILOT_DISPATCH_COUNT
    }

@app.post("/api/autopilot/toggle")
def toggle_autopilot():
    global AUTOPILOT_ENABLED
    AUTOPILOT_ENABLED = not AUTOPILOT_ENABLED
    return {
        "autopilot_enabled": AUTOPILOT_ENABLED,
        "message": f"Autopilot is now {'ENABLED (Auto-Detect, Auto-Dossier & Auto-WhatsApp Dispatch Active)' if AUTOPILOT_ENABLED else 'DISABLED (Supervised Mode)'}"
    }

# --- RADAR & SIGNALS ENDPOINTS ---


# --- RADAR v2.0 - REAL INTENT SIGNALS ENDPOINTS ---

@app.get("/api/radar/signals")
async def get_signals():
    """Run a fresh radar scan and return real intent signals from Reddit and social platforms."""
    try:
        signals = await intent_radar.run_full_scan()
        return {"signals": signals, "count": len(signals), "source": "live_social_scan"}
    except Exception as e:
        return {"signals": [], "count": 0, "error": str(e)}

@app.post("/api/radar/scan")
async def trigger_radar_scan():
    """Trigger a new radar scan manually."""
    try:
        signals = await intent_radar.run_full_scan()
        return {
            "status": "scan_complete",
            "new_signals": len(signals),
            "top_signal": signals[0] if signals else None
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}



# --- PROSPECTS & ENRICHMENT ---

@app.get("/api/prospects", response_model=List[ProspectProfile])
def list_prospects():
    return list(PROSPECTS_STORE.values())

@app.post("/api/prospects/enrich-signal/{signal_id}", response_model=ProspectProfile)
def enrich_signal(signal_id: str):
    signals = radar_engine.get_latest_signals()
    sig = next((s for s in signals if s.id == signal_id), None)
    if not sig:
        raise HTTPException(status_code=404, detail="Signal not found")
    prospect = enrich_signal_to_prospect(sig)
    PROSPECTS_STORE[prospect.id] = prospect
    return prospect

# --- DOSSIERS & FINANCIAL MODELING ---

@app.post("/api/dossier/generate/{prospect_id}", response_model=DossierResponse)
def generate_prospect_dossier(prospect_id: str):
    prospect = PROSPECTS_STORE.get(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    dossier = build_dossier(prospect)
    DOSSIERS_STORE[dossier.slug] = dossier
    DOSSIERS_STORE[dossier.dossier_id] = dossier
    prospect.status = "dossier_generated"
    return dossier

@app.get("/api/dossier/{slug_or_id}", response_model=DossierResponse)
def get_dossier(slug_or_id: str):
    dossier = DOSSIERS_STORE.get(slug_or_id)
    if not dossier:
        # Search by partial slug or ID
        for d in DOSSIERS_STORE.values():
            if d.slug == slug_or_id or d.dossier_id == slug_or_id:
                return d
        
        # If not cached yet (e.g. after fresh deploy or direct link), synthesize dynamically:
        clean_slug = slug_or_id.lower()
        parts = [p.capitalize() for p in slug_or_id.replace('-principal-', ' ').replace('-demo', '').replace('-', ' ').split() if p and not p.isdigit()]
        raw_name = " ".join(parts[:4]) or "Private Client"
        
        country = "United Kingdom"
        if any(k in clean_slug for k in ["munich", "berlin", "frankfurt", "germany", "gmbh"]):
            country = "Germany"
        elif any(k in clean_slug for k in ["madrid", "spain", "barcelona", "valencia"]):
            country = "Spain"
        elif any(k in clean_slug for k in ["france", "paris", "french", "lyon"]):
            country = "France"
        elif any(k in clean_slug for k in ["canada", "toronto", "vancouver"]):
            country = "Canada"
        elif any(k in clean_slug for k in ["us", "usa", "america", "california", "york"]):
            country = "United States"
        
        is_crypto = any(k in clean_slug for k in ["crypto", "token", "web3", "protocol", "node", "hyperion", "blockchain", "otc", "whale"])

        fallback_prospect = ProspectProfile(
            id=f"prosp-{uuid.uuid4().hex[:8]}",
            name=raw_name,
            email="confidential@familyoffice.com",
            phone="+971501378020",
            role_title="Managing Partner & Principal",
            company_name=raw_name if " " in raw_name else f"{raw_name} Capital",
            country=country,
            estimated_net_worth_usd=9500000.0,
            liquidity_event="Institutional Liquidity & Asset Allocation Event" if not is_crypto else "Crypto OTC Liquidity & Token Treasury Diversification",
            tier="Tier 1",
            interests=["Tax Arbitrage", "10-Year Golden Visa", "Dubai Prime Real Estate"] + (["Crypto-to-Escrow", "Zero Capital Gains"] if is_crypto else []),
            matched_projects=[],
            status="contacted"
        )
        dossier = build_dossier(fallback_prospect)
        dossier.slug = slug_or_id
        DOSSIERS_STORE[slug_or_id] = dossier
        DOSSIERS_STORE[dossier.dossier_id] = dossier

    return dossier

@app.get("/api/financial/tax-comparison")
def get_custom_tax_comparison(country: str, income: float = 500000.0, capital_gains: float = 2000000.0) -> TaxComparison:
    return calculate_tax_arbitrage(country, income, capital_gains)

@app.get("/api/financial/supported-countries")
def get_supported_countries():
    return list(TAX_RATES_DATABASE.keys())

# --- INVENTORY & MATCHING ---

@app.get("/api/inventory", response_model=List[RealEstateProject])
def get_inventory():
    return get_all_projects()

# --- WHATSAPP QR GATEWAY INTEGRATION ---
import httpx

WHATSAPP_GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://localhost:3001")

@app.get("/api/whatsapp/status")
async def get_whatsapp_gateway_status():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{WHATSAPP_GATEWAY_URL}/status")
            return res.json()
    except Exception:
        return {"connected": False, "phone": None, "has_qr": False, "gateway_online": False}

@app.get("/api/whatsapp/qr")
async def get_whatsapp_qr():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{WHATSAPP_GATEWAY_URL}/qr")
            return res.json()
    except Exception:
        return {"connected": False, "qr": None, "gateway_online": False}

@app.post("/api/whatsapp/send")
async def send_whatsapp_message(payload: Dict[str, str]):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/send", json=payload)
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e), "simulated": True}

@app.post("/api/whatsapp/logout")
async def logout_whatsapp():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/logout")
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/whatsapp/verify-numbers")
async def verify_whatsapp_numbers(payload: Dict[str, Any]):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/verify-numbers", json=payload)
            return res.json()
    except Exception as e:
        return {"error": str(e)}

# --- OUTREACH & CAMPAIGNS ---

@app.get("/api/campaigns", response_model=List[OutreachCampaign])
def list_campaigns():
    return get_all_campaigns()

@app.post("/api/campaigns/launch/{prospect_id}", response_model=OutreachCampaign)
async def launch_campaign_for_prospect(prospect_id: str):
    prospect = PROSPECTS_STORE.get(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    # Ensure dossier exists
    dossier = next((d for d in DOSSIERS_STORE.values() if d.prospect.id == prospect_id), None)
    if not dossier:
        dossier = build_dossier(prospect)
        DOSSIERS_STORE[dossier.slug] = dossier
        DOSSIERS_STORE[dossier.dossier_id] = dossier

    campaign = create_outreach_campaign(prospect, dossier)
    prospect.status = "contacted"

    # Automatically dispatch to WhatsApp respecting Anti-Ban Guard
    if prospect.phone and campaign.whatsapp_message:
        await dispatch_whatsapp_direct(prospect.phone, campaign.whatsapp_message)

    # Sync to CRM Real Estate TDAH
    await crm_bridge.sync_lead_to_crm(prospect, dossier)

    return campaign

# --- SAFETY & ANTI-BAN PROTOCOL ---

@app.get("/api/safety/status")
def get_safety_status():
    return anti_ban_guard.get_status()

# --- PROSPECTING & GOOGLE X-RAY QUERIES ---

@app.get("/api/xray-queries")
def get_google_xray_queries():
    return radar_engine.get_xray_queries()

# --- CRM REAL ESTATE TDAH SYNC ---

@app.get("/api/crm/leads")
def get_crm_synced_leads():
    return crm_bridge.get_synced_leads()

@app.post("/api/crm/sync-all")
async def sync_all_to_crm():
    count = 0
    for p in PROSPECTS_STORE.values():
        dossier = next((d for d in DOSSIERS_STORE.values() if d.prospect.id == p.id), None)
        await crm_bridge.sync_lead_to_crm(p, dossier)
        count += 1
    return {
        "success": True,
        "synced_count": count,
        "crm_url": "https://tadh-crm.netlify.app"
    }

from .outreach.miami_event_campaign import (
    MIAMI_EVENT_LEADS, 
    build_miami_message, 
    dispatch_miami_event_campaign,
    get_miami_campaign_status
)

@app.get("/api/campaigns/miami-event/leads")
def get_miami_event_leads():
    return {
        "event": "Dubai Real Estate Investment VIP Briefing (Miami - Hilton Garden Miramar)",
        "event_date": "Sunday, August 29 (10:00 AM - 8:00 PM)",
        "total_leads": len(MIAMI_EVENT_LEADS),
        "attached_flyer": "/static/dubai_miami_event.jpg",
        "leads": [
            {
                "index": i + 1,
                "name": lead["name"],
                "phone": lead["phone"],
                "email": lead["email"],
                "sample_message": build_miami_message(lead["name"])
            }
            for i, lead in enumerate(MIAMI_EVENT_LEADS)
        ]
    }

@app.get("/api/campaigns/miami-event/status")
def get_miami_status():
    return get_miami_campaign_status()

@app.post("/api/campaigns/miami-event/launch")
async def launch_miami_event_campaign(background_tasks: BackgroundTasks):
    background_tasks.add_task(dispatch_miami_event_campaign)
    return {
        "success": True,
        "message": f"Campana iniciada con exito en segundo plano para los {len(MIAMI_EVENT_LEADS)} leads con imagen adjunta y pausas de seguridad anti-baneo."
    }

@app.post("/api/triage/classify", response_model=TriageResponse)
def classify_reply(request: TriageRequest):
    return triage_incoming_response(request)

# --- INBOUND WHATSAPP AI INGESTION & AUTO-TRIAGE WEBHOOK ---
from .inventory.project_parser import parse_project_from_text, is_developer_or_launch_message
from .outreach.ai_agent import classify_message_intent, generate_ai_response
from .content.social_generator import generate_daily_social_pack

INGESTED_PROJECTS_FEED: List[Dict[str, Any]] = []

@app.post("/api/whatsapp/inbound-webhook")
async def handle_whatsapp_inbound(payload: Dict[str, Any]):
    """
    Receives incoming WhatsApp messages in real-time.
    1. If from developer/launch group -> Gemini parses project facts and adds to inventory knowledge.
    2. If from prospect -> Gemini classifies intent & generates personalized reply context.
    """
    text = payload.get("text", "")
    sender = payload.get("sender", "")
    is_group = payload.get("is_group", False)

    if not text:
        return {"status": "ignored", "reason": "empty_content"}

    # 1. Developer project launch detection
    if is_developer_or_launch_message(text, is_group=is_group):
        parsed_project = await parse_project_from_text(text)
        if parsed_project:
            parsed_project["sender"] = sender
            parsed_project["is_group"] = is_group
            parsed_project["detected_at"] = payload.get("timestamp")
            INGESTED_PROJECTS_FEED.insert(0, parsed_project)
            print(f"[Auto-Ingestion] New project parsed: {parsed_project.get('project_name')} by {parsed_project.get('developer')}")
            return {
                "status": "project_ingested",
                "project_name": parsed_project.get("project_name"),
                "developer": parsed_project.get("developer"),
                "starting_price_aed": parsed_project.get("starting_price_aed")
            }

    # 2. Prospect conversation triage
    intent_data = await classify_message_intent(text)
    return {
        "status": "prospect_message_processed",
        "sender": sender,
        "intent": intent_data.get("intent"),
        "urgency": intent_data.get("urgency"),
        "notify_human": intent_data.get("notify_human", False)
    }

@app.get("/api/inventory/ingested-launches")
def get_ingested_launches():
    """Returns all project updates automatically ingested from WhatsApp groups/chats."""
    return {
        "total_ingested": len(INGESTED_PROJECTS_FEED),
        "projects": INGESTED_PROJECTS_FEED[:20]
    }

@app.get("/api/content/daily-pack")
async def get_daily_content_pack(lang: str = "es"):
    """Generates daily organic social media pack (WhatsApp Status, LinkedIn, Instagram)."""
    return await generate_daily_social_pack(language=lang)


# --- STATIC FILES & SINGLE PAGE APP (SPA) ROUTING ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static media
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Check potential frontend dist directories
possible_dist_dirs = [
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"),
    os.path.join(os.getcwd(), "frontend", "dist"),
    "/app/frontend/dist"
]

frontend_dist = next((d for d in possible_dist_dirs if os.path.exists(d)), None)

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        target_file = os.path.join(frontend_dist, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
