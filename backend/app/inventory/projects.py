from typing import List, Optional
from ..models.schemas import RealEstateProject

CURATED_PROJECTS: List[RealEstateProject] = [
    RealEstateProject(
        id="proj-palm-crown",
        name="The Palm Crown Residences",
        developer="Nakheel Luxury",
        location="Palm Jumeirah, Crescent West",
        starting_price_aed=12500000.0,
        starting_price_usd=3403675.0,
        completion_date="Q4 2027",
        project_type="Ultra-Luxury Waterfront Penthouse",
        projected_net_yield=7.8,
        five_year_capital_gain=42.0,
        payment_plan="60% During Construction / 40% on Handover",
        dld_escrow_number="DLD-ESC-2024-8891",
        golden_visa_eligible=True,
        images=[
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Private Beachfront Access & Marina Berth",
            "Full Dubai Marina Skyline & Burj Al Arab Panoramic Views",
            "Zero Personal & Capital Gains Tax Structuring",
            "Qualifies for 10-Year Renewable Golden Visa"
        ],
        description="Exclusive collection of beachfront sky-mansions with private infinity pools and dedicated concierge for global family offices."
    ),
    RealEstateProject(
        id="proj-creek-horizon",
        name="Creek Horizon Tower II",
        developer="Emaar Properties",
        location="Dubai Creek Harbour",
        starting_price_aed=2850000.0,
        starting_price_usd=776038.0,
        completion_date="Q2 2026",
        project_type="Waterfront Luxury 2BR & 3BR",
        projected_net_yield=8.9,
        five_year_capital_gain=38.5,
        payment_plan="70/30 (30% Post-Handover over 24 Months)",
        dld_escrow_number="DLD-ESC-2023-4102",
        golden_visa_eligible=True,
        images=[
            "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Direct View to Dubai Creek Tower & Wildlife Sanctuary",
            "High Rental Demand from Tech & Financial Executives",
            "100% Escrow Protected by Dubai Land Department",
            "Eligible for Instant Golden Visa Fast-Track"
        ],
        description="Prime investment asset in Dubai's newest financial waterfront, designed for maximum net rental yield and steady capital appreciation."
    ),
    RealEstateProject(
        id="proj-sobha-hartland-estates",
        name="Hartland II Forest Villas",
        developer="Sobha Realty",
        location="Mohammed Bin Rashid City (MBR City)",
        starting_price_aed=8200000.0,
        starting_price_usd=2232811.0,
        completion_date="Q1 2027",
        project_type="Private Forest Villa Estate",
        projected_net_yield=7.2,
        five_year_capital_gain=45.0,
        payment_plan="50% Construction / 50% on Handover",
        dld_escrow_number="DLD-ESC-2024-1928",
        golden_visa_eligible=True,
        images=[
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Private Crystal Lagoon & Lush Green Parks",
            "10 Minutes from Downtown Dubai & DIFC",
            "Exceptional German Craftsmanship & Premium Marble Finishes",
            "Multi-Generation Family Golden Visa Allocation"
        ],
        description="Secluded sanctuary in the heart of the city featuring custom private gardens, smart home automation and world-class international schools within the community."
    ),
    RealEstateProject(
        id="proj-omniyat-marina-vela",
        name="The Vela Dorchester Collection",
        developer="Omniyat Group",
        location="Business Bay / Marasi Marina",
        starting_price_aed=18900000.0,
        starting_price_usd=5146358.0,
        completion_date="Q3 2027",
        project_type="Branded Dorchester Residence",
        projected_net_yield=8.1,
        five_year_capital_gain=50.0,
        payment_plan="60/40 Milestone Linked",
        dld_escrow_number="DLD-ESC-2024-7703",
        golden_visa_eligible=True,
        images=[
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Managed by Dorchester Collection 5-Star Hospitality",
            "Private Elevator to Every Residence & L-Shaped Corner Terraces",
            "Private Yacht Slip Available at Marasi Bay Marina",
            "Bespoke Wealth Structuring & Trustee Advisory Included"
        ],
        description="The ultimate trophy asset for ultra-high-net-worth investors seeking architectural prestige, unmatched privacy and premier capital preservation in Dubai."
    )
]

def get_all_projects() -> List[RealEstateProject]:
    return CURATED_PROJECTS

def match_projects_for_budget(budget_usd: float) -> List[RealEstateProject]:
    budget_aed = budget_usd * 3.6725
    # If budget is high (> $3M), prioritize ultra-luxury trophy assets
    if budget_usd >= 3000000.0:
        return [p for p in CURATED_PROJECTS if p.starting_price_usd >= 2000000.0]
    # Otherwise return best yield and Golden Visa qualifying assets
    return [p for p in CURATED_PROJECTS if p.starting_price_aed >= 2000000.0]
