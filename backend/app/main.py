from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Any, Optional
import uvicorn
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

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
from .security.auth import rate_limiter, verify_supabase_user, sanitize_text

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

# Mount static files directory for flyers and documents
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

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
                signals = await intent_radar.run_full_scan()
                if signals:
                    top = signals[0]
                    # Log autopilot signal detected
                    print(f"🤖 [AUTOPILOT] Top intent signal detected: {top.get('platform')}")

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
        "service": "Dubai Capital Radar Core API (SaaS Engine)",
        "groq_ai_connected": bool(os.getenv("GROQ_API_KEY")),
        "gemini_ai_connected": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "supabase_connected": bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY"))),
        "cached_signals": 0,
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
    prospect = PROSPECTS_STORE.get(signal_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Signal or prospect not found")
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
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/logout")
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/whatsapp/pairing-code")
async def request_whatsapp_pairing_code(payload: Dict[str, Any]):
    """Requests an 8-character pairing code to link WhatsApp without camera scanning."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/pairing-code", json=payload)
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/whatsapp/restart")
async def restart_whatsapp_gateway():
    """Forces gateway socket restart to generate a fresh QR immediately."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/restart")
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
    return [
        'site:linkedin.com/in ("Founder" OR "CEO") ("Madrid" OR "Miami" OR "London") "Family Office"',
        'site:linkedin.com/in ("Angel Investor" OR "Web3" OR "Fintech") ("Spain" OR "Latin America")',
        'site:linkedin.com/in ("Real Estate Investor" OR "Private Equity") "Dubai"'
    ]

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

# --- UNIFIED CRM & DYNAMIC CAMPAIGNS API (DATABASE BACKED) ---
from .database.crm_db import (
    get_campaigns_list,
    get_campaign_by_id,
    create_campaign_with_leads,
    get_leads_by_campaign,
    get_lead_by_id,
    mark_lead_whatsapp_sent,
    update_lead_crm_fields,
    add_lead_note_db,
    get_lead_notes_db,
    get_all_crm_leads,
    update_campaign_ai_prompt,
    update_single_lead_message,
    regenerate_campaign_lead_messages
)
from .crm.batch_dispatcher import batch_manager
from .crm.excel_parser import parse_spreadsheet_bytes, map_and_structure_leads

@app.get("/api/crm/campaigns")
def api_get_campaigns():
    """Returns list of all campaigns with real-time lead counts and sent stats."""
    return {"campaigns": get_campaigns_list()}

@app.post("/api/crm/campaigns/upload-excel")
async def api_upload_excel_campaign(
    file: UploadFile = File(...),
    campaign_name: str = Form(...),
    category: str = Form("General"),
    campaign_context: str = Form(""),
    flyer: Optional[UploadFile] = File(None)
):
    """
    Uploads an Excel or CSV file of leads, creates a new campaign,
    generates personalized AI messages for each lead, and persists to DB.
    """
    content = await file.read()
    raw_rows = parse_spreadsheet_bytes(content, file.filename or "leads.xlsx")
    if not raw_rows:
        raise HTTPException(status_code=400, detail="El archivo no contiene filas legibles o está vacío.")

    structured_leads = map_and_structure_leads(raw_rows, campaign_context=campaign_context)
    if not structured_leads:
        raise HTTPException(status_code=400, detail="No se pudieron extraer contactos válidos con número de teléfono.")

    # Save flyer if provided
    flyer_path = ""
    if flyer and flyer.filename:
        flyer_content = await flyer.read()
        flyer_fn = f"flyer_{int(datetime.now().timestamp())}_{flyer.filename}"
        flyer_dest = os.path.join(STATIC_DIR, flyer_fn)
        with open(flyer_dest, "wb") as f:
            f.write(flyer_content)
        flyer_path = f"/static/{flyer_fn}"

    camp_id = f"camp_{int(datetime.now().timestamp())}"
    campaign_info = create_campaign_with_leads(
        campaign_data={
            "id": camp_id,
            "name": campaign_name,
            "category": category,
            "description": campaign_context or f"Campaña importada ({len(structured_leads)} leads)",
            "attached_flyer": flyer_path,
            "ai_prompt_instructions": campaign_context
        },
        leads_data=structured_leads
    )

    return {
        "success": True,
        "campaign": campaign_info,
        "leads_count": len(structured_leads)
    }

@app.get("/api/crm/campaigns/{campaign_id}/leads")
def api_get_campaign_leads(campaign_id: str):
    """Returns all leads for a given campaign with their persistent WhatsApp status."""
    leads = get_leads_by_campaign(campaign_id)
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    gemini_ok = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    return {
        "campaign_id": campaign_id,
        "total": len(leads),
        "leads": leads,
        "groq_ai_connected": groq_ok,
        "gemini_ai_connected": gemini_ok,
        "active_ai_provider": "groq" if groq_ok else ("gemini" if gemini_ok else "local")
    }

@app.post("/api/crm/campaigns/{campaign_id}/update-ai-prompt", dependencies=[Depends(rate_limiter(max_requests=20, window_seconds=60))])
async def api_update_campaign_ai_prompt(
    campaign_id: str, 
    payload: Dict[str, Any],
    user: Optional[Dict[str, Any]] = Depends(verify_supabase_user)
):
    """
    Updates the natural-language prompt instructions for the campaign AI bot
    and regenerates personalized messages for pending leads.
    Protected with Anti-Abuse Rate Limiter & Supabase Auth context.
    """
    raw_prompt = payload.get("prompt_instructions", "").strip()
    prompt = sanitize_text(raw_prompt)
    only_pending = payload.get("regenerate_pending_only", True)
    
    result = await regenerate_campaign_lead_messages(
        campaign_id=campaign_id,
        new_prompt=prompt,
        only_pending=only_pending
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Error actualizando prompt"))

    camp = get_campaign_by_id(campaign_id)
    leads = get_leads_by_campaign(campaign_id)
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    gemini_ok = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    return {
        "success": True,
        "campaign": camp,
        "leads": leads,
        "updated_count": result.get("updated_count", 0),
        "ai_used": result.get("ai_used", False),
        "groq_ai_connected": groq_ok,
        "gemini_ai_connected": gemini_ok,
        "active_ai_provider": "groq" if groq_ok else ("gemini" if gemini_ok else "local")
    }

@app.patch("/api/crm/leads/{lead_id}/message")
def api_update_lead_message(lead_id: str, payload: Dict[str, Any]):
    """Allows manual editing of an individual lead's personalized message."""
    new_message = payload.get("message", "")
    success = update_single_lead_message(lead_id, new_message)
    return {"success": success, "lead_id": lead_id, "message": new_message}

@app.post("/api/crm/leads/{lead_id}/send-whatsapp")
async def api_send_lead_whatsapp(lead_id: str, payload: Optional[Dict[str, Any]] = None):
    """
    Sends WhatsApp message directly to a single lead with 1-click
    and registers the timestamp and status permanently in the database.
    """
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    phone = lead.get("phone", "")
    message = (payload and payload.get("message")) or lead.get("personalized_message") or ""
    image_path = (payload and payload.get("image_path")) or None

    # Only attach image if explicitly valid and > 1000 bytes
    valid_image = None
    if image_path and os.path.exists(image_path) and os.path.getsize(image_path) > 1000:
        valid_image = image_path
    elif not image_path:
        camp_id = lead.get("campaign_id", "").lower()
        if "spain" in camp_id or "madrid" in camp_id:
            madrid_flyer = "/app/whatsapp-gateway/uploads/dubai_madrid_event.jpg"
            if os.path.exists(madrid_flyer) and os.path.getsize(madrid_flyer) > 1000:
                valid_image = madrid_flyer

    gateway_payload = {
        "to": phone,
        "message": message,
        "image_path": valid_image
    }

    gateway_url = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:3001")
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            r = await client.post(f"{gateway_url}/send", json=gateway_payload)
            data = r.json()
            if data.get("success"):
                mark_lead_whatsapp_sent(lead_id, sent_type="manual")
                return {
                    "success": True,
                    "lead_id": lead_id,
                    "whatsapp_status": "sent",
                    "last_sent_type": "manual"
                }
            else:
                return {
                    "success": False,
                    "error": data.get("error", "Error de entrega en pasarela")
                }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/crm/campaigns/{campaign_id}/batch/start", dependencies=[Depends(rate_limiter(max_requests=10, window_seconds=60))])
async def api_start_campaign_batch(
    campaign_id: str, 
    payload: Optional[Dict[str, Any]] = None,
    user: Optional[Dict[str, Any]] = Depends(verify_supabase_user)
):
    """Starts the sequential batch sender for a campaign with persistence and security rate limiting."""
    delay = (payload and payload.get("delay_seconds")) or 8
    image_path = (payload and payload.get("image_path")) or None
    status = await batch_manager.start_campaign_batch(campaign_id, delay_seconds=delay, image_path=image_path)
    return {"success": True, "status": status}

@app.post("/api/crm/campaigns/{campaign_id}/batch/control")
def api_control_campaign_batch(campaign_id: str, payload: Dict[str, Any]):
    action = payload.get("action", "")
    if action == "pause":
        batch_manager.pause(campaign_id)
    elif action == "resume":
        batch_manager.resume(campaign_id)
    elif action == "stop":
        batch_manager.stop(campaign_id)
    return {"success": True, "status": batch_manager.get_status(campaign_id)}

@app.post("/api/crm/campaigns/{campaign_id}/reset-status")
def api_reset_campaign_status(campaign_id: str):
    """Resets all leads in a campaign to pending so they can be dispatched."""
    from .database.crm_db import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE leads SET whatsapp_status = 'pending', last_sent_type = NULL, last_contact_date = NULL WHERE campaign_id = ?", (campaign_id,))
    affected = cur.rowcount
    conn.commit()
    conn.close()
    return {"success": True, "reset_count": affected}

@app.get("/api/crm/campaigns/{campaign_id}/batch/status")
def api_get_campaign_batch_status(campaign_id: str):
    return batch_manager.get_status(campaign_id)

@app.get("/api/crm/all-leads")
def api_get_all_crm_leads():
    """Returns all leads for the ADHD CRM Kanban and Focus view."""
    return {"leads": get_all_crm_leads()}

@app.patch("/api/crm/leads/{lead_id}")
def api_patch_lead(lead_id: str, payload: Dict[str, Any]):
    success = update_lead_crm_fields(lead_id, payload)
    return {"success": success}

@app.post("/api/crm/leads/{lead_id}/notes")
def api_add_lead_note(lead_id: str, payload: Dict[str, Any]):
    note = add_lead_note_db(
        lead_id=lead_id,
        author=payload.get("author", "Agente"),
        content=payload.get("content", ""),
        note_type=payload.get("type", "note")
    )
    return {"success": True, "note": note}

@app.get("/api/crm/leads/{lead_id}/notes")
def api_get_lead_notes(lead_id: str):
    return {"notes": get_lead_notes_db(lead_id)}

# --- BACKWARD COMPATIBLE CAMPAIGN ROUTES (NOW POWERED BY SQLITE PERSISTENCE) ---
@app.get("/api/campaigns/spain-reactivation/leads")
def get_spain_reactivation_leads():
    leads = get_leads_by_campaign("spain_madrid_expo")
    return {
        "campaign_name": "Dubai Property Expo Madrid (112 Leads)",
        "event_dates": "9 y 10 Septiembre (10:00 AM - 8:00 PM)",
        "event_location": "Novotel Madrid Center",
        "attached_flyer": "/static/dubai_madrid_event.jpg",
        "currency": "EUR (€)",
        "surface_unit": "m²",
        "total_leads": len(leads),
        "leads": [
            {
                "index": i + 1,
                "id": l["id"],
                "name": l["name"],
                "phone": l["phone"],
                "email": l.get("email", ""),
                "objective": l.get("objective", ""),
                "timeline": l.get("timeline", ""),
                "notes": l.get("notes", ""),
                "whatsapp_status": l.get("whatsapp_status", "pending"),
                "last_contact_date": l.get("last_contact_date"),
                "last_sent_type": l.get("last_sent_type"),
                "personalized_message": l.get("personalized_message", "")
            }
            for i, l in enumerate(leads)
        ]
    }

@app.get("/api/campaigns/spain-reactivation/status")
def get_spain_campaign_status():
    return batch_manager.get_status("spain_madrid_expo")

@app.post("/api/campaigns/spain-reactivation/launch")
async def launch_spain_campaign():
    status = await batch_manager.start_campaign_batch("spain_madrid_expo", delay_seconds=8)
    return {
        "success": True,
        "message": "Campaña de invitación a Dubai Property Expo Madrid iniciada con seguimiento en tiempo real y persistencia en base de datos.",
        "status": status
    }


@app.post("/api/triage/classify", response_model=TriageResponse)
def classify_reply(request: TriageRequest):
    return triage_incoming_response(request)

# --- INBOUND WHATSAPP AI INGESTION & AUTO-TRIAGE WEBHOOK ---
from .inventory.project_parser import parse_project_from_text, is_developer_or_launch_message
from .outreach.ai_agent import classify_message_intent, generate_ai_response
from .content.social_generator import generate_daily_social_pack
from .outreach.telegram_notifier import notify_hot_prospect_reply, notify_developer_launch

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
            
            # Send instant Telegram alert to broker
            await notify_developer_launch(
                project_name=parsed_project.get("project_name") or "Nuevo Lanzamiento",
                developer=parsed_project.get("developer") or "Desarrolladora Dubai",
                price_aed=parsed_project.get("starting_price_aed"),
                payment_plan=parsed_project.get("payment_plan")
            )

            return {
                "status": "project_ingested",
                "project_name": parsed_project.get("project_name"),
                "developer": parsed_project.get("developer"),
                "starting_price_aed": parsed_project.get("starting_price_aed")
            }

    # 2. Prospect conversation triage
    intent_data = await classify_message_intent(text)
    intent = intent_data.get("intent", "info_request")
    urgency = intent_data.get("urgency", "low")

    # If lead shows high intent, objection to resolve, or ready to buy -> trigger Telegram alert!
    if intent in ["ready_to_buy", "interested", "scheduling", "objection_price", "objection_trust", "objection_spouse"] or urgency in ["high", "medium"]:
        await notify_hot_prospect_reply(
            lead_name=f"Lead (+{sender})",
            lead_phone=f"+{sender}",
            message=text,
            intent=intent,
            country="España / Internacional"
        )

    return {
        "status": "prospect_message_processed",
        "sender": sender,
        "intent": intent,
        "urgency": urgency,
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
