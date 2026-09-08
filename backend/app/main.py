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

WHATSAPP_GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:3001")

async def dispatch_whatsapp_direct(to_phone: str, message: str, bypass_shield: bool = False, target_jid: Optional[str] = None):
    """
    Delivers message via WhatsApp Web Gateway while respecting the Anti-Ban Safety Protocol.
    """
    if not bypass_shield:
        can_send, reason = anti_ban_guard.can_send()
        if not can_send:
            print(f"[ANTI-BAN SHIELD] Outbound paused: {reason}")
            return {"success": False, "throttled": True, "reason": reason}

    try:
        payload = {"to": to_phone, "message": message}
        if target_jid:
            payload["jid"] = target_jid

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(f"{WHATSAPP_GATEWAY_URL}/send", json=payload)
            data = res.json()
            if data.get("success"):
                anti_ban_guard.record_send()
                print(f"[ANTI-BAN SHIELD] Message safely delivered to {to_phone} ({anti_ban_guard.daily_sent_count}/{anti_ban_guard.max_daily_limit} today)")
            else:
                print(f"[dispatch_whatsapp_direct] Gateway returned error: {data.get('error')}")
            return data
    except Exception as e:
        print(f"[dispatch_whatsapp_direct] HTTP Exception to {to_phone}: {e}")
        return {"success": False, "error": str(e), "simulated": True}

@app.post("/api/whatsapp/send-message")
async def send_whatsapp_endpoint(payload: Dict[str, Any]):
    """Direct dispatch endpoint to verify WhatsApp gateway outbound messaging."""
    to_phone = payload.get("to") or ADMIN_PHONE_DIGITS
    message = payload.get("message") or "Test from Dubai Capital Radar"
    target_jid = payload.get("jid")
    return await dispatch_whatsapp_direct(to_phone=to_phone, message=message, bypass_shield=True, target_jid=target_jid)

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

PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://dubai-miami-radar.onrender.com")

async def keep_alive_pulse_daemon():
    """
    Continuous keep-alive pinger running every 3 minutes (180s) 
    to guarantee Render containers never enter sleep/spin-down mode.
    """
    await asyncio.sleep(30)  # Initial wait after cold start
    while True:
        try:
            target_url = f"{PUBLIC_APP_URL}/api/health"
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(target_url, headers={"User-Agent": "Dubai-Miami-Radar-Pulse/1.0 (Keep-Alive)"})
                print(f"[KEEP-ALIVE PULSE] Heartbeat delivered to {target_url} -> Status: {res.status_code} (100% Uptime Active)")
        except Exception as err:
            print(f"[KEEP-ALIVE PULSE WARNING]: {err}")
        
        # Ping every 3 minutes (Render sleeps after 15 minutes of inactivity)
        await asyncio.sleep(180)

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
    regenerate_campaign_lead_messages,
    update_campaign_meta,
    delete_campaign_db,
    delete_lead_db,
    create_or_upsert_lead_db
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

@app.patch("/api/crm/campaigns/{campaign_id}")
def api_update_campaign(campaign_id: str, payload: Dict[str, Any]):
    """Update campaign metadata (name, category/tag, description)."""
    name = payload.get("name")
    category = payload.get("category")
    description = payload.get("description")
    success = update_campaign_meta(campaign_id, name=name, category=category, description=description)
    if not success:
        raise HTTPException(status_code=400, detail="No se pudo actualizar la campaña")
    return {"success": True, "campaign": get_campaign_by_id(campaign_id)}

@app.delete("/api/crm/campaigns/{campaign_id}")
def api_delete_campaign(campaign_id: str):
    """Deletes a campaign and all associated leads permanently."""
    success = delete_campaign_db(campaign_id)
    return {"success": success, "deleted_campaign_id": campaign_id}

@app.delete("/api/crm/leads/{lead_id}")
def api_delete_lead(lead_id: str):
    """Deletes an individual lead permanently."""
    success = delete_lead_db(lead_id)
    return {"success": success, "deleted_lead_id": lead_id}

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

@app.post("/api/crm/leads")
def api_create_or_upsert_lead(payload: Dict[str, Any]):
    """Creates or updates a lead, logging notes and syncing to Supabase."""
    lead = create_or_upsert_lead_db(payload)
    return {"success": True, "lead": lead}

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
from .database.crm_db import (
    get_db_connection, 
    add_lead_note_db, 
    save_copilot_message_db, 
    get_recent_copilot_history_db
)
from .database.supabase_sync import sync_lead_background
from datetime import datetime

INGESTED_PROJECTS_FEED: List[Dict[str, Any]] = []
ADMIN_PHONE_DIGITS = "971508379080"

def get_jota_system_prompt() -> str:
    """Generates dynamic, rich system prompt with real-time business and database state."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Campaigns overview
        cursor.execute("""
        SELECT c.name, COUNT(l.id) as total,
               SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent,
               SUM(CASE WHEN l.crm_status IN ('APPOINTMENT', 'INTERESTED', 'HOT', 'REPLIED') THEN 1 ELSE 0 END) as active
        FROM campaigns c
        LEFT JOIN leads l ON c.id = l.campaign_id
        GROUP BY c.id
        """)
        camps = cursor.fetchall()
        camp_lines = []
        for c in camps:
            camp_lines.append(f"• {c['name']}: {c['total']} leads ({c['sent']} contactados, {c['active']} activos/citas)")

        # 2. Confirmed & scheduled Novotel Madrid Expo attendees
        cursor.execute("""
        SELECT name, phone, timeline, notes, crm_status
        FROM leads
        WHERE campaign_id = 'spain_madrid_expo' AND crm_status IN ('APPOINTMENT', 'FOLLOW_UP')
        ORDER BY crm_status ASC, id ASC
        """)
        expo_leads = cursor.fetchall()
        expo_lines = []
        for el in expo_leads:
            expo_lines.append(f"• {el['name']} ({el['phone']}) -> {el['crm_status']} | Horario: {el['timeline'] or 'Por definir'} | Detalle: {el['notes']}")

        conn.close()
    except Exception as e:
        camp_lines = [f"• Error cargando campañas: {e}"]
        expo_lines = []

    prompt = f"""Eres JOTA, el Asistente Inteligente de IA de David (Super-Admin y Broker Senior de H.O.M.E Properties en Dubai y Dubai Capital Radar).
Eres su copiloto de máxima confianza: resolutivo, altamente inteligente, ejecutivo, proactivo, analítico y cercano. No eres un bot rígido ni tienes restricciones preprogramadas de palabras clave o formato. Comprendes perfectamente el contexto, la intención y el fondo de cada mensaje.

CONOCIMIENTO OPERATIVO Y BASE DE DATOS EN TIEMPO REAL:
1. EVENTO INMEDIATO: Dubai Property Expo en Hotel Novotel Madrid Center (9 y 10 de Septiembre 2026).
   - Horario: 10:00 AM a 8:00 PM.
   - Beneficios exclusivos: 15-20% descuento exclusivo, Property Management 100% gratis, Golden Visa de 10 años gratis, planes de pago directos desde 1% mensual sin hipoteca.
   - Asistentes Confirmados y en Seguimiento registrados en tu CRM:
{chr(10).join(expo_lines) if expo_lines else "• Sincronizando datos de asistentes..."}

2. CAMPAÑAS Y MÉTRICAS ACTUALES:
{chr(10).join(camp_lines) if camp_lines else "• Campaña Novotel Madrid Expo activa."}

3. ACCESOS Y CREDENCIALES OFICIALES:
   - Portal Web CRM: https://dubai-miami-radar.onrender.com
   - Empresa: H.O.M.E Properties | Email: home@homeproperties.ae | Pass: Dubai2026!
   - Super-Admin: admin@dubaicapitalradar.com | Pass: Dubai2026!
   - Bot WhatsApp: +971 50 137 8020

4. INVERSIONES INMOBILIARIAS DUBAI:
   - Zonas top: Downtown Dubai, Palm Jumeirah, Dubai Hills Estate, Business Bay, Dubai Marina, Creek Harbour.
   - Desarrolladoras líderes: Emaar, Sobha, Damac, Nakheel, Binghatti, Ellington, Meraas.
   - Atractivo clave: 0% impuestos personales y de ganancias de capital, rentabilidades netas del 8-10%, Golden Visa con inversión desde 2,000,000 AED (~$545,000 USD / ~€500,000 EUR).

5. TU COMPORTAMIENTO Y FORMA DE TRABAJAR:
   - Responde siempre en español, de forma ejecutiva, natural, profesional y directa.
   - Si David te envía datos, listas, tablas o CSVs, léelos y analízalos con detenimiento, extrae conclusiones, confirma lo registrado y recomiéndale los siguientes pasos comerciales.
   - Si David te pide resúmenes, estados o cifras, dale un informe ejecutivo claro con los datos reales de arriba.
   - Si David te pide credenciales, dale sus accesos de H.O.M.E Properties y Super-Admin de forma limpia.
   - Si David te pide redacción, tácticas de cierre, objeciones o asesoría, dale respuestas de alto nivel comercial.
   - Mantén el hilo de la conversación recordando los mensajes anteriores que han intercambiado.
   - Usa formato WhatsApp limpio (negritas y viñetas) para que se lea perfectamente en el móvil.
"""
    return prompt

async def handle_admin_copilot(command_text: str, sender_jid: str = "", sender_phone: str = ""):
    """
    Handles inquiries from Super-Admin / Broker with full intelligence,
    dynamic real-time CRM context, and conversation memory. Zero restrictions.
    """
    text = command_text.strip()
    if not text:
        return {"status": "ignored", "reason": "empty"}

    # Save incoming user message to persistent conversation history
    save_copilot_message_db(role="user", content=text)

    # Fetch recent conversation history (last 10 messages)
    history = get_recent_copilot_history_db(limit=10)
    past_history = history[:-1] if history else []

    system_prompt = get_jota_system_prompt()

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()

    reply_msg = ""

    # Build messages array for LLM
    messages = [{"role": "system", "content": system_prompt}]
    for turn in past_history:
        role = "assistant" if turn["role"] in ["assistant", "model", "jota"] else "user"
        messages.append({"role": role, "content": turn["content"]})
    messages.append({"role": "user", "content": text})

    # 1. Try Groq (Llama 3.3 70B Versatile / Llama 3.1 8B Instant)
    if groq_key:
        for model_name in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            try:
                async with httpx.AsyncClient(timeout=18.0) as client:
                    payload = {
                        "model": model_name,
                        "messages": messages,
                        "temperature": 0.4,
                        "max_tokens": 1000
                    }
                    r = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json=payload,
                        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                    )
                    if r.status_code == 200:
                        ans = r.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        if ans:
                            reply_msg = ans
                            break
            except Exception as e:
                print(f"⚠️ [Groq Copilot Warning - {model_name}]: {e}")

    # 2. Try Gemini 1.5 Flash fallback if Groq failed or not set
    if not reply_msg and gemini_key:
        try:
            gem_contents = []
            for turn in past_history:
                r_gem = "model" if turn["role"] in ["assistant", "model", "jota"] else "user"
                gem_contents.append({"role": r_gem, "parts": [{"text": turn["content"]}]})
            gem_contents.append({"role": "user", "parts": [{"text": f"[ROL Y CONTEXTO DEL SISTEMA:\n{system_prompt}]\n\nMensaje de David: {text}"}]})

            async with httpx.AsyncClient(timeout=18.0) as client:
                gem_payload = {"contents": gem_contents}
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json=gem_payload
                )
                if r.status_code == 200:
                    cand = r.json().get("candidates", [])
                    if cand:
                        reply_msg = cand[0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print(f"⚠️ [Gemini Copilot Warning]: {e}")

    # 3. Intelligent local fallback if both cloud providers fail
    if not reply_msg:
        reply_msg = (
            f"👋 *Hola David, recibí tu mensaje.*\n\n"
            f"He tomado nota de tu consulta. Los datos del evento de Madrid (Novotel) y las campañas están sincronizados en tiempo real en tu CRM.\n"
            f"Dime en qué detalle específico de la operativa o los clientes deseas que nos enfoquemos ahora."
        )

    # Save assistant reply to persistent conversation history
    save_copilot_message_db(role="assistant", content=reply_msg)

    # Send response back to admin via WhatsApp
    try:
        print(f"[ADMIN COPILOT] Dispatching reply to Super-Admin ({ADMIN_PHONE_DIGITS}):\n{reply_msg[:120]}...")
    except UnicodeEncodeError:
        print(f"[ADMIN COPILOT] Dispatching reply to Super-Admin ({ADMIN_PHONE_DIGITS})")

    target_jid = sender_jid if sender_jid else f"{ADMIN_PHONE_DIGITS}@s.whatsapp.net"
    target_phone = sender_phone if (sender_phone and len(sender_phone) >= 8 and not sender_jid.endswith('@lid')) else ADMIN_PHONE_DIGITS

    dispatch_res = await dispatch_whatsapp_direct(to_phone=target_phone, message=reply_msg, bypass_shield=True, target_jid=target_jid)
    return {"status": "admin_copilot_replied", "message": reply_msg, "target_jid": target_jid, "dispatch_res": dispatch_res}

@app.post("/api/whatsapp/inbound-webhook")
async def handle_whatsapp_inbound(payload: Dict[str, Any]):
    """
    Receives incoming WhatsApp messages in real-time.
    0. If from Super-Admin (+971508379080) or mentions "Jota" -> Copilot Mode.
    1. If from developer/launch group -> Groq/Gemini parses project facts and adds to inventory knowledge.
    2. If from prospect -> Groq/Gemini classifies intent, auto-updates CRM notes & triggers hot lead alerts.
    """
    text = (payload.get("text") or "").strip()
    sender = (payload.get("sender") or "").replace("+", "").replace(" ", "").strip()
    is_group = payload.get("is_group", False)
    jid = payload.get("jid", "")

    # Extract text from base64 PDF if document is attached
    if payload.get("has_document") and payload.get("document_base64"):
        try:
            import base64
            import io
            from pypdf import PdfReader
            pdf_bytes = base64.b64decode(payload["document_base64"])
            reader = PdfReader(io.BytesIO(pdf_bytes))
            extracted_pages = []
            for page in reader.pages[:6]:
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text)
            if extracted_pages:
                pdf_text = "\n".join(extracted_pages)
                text = f"{text}\n{pdf_text}".strip() if text else pdf_text
                print(f"📄 [PDF Extracted] Successfully extracted {len(pdf_text)} characters from {payload.get('document_file_name')}")
        except Exception as pdf_err:
            print(f"⚠️ [PDF Extraction Error]: {pdf_err}")

    if not text:
        return {"status": "ignored", "reason": "empty_content"}

    # STRICT FILTER 1: Completely ignore all WhatsApp group messages
    if is_group or "@g.us" in jid:
        return {"status": "ignored", "reason": "group_message_ignored"}

    # 0. SUPER-ADMIN COPILOT MODE (+971508379080 or "Jota" wake word)
    is_admin = (
        sender == ADMIN_PHONE_DIGITS or 
        "508379080" in sender or 
        sender.endswith("508379080") or 
        "508379080" in jid or
        "jota" in text.lower()
    )

    if is_admin:
        print(f"[ADMIN COPILOT] Message from Super-Admin ({sender} | JID: {jid}): '{text}'")
        # Check if sending a developer launch brochure or asking a system question
        if not is_developer_or_launch_message(text, is_group=False):
            return await handle_admin_copilot(text, sender_jid=jid, sender_phone=sender)

        # If Super-Admin sends a new developer launch brochure
        parsed_project = await parse_project_from_text(text)
        if parsed_project:
            parsed_project["sender"] = sender
            parsed_project["is_group"] = False
            parsed_project["detected_at"] = payload.get("timestamp")
            INGESTED_PROJECTS_FEED.insert(0, parsed_project)
            print(f"[Auto-Ingestion] New project parsed from Super-Admin: {parsed_project.get('project_name')} by {parsed_project.get('developer')}")

            admin_notice = (
                f"🏗️ *Nuevo Proyecto Ingestado Automáticamente*\n\n"
                f"• *Proyecto:* {parsed_project.get('project_name')}\n"
                f"• *Desarrolladora:* {parsed_project.get('developer')}\n"
                f"• *Precio desde:* {parsed_project.get('starting_price_aed'):,} AED\n"
                f"• *Plan de Pago:* {parsed_project.get('payment_plan')}\n"
                f"• *Resumen:* {parsed_project.get('short_summary')}\n\n"
                f"✅ _Indexado en el inventario para tus agentes de IA._"
            )
            await dispatch_whatsapp_direct(to_phone=ADMIN_PHONE_DIGITS, message=admin_notice, bypass_shield=True)

            return {
                "status": "project_ingested",
                "project_name": parsed_project.get("project_name"),
                "developer": parsed_project.get("developer"),
                "starting_price_aed": parsed_project.get("starting_price_aed")
            }

    # STRICT FILTER 2: For any other sender, verify they exist in CRM leads
    sender_digits = "".join([c for c in sender if c.isdigit()])
    if len(sender_digits) < 7:
        return {"status": "ignored", "reason": "invalid_phone_number", "sender": sender}

    conn = get_db_connection()
    cursor = conn.cursor()
    suffix = sender_digits[-8:] if len(sender_digits) >= 8 else sender_digits
    cursor.execute(
        "SELECT * FROM leads WHERE clean_phone = ? OR clean_phone LIKE ? OR phone LIKE ?", 
        (sender_digits, f"%{suffix}", f"%{suffix}%")
    )
    matched_lead = cursor.fetchone()

    # Unlisted number: auto-register in CRM as Inbound Lead so no prospect or inquiry is ever lost
    if not matched_lead:
        new_lid = f"inbound_{int(datetime.now().timestamp())}"
        contact_name = payload.get("push_name") or f"Inversor +{sender_digits}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        INSERT INTO leads (
            id, campaign_id, name, phone, clean_phone, email,
            objective, timeline, notes, crm_status, whatsapp_status,
            last_contact_date, last_sent_type, personalized_message,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_lid,
            "spain_madrid_expo",
            contact_name,
            f"+{sender_digits}",
            sender_digits,
            "",
            "Consulta Entrante WhatsApp",
            "",
            f"💬 Primer contacto recibido vía WhatsApp: \"{text[:120]}\"",
            "CONTACTED",
            "replied",
            now_str,
            "inbound",
            "",
            now_str
        ))
        conn.commit()
        cursor.execute("SELECT * FROM leads WHERE id = ?", (new_lid,))
        matched_lead = cursor.fetchone()
        if matched_lead:
            sync_lead_background(dict(matched_lead))
        print(f"[Inbound Auto-Register] Registered new lead in CRM for +{sender}: '{contact_name}'")

    # SENDER IS A REGISTERED LEAD: Process intent & update CRM records
    lid = matched_lead["id"]
    lead_name = matched_lead["name"]

    intent_data = await classify_message_intent(text)
    intent = intent_data.get("intent", "info_request")
    urgency = intent_data.get("urgency", "low")
    summary = intent_data.get("summary") or text[:70]

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_crm_status = "INTERESTED" if intent in ["ready_to_buy", "interested", "scheduling"] else "CONTACTED"
    note_content = f"💬 [Respuesta WhatsApp]: {text}\n🤖 [IA Triage]: {intent.upper()} - {summary}"
    
    # Add note to lead_notes table
    add_lead_note_db(lid, author="WhatsApp IA Inbound", content=note_content, note_type="reply")
    
    # Append to lead notes column and update status
    existing_notes = (matched_lead["notes"] or "").strip()
    combined_notes = f"{existing_notes}\n[{now_str[:10]}]: {summary}" if existing_notes else f"[{now_str[:10]}]: {summary}"
    
    cursor.execute("""
    UPDATE leads 
    SET crm_status = ?,
        whatsapp_status = 'replied',
        last_contact_date = ?,
        notes = ?
    WHERE id = ?
    """, (new_crm_status, now_str, combined_notes, lid))
    conn.commit()
    
    # Sync updated lead to Supabase PostgreSQL
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lid,))
    fresh_lead = cursor.fetchone()
    if fresh_lead:
        sync_lead_background(dict(fresh_lead))
    conn.close()

    print(f"[CRM Auto-Update] Lead '{lead_name}' (+{sender}) updated: status={new_crm_status}, note='{summary}'")

    # If lead shows high intent, objection to resolve, or ready to buy -> trigger Telegram & WhatsApp alerts to broker!
    is_hot = intent in ["ready_to_buy", "interested", "scheduling", "objection_price", "objection_trust", "objection_spouse"] or urgency in ["high", "medium"]
    
    if is_hot:
        # 1. Telegram Alert
        await notify_hot_prospect_reply(
            lead_name=lead_name,
            lead_phone=f"+{sender}",
            message=text,
            intent=intent,
            country="España / Internacional"
        )
        
        # 2. WhatsApp Alert directly to Super-Admin (+971508379080)
        hot_alert = (
            f"🔥 *LEAD CALIENTE DETECTADO EN WHATSAPP*\n\n"
            f"👤 *Cliente:* {lead_name}\n"
            f"📱 *Teléfono:* +{sender}\n"
            f"🎯 *Intención:* {intent.upper()}\n"
            f"💬 *Mensaje:* \"{text}\"\n\n"
            f"📌 *CRM:* ✅ Nota y estado actualizados automáticamente\n"
            f"👉 Abre la app o WhatsApp para responderle de inmediato."
        )
        await dispatch_whatsapp_direct(to_phone=ADMIN_PHONE_DIGITS, message=hot_alert, bypass_shield=True)

    return {
        "status": "prospect_message_processed",
        "sender": sender,
        "lead_name": lead_name,
        "crm_updated": True,
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
