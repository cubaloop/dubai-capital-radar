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
        "dossiers_generated": len(DOSSIERS_STORE) // 2
    }

# --- RADAR & SIGNALS ENDPOINTS ---

@app.get("/api/radar/signals", response_model=List[LiquiditySignal])
def get_signals():
    return radar_engine.get_latest_signals()

@app.post("/api/radar/scan", response_model=LiquiditySignal)
def trigger_radar_scan():
    new_sig = radar_engine.trigger_live_scan()
    # Auto enrich into a prospect
    prospect = enrich_signal_to_prospect(new_sig)
    PROSPECTS_STORE[prospect.id] = prospect
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
