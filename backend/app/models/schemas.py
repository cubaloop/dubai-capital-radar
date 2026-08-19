from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SignalType(str):
    CRYPTO_WHALE = "crypto_whale"
    TECH_EXIT = "tech_exit"
    TAX_REFORM = "tax_reform"
    VENTURE_FUNDING = "venture_funding"
    HNWI_RELOCATION = "hnwi_relocation"

class LiquiditySignal(BaseModel):
    id: str
    signal_type: str
    title: str
    entity_name: str
    source_country: str
    estimated_liquidity_usd: float
    confidence_score: float
    description: str
    detected_at: datetime = Field(default_factory=datetime.now)
    tags: List[str] = []
    source_url: Optional[str] = None
    target_prospect_role: Optional[str] = None

class ProspectProfile(BaseModel):
    id: str
    name: str
    email: str
    role_title: str
    company_name: str
    country: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    estimated_net_worth_usd: float
    liquidity_event: str
    tier: str  # Tier 1 (Ultra High > $5M), Tier 2 (High > $1.5M), Tier 3 (> $500k)
    interests: List[str] = []
    matched_projects: List[str] = []
    status: str = "new"  # new, dossier_generated, contacted, replied, booked

class TaxComparison(BaseModel):
    home_country: str
    annual_income_usd: float
    capital_gains_usd: float
    home_tax_liability_usd: float
    dubai_tax_liability_usd: float
    annual_tax_savings_usd: float
    five_year_savings_usd: float
    effective_home_tax_rate: float
    dubai_effective_tax_rate: float
    golden_visa_eligible: bool
    recommended_investment_aed: float
    recommended_investment_usd: float

class RealEstateProject(BaseModel):
    id: str
    name: str
    developer: str
    location: str
    starting_price_aed: float
    starting_price_usd: float
    completion_date: str
    project_type: str  # Penthouse, Luxury Villa, Waterfront Apartment, Branded Residence
    projected_net_yield: float  # e.g., 8.5%
    five_year_capital_gain: float  # e.g., 35%
    payment_plan: str  # e.g., "70/30 on Handover"
    dld_escrow_number: str
    golden_visa_eligible: bool
    crypto_accepted: bool = False
    supported_cryptos: List[str] = []
    images: List[str] = []
    key_features: List[str] = []
    description: str

class DossierResponse(BaseModel):
    dossier_id: str
    slug: str
    prospect: ProspectProfile
    tax_analysis: TaxComparison
    recommended_projects: List[RealEstateProject]
    investment_thesis_narrative: str
    golden_visa_roadmap: List[Dict[str, str]]
    recommended_asset_allocation: Dict[str, float]
    calendly_link: str
    whatsapp_direct_link: str
    created_at: datetime = Field(default_factory=datetime.now)

class OutreachCampaign(BaseModel):
    id: str
    name: str
    prospect_id: str
    prospect_name: str
    prospect_email: str
    channel: str  # email, linkedin, whatsapp, multi-channel
    subject_line: str
    body_content: str
    linkedin_message: Optional[str] = None
    whatsapp_message: Optional[str] = None
    status: str  # draft, sent, opened, clicked, replied
    dossier_slug: str
    sent_at: Optional[datetime] = None
    last_response: Optional[str] = None
    ai_sentiment: Optional[str] = None

class TriageRequest(BaseModel):
    prospect_id: str
    message: str
    sender_name: str

class TriageResponse(BaseModel):
    sentiment: str  # positive, objection, interested_in_residency, price_concern, negative
    suggested_reply: str
    action_required: str  # schedule_call, send_escrow_proof, clarify_taxes
    priority_level: str  # URGENT, HIGH, MEDIUM, LOW
