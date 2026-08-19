from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uvicorn
import os

from .models.schemas import (
    LiquiditySignal,
    ProspectProfile,
    DossierResponse,
    OutreachCampaign,
    RealEstateProject,
    TriageRequest,
    TriageResponse,
    TaxComparison
)
from .collectors.radar_worker import radar_engine
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

# In-Memory State for fast prototyping and live demo
PROSPECTS_STORE: Dict[str, ProspectProfile] = {}
DOSSIERS_STORE: Dict[str, DossierResponse] = {}
AUTOPILOT_ENABLED: bool = False

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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Dubai Capital Radar Core API",
        "gemini_ai_connected": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "cached_signals": len(radar_engine.get_latest_signals()),
        "active_prospects": len(PROSPECTS_STORE),
        "dossiers_generated": len(DOSSIERS_STORE) // 2,
        "autopilot_enabled": AUTOPILOT_ENABLED
    }

# --- AUTOPILOT ENDPOINTS ---

@app.get("/api/autopilot/status")
def get_autopilot_status():
    global AUTOPILOT_ENABLED
    return {"autopilot_enabled": AUTOPILOT_ENABLED}

@app.post("/api/autopilot/toggle")
def toggle_autopilot():
    global AUTOPILOT_ENABLED
    AUTOPILOT_ENABLED = not AUTOPILOT_ENABLED
    return {
        "autopilot_enabled": AUTOPILOT_ENABLED,
        "message": f"Autopilot is now {'ENABLED (Auto-Detect, Auto-Dossier & Auto-Dispatch)' if AUTOPILOT_ENABLED else 'DISABLED (Supervised Mode)'}"
    }

# --- RADAR & SIGNALS ENDPOINTS ---

@app.get("/api/radar/signals", response_model=List[LiquiditySignal])
def get_signals():
    return radar_engine.get_latest_signals()

@app.post("/api/radar/scan", response_model=LiquiditySignal)
def trigger_radar_scan():
    global AUTOPILOT_ENABLED
    new_sig = radar_engine.trigger_live_scan()
    # Auto enrich into a prospect
    prospect = enrich_signal_to_prospect(new_sig)
    PROSPECTS_STORE[prospect.id] = prospect

    # If Autopilot is enabled: automatically generate dossier and dispatch multi-channel outreach!
    if AUTOPILOT_ENABLED:
        dossier = build_dossier(prospect)
        DOSSIERS_STORE[dossier.slug] = dossier
        DOSSIERS_STORE[dossier.dossier_id] = dossier
        create_outreach_campaign(prospect, dossier)
        prospect.status = "contacted"

    return new_sig

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
        raise HTTPException(status_code=404, detail="Dossier not found")
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

# --- OUTREACH & CAMPAIGNS ---

@app.get("/api/campaigns", response_model=List[OutreachCampaign])
def list_campaigns():
    return get_all_campaigns()

@app.post("/api/campaigns/launch/{prospect_id}", response_model=OutreachCampaign)
def launch_campaign_for_prospect(prospect_id: str):
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
    return campaign

@app.post("/api/triage/classify", response_model=TriageResponse)
def classify_reply(request: TriageRequest):
    return triage_incoming_response(request)

# --- STATIC FILES & SINGLE PAGE APP (SPA) ROUTING ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
