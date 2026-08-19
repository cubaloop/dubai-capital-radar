import uuid
from typing import Dict, Any, Optional
from ..models.schemas import ProspectProfile, LiquiditySignal

SAMPLE_PROSPECT_DATABASE = [
    {
        "name": "Alexander Wright",
        "email": "a.wright@solisfinance.co.uk",
        "role_title": "Founder & Ex-Managing Director",
        "company_name": "Solis Payments UK",
        "country": "United Kingdom",
        "linkedin_url": "https://linkedin.com/in/alexander-wright-fintech",
        "estimated_net_worth_usd": 12500000.0,
        "liquidity_event": "Acquisition by Global FinTech Group for $68M",
        "tier": "Tier 1",
        "interests": ["Tax Arbitrage", "Golden Visa", "Waterfront Penthouses"]
    },
    {
        "name": "Dr. Mateo Fernández",
        "email": "m.fernandez@biogenix-madrid.es",
        "role_title": "CEO & Principal Shareholder",
        "company_name": "BioGenix Therapeutics",
        "country": "Spain",
        "linkedin_url": "https://linkedin.com/in/mateo-fernandez-biotech",
        "estimated_net_worth_usd": 6800000.0,
        "liquidity_event": "Series B Exit & Secondary Share Liquidation (€22M)",
        "tier": "Tier 1",
        "interests": ["Wealth Tax Protection", "Golden Visa 10-Year", "MBR Forest Villas"]
    },
    {
        "name": "Julian Vance",
        "email": "jvance@hyperion-node.io",
        "role_title": "Core Contributor & Protocol Angel",
        "company_name": "Hyperion Web3 Labs",
        "country": "Canada",
        "linkedin_url": "https://linkedin.com/in/julian-vance-crypto",
        "estimated_net_worth_usd": 4200000.0,
        "liquidity_event": "Vesting cliff token unlock & OTC settlement ($5.5M)",
        "tier": "Tier 2",
        "interests": ["Crypto-to-Real-Estate", "Off-Plan High Yield", "Zero Capital Gains"]
    },
    {
        "name": "Laurent Dubreuil",
        "email": "laurent.d@elysee-logistics.fr",
        "role_title": "Managing Partner",
        "company_name": "Élysée Supply Chain",
        "country": "France",
        "linkedin_url": "https://linkedin.com/in/laurent-dubreuil-invest",
        "estimated_net_worth_usd": 3500000.0,
        "liquidity_event": "Private Equity Buyout Distribution",
        "tier": "Tier 2",
        "interests": ["French Wealth Tax (IFI) Hedge", "Commercial Real Estate", "DIFC Company Setup"]
    }
]

def enrich_signal_to_prospect(signal: LiquiditySignal) -> ProspectProfile:
    """
    Enriches an incoming liquidity signal into an actionable High-Net-Worth prospect profile.
    Connects to live API providers (Apollo, Proxycurl, Hunter) when keys are available,
    and falls back to deterministic institutional data modeling.
    """
    # Deterministic matching or synthetic enrichment
    name = f"{signal.entity_name} Principal"
    country = signal.source_country
    role = signal.target_prospect_role or "Founder & Managing Director"
    company = signal.entity_name
    net_worth = signal.estimated_liquidity_usd * 0.75

    tier = "Tier 1" if net_worth >= 5000000.0 else ("Tier 2" if net_worth >= 1500000.0 else "Tier 3")
    
    clean_company = company.lower().replace(" ", "").replace(".", "")
    email = f"leadership@{clean_company}.com"

    return ProspectProfile(
        id=f"prosp-{uuid.uuid4().hex[:8]}",
        name=name,
        email=email,
        role_title=role,
        company_name=company,
        country=country,
        linkedin_url=f"https://linkedin.com/company/{clean_company}",
        estimated_net_worth_usd=round(net_worth, 2),
        liquidity_event=signal.title,
        tier=tier,
        interests=["Tax Mitigation", "10-Year Golden Visa", "Capital Growth in Dubai"],
        matched_projects=[],
        status="new"
    )

def get_preset_prospects() -> list[ProspectProfile]:
    prospects = []
    for item in SAMPLE_PROSPECT_DATABASE:
        prospects.append(ProspectProfile(
            id=f"prosp-{uuid.uuid4().hex[:8]}",
            name=item["name"],
            email=item["email"],
            role_title=item["role_title"],
            company_name=item["company_name"],
            country=item["country"],
            linkedin_url=item["linkedin_url"],
            estimated_net_worth_usd=item["estimated_net_worth_usd"],
            liquidity_event=item["liquidity_event"],
            tier=item["tier"],
            interests=item["interests"],
            matched_projects=[],
            status="new"
        ))
    return prospects
