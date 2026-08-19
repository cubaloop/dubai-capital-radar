import os
import uuid
from typing import Dict, Any, List
from ..models.schemas import ProspectProfile, TaxComparison, RealEstateProject, DossierResponse
from ..financial_engine.tax_model import calculate_tax_arbitrage
from ..inventory.projects import match_projects_for_budget

CALENDLY_URL_DEFAULT = os.getenv("CALENDLY_URL", "https://calendly.com/dubai-private-wealth/vip-advisory")
WHATSAPP_PHONE_DEFAULT = os.getenv("WHATSAPP_PHONE", "+971501378020")

def generate_investment_thesis(
    prospect: ProspectProfile,
    tax: TaxComparison,
    projects: List[RealEstateProject]
) -> str:
    """
    Generates an institutional private banking investment thesis narrative.
    Connects to Google Gemini 3.6 Flash live.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-3.6-flash")
            
            prompt = f"""
            Act as a senior Family Office Structuring Partner in Dubai DIFC.
            Write a confidential, high-impact investment thesis for:
            Investor: {prospect.name} ({prospect.role_title} at {prospect.company_name})
            Origin: {prospect.country}
            Liquidity Event: {prospect.liquidity_event}
            Estimated Net Worth: ${prospect.estimated_net_worth_usd:,.0f} USD
            Annual Tax Savings in Dubai vs Home Country: ${tax.annual_tax_savings_usd:,.0f} USD
            5-Year Tax Savings: ${tax.five_year_savings_usd:,.0f} USD
            Recommended Properties: {', '.join([p.name + ' (' + p.location + ')' for p in projects[:2]])}

            Guidelines:
            - Write in a highly sophisticated, confidential private banking tone.
            - Highlight how investing in Dubai Real Estate solves their immediate tax drag while securing a 10-Year UAE Golden Visa.
            - Mention DLD Escrow protections and projected 8%+ net rental yield.
            - Keep it under 220 words. No salesy fluff, only financial rigor.
            """
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            # Fall back gracefully to deterministic synthesis
            pass

    # High-Yield Institutional Default Thesis
    project_names = " and ".join([p.name for p in projects[:2]])
    return (
        f"Confidential Asset Allocation & Tax Arbitrage Thesis for {prospect.name}. "
        f"Following the recent liquidity milestone with {prospect.company_name}, your capital faces an effective "
        f"tax drag of {tax.effective_home_tax_rate:.1f}% under {tax.home_country} jurisdiction, translating to approximately "
        f"${tax.five_year_savings_usd:,.0f} USD in accumulated fiscal liability over a 5-year cycle. "
        f"By reallocating a strategic portion into Dubai Land Department (DLD) escrow-protected Tier-1 real estate—specifically "
        f"assets like {project_names}—you eliminate personal income, capital gains and wealth taxation while securing an immediate "
        f"10-Year Renewable UAE Golden Visa for your family. With projected net yields between 7.8% and 8.9% and full capital repatriation "
        f"guarantees, this structure achieves optimal capital preservation and currency diversification in USD-pegged AED."
    )

def build_dossier(prospect: ProspectProfile) -> DossierResponse:
    dossier_id = f"dos-{uuid.uuid4().hex[:8]}"
    slug = f"{prospect.name.lower().replace(' ', '-').replace('.', '')}-{uuid.uuid4().hex[:4]}"
    
    # Financial calculations
    annual_income = max(300000.0, prospect.estimated_net_worth_usd * 0.08)
    capital_gains = prospect.estimated_net_worth_usd * 0.4
    tax_analysis = calculate_tax_arbitrage(prospect.country, annual_income, capital_gains)
    
    # Project Matching
    matched_projects = match_projects_for_budget(prospect.estimated_net_worth_usd)
    
    # Investment narrative
    thesis_text = generate_investment_thesis(prospect, tax_analysis, matched_projects)
    
    # Golden Visa Milestones
    gv_roadmap = [
        {
            "step": "Phase 1: Escrow Allocation & Title Deed / Oqood",
            "timeline": "Days 1 - 7",
            "description": "Selection of qualifying Tier-1 unit (+2,000,000 AED) and registration with Dubai Land Department."
        },
        {
            "step": "Phase 2: Fast-Track Medical & VIP Biometrics",
            "timeline": "Days 8 - 14",
            "description": "Private VIP concierge handling medical fitness test and Emirates ID issuance in Dubai."
        },
        {
            "step": "Phase 3: 10-Year Golden Visa & Private Banking Setup",
            "timeline": "Days 15 - 21",
            "description": "Stamping of 10-year residency visa and introduction to Emirates NBD / FAB Private Wealth management."
        }
    ]

    # Asset Allocation Recommendation
    allocation = {
        "Prime Waterfront / Capital Appreciation": 45.0,
        "High-Yield Off-Plan Rental Assets (8%+ ROI)": 35.0,
        "Liquid Treasury & UAE Private Banking Reserve": 20.0
    }

    clean_name = prospect.name.replace(" ", "%20")
    whatsapp_url = f"https://wa.me/{WHATSAPP_PHONE_DEFAULT.replace('+', '')}?text=Hello,%20I%20have%20reviewed%20my%20Confidential%20Dubai%20Wealth%20Dossier%20for%20{clean_name}."

    return DossierResponse(
        dossier_id=dossier_id,
        slug=slug,
        prospect=prospect,
        tax_analysis=tax_analysis,
        recommended_projects=matched_projects,
        investment_thesis_narrative=thesis_text,
        golden_visa_roadmap=gv_roadmap,
        recommended_asset_allocation=allocation,
        calendly_link=CALENDLY_URL_DEFAULT,
        whatsapp_direct_link=whatsapp_url
    )
