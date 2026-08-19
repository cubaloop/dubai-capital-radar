from typing import List, Optional
from ..models.schemas import RealEstateProject

CURATED_PROJECTS: List[RealEstateProject] = [
    RealEstateProject(
        id="proj-damac-chelsea-maritime",
        name="Chelsea Residences by DAMAC",
        developer="DAMAC Properties",
        location="Dubai Maritime City",
        starting_price_aed=2100000.0,
        starting_price_usd=571817.0,
        completion_date="Q4 2027",
        project_type="Luxury Waterfront Branded Residence",
        projected_net_yield=8.8,
        five_year_capital_gain=44.5,
        payment_plan="70/30 (20% Downpayment / 50% During Construction / 30% on Handover)",
        dld_escrow_number="DLD-ESC-2024-5519",
        golden_visa_eligible=True,
        crypto_accepted=True,
        supported_cryptos=["USDT", "BTC", "ETH"],
        images=[
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Direct Arabian Gulf & Port Rashid Superyacht Marina Views",
            "100% Direct Crypto-to-Escrow Settlements (USDT / BTC / ETH)",
            "Qualifies for Instant 10-Year Renewable UAE Golden Visa (+2M AED)",
            "VARA & Dubai Land Department Regulated Escrow Account"
        ],
        description="DAMAC's signature coastal development in Dubai Maritime City. Full VARA-compliant cryptocurrency payment rails allowing seamless off-ramp directly into DLD escrow."
    ),
    RealEstateProject(
        id="proj-binghatti-bugatti-residences",
        name="Bugatti Residences by Binghatti",
        developer="Binghatti Developers",
        location="Business Bay / Downtown Canal",
        starting_price_aed=19500000.0,
        starting_price_usd=5309734.0,
        completion_date="Q4 2026",
        project_type="Ultra-Luxury Automotive Branded Sky Mansion",
        projected_net_yield=8.2,
        five_year_capital_gain=52.0,
        payment_plan="70/30 Linked Construction Plan",
        dld_escrow_number="DLD-ESC-2023-9021",
        golden_visa_eligible=True,
        crypto_accepted=True,
        supported_cryptos=["USDT", "BTC", "ETH", "SOL"],
        images=[
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Private Car Elevator to High-Floor Sky Mansions",
            "Riviera-Inspired Private Beach in Business Bay",
            "Pioneer Developer with Official Crypto Payment Integration",
            "Golden Visa & Private Family Office Structuring Included"
        ],
        description="The world's first Bugatti branded residence. Designed specifically for crypto founders and global tech leaders desiring iconic engineering, private automotive elevators, and friction-free digital currency settlement."
    ),
    RealEstateProject(
        id="proj-sobha-seahaven-harbour",
        name="Sobha Seahaven Sky Edition",
        developer="Sobha Realty",
        location="Dubai Harbour Waterfront",
        starting_price_aed=3800000.0,
        starting_price_usd=1034717.0,
        completion_date="Q4 2026",
        project_type="Luxury Waterfront Sky Suites",
        projected_net_yield=8.5,
        five_year_capital_gain=41.0,
        payment_plan="60/40 (40% on Handover)",
        dld_escrow_number="DLD-ESC-2023-6612",
        golden_visa_eligible=True,
        crypto_accepted=True,
        supported_cryptos=["USDT", "BTC"],
        images=[
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Unobstructed Views of Palm Jumeirah and Ain Dubai",
            "Regulated Multi-Currency & Crypto Escrow Desk",
            "Superyacht Marina Berths at Your Doorstep",
            "Instant 10-Year UAE Golden Visa Allocation"
        ],
        description="Sobha's flagship maritime tower in Dubai Harbour. Exceptional craftsmanship and streamlined institutional crypto transaction rails with guaranteed title deed registration."
    ),
    RealEstateProject(
        id="proj-danube-oceanz-maritime",
        name="Oceanz by Danube",
        developer="Danube Properties",
        location="Dubai Maritime City",
        starting_price_aed=2200000.0,
        starting_price_usd=599046.0,
        completion_date="Q1 2027",
        project_type="Waterfront Luxury Furnished by Tonino Lamborghini",
        projected_net_yield=9.4,
        five_year_capital_gain=39.0,
        payment_plan="65/35 (1% Monthly Post-Handover Payment Plan)",
        dld_escrow_number="DLD-ESC-2024-3381",
        golden_visa_eligible=True,
        crypto_accepted=True,
        supported_cryptos=["USDT", "BTC", "ETH"],
        images=[
            "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
        ],
        key_features=[
            "Interiors Furnished by Tonino Lamborghini Casa",
            "Famous 1% Monthly Payment Plan Compatible with Crypto",
            "Highest Projected Net Rental Yield in Maritime City (9.4%)",
            "Zero Personal & Zero Capital Gains Tax"
        ],
        description="Ultra-modern waterfront residences in Dubai Maritime City offering Danube's iconic payment plan and direct digital currency payment channels."
    ),
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
        crypto_accepted=True,
        supported_cryptos=["USDT", "BTC"],
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
        description="Exclusive collection of beachfront sky-mansions on Palm Jumeirah with private infinity pools and dedicated concierge for global family offices."
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
        crypto_accepted=False,
        supported_cryptos=[],
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
    )
]

def get_all_projects() -> List[RealEstateProject]:
    return CURATED_PROJECTS

def match_projects_for_budget(budget_usd: float, is_crypto_investor: bool = False) -> List[RealEstateProject]:
    # If the investor is from crypto/Web3, prioritize crypto-accepted developers (DAMAC, Binghatti, Sobha, Danube)
    if is_crypto_investor:
        crypto_projects = [p for p in CURATED_PROJECTS if p.crypto_accepted]
        if budget_usd >= 3000000.0:
            return sorted(crypto_projects, key=lambda x: x.starting_price_usd, reverse=True)
        return crypto_projects

    if budget_usd >= 3000000.0:
        return [p for p in CURATED_PROJECTS if p.starting_price_usd >= 2000000.0]
    return [p for p in CURATED_PROJECTS if p.starting_price_aed >= 2000000.0]
