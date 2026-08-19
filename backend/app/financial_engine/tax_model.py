from typing import Dict
from ..models.schemas import TaxComparison

# Regional Effective Tax Rates (Income Tax, Wealth Tax, Capital Gains Tax)
TAX_RATES_DATABASE = {
    "United Kingdom": {
        "top_income_tax": 0.45,
        "capital_gains_tax": 0.20,
        "wealth_tax": 0.0,
        "corporate_tax": 0.25,
        "special_rules": "Abolition of Non-Dom regime increases foreign income exposure to full 45%."
    },
    "Spain": {
        "top_income_tax": 0.47,
        "capital_gains_tax": 0.28,
        "wealth_tax": 0.035,  # Impuesto sobre el Patrimonio / Solidaridad
        "corporate_tax": 0.25,
        "special_rules": "Impuesto a las Grandes Fortunas y retenciones sobre dividendos."
    },
    "France": {
        "top_income_tax": 0.45,
        "capital_gains_tax": 0.30,  # Flat tax (Prélèvement Forfaitaire Unique)
        "wealth_tax": 0.015,  # IFI (Impôt sur la Fortune Immobilière)
        "corporate_tax": 0.25,
        "special_rules": "High social contributions (CSG/CRDS 17.2%) on capital income."
    },
    "Germany": {
        "top_income_tax": 0.45,
        "capital_gains_tax": 0.26375,  # Abgeltungsteuer + Solidaritätszuschlag
        "wealth_tax": 0.0,
        "corporate_tax": 0.30,  # Combined Gewerbesteuer + Körperschaftsteuer
        "special_rules": "Exit taxation (Wegzugsbesteuerung) on shareholdings > 1%."
    },
    "United States": {
        "top_income_tax": 0.37,
        "capital_gains_tax": 0.20,
        "wealth_tax": 0.0,
        "corporate_tax": 0.21,
        "special_rules": "State tax additions (e.g., California 13.3%, NY 10.9%) + 3.8% NIIT."
    },
    "Canada": {
        "top_income_tax": 0.53,  # Top combined federal + provincial (Ontario/BC/Quebec)
        "capital_gains_tax": 0.33,  # 66.7% inclusion rate on gains > $250k
        "wealth_tax": 0.0,
        "corporate_tax": 0.265,
        "special_rules": "Increased capital gains inclusion rate implemented in 2024."
    },
    "Mexico": {
        "top_income_tax": 0.35,
        "capital_gains_tax": 0.10,
        "wealth_tax": 0.0,
        "corporate_tax": 0.30,
        "special_rules": "Strict audit controls on international asset reporting."
    },
    "Argentina": {
        "top_income_tax": 0.35,
        "capital_gains_tax": 0.15,
        "wealth_tax": 0.0225,  # Bienes Personales
        "corporate_tax": 0.35,
        "special_rules": "High currency volatility and FX restrictions."
    },
    "Colombia": {
        "top_income_tax": 0.39,
        "capital_gains_tax": 0.15,
        "wealth_tax": 0.015,  # Impuesto al Patrimonio permanente
        "corporate_tax": 0.35,
        "special_rules": "Permanent wealth tax above $700k USD equivalent."
    },
    "Brazil": {
        "top_income_tax": 0.275,
        "capital_gains_tax": 0.225,
        "wealth_tax": 0.0,
        "corporate_tax": 0.34,
        "special_rules": "Tax on offshore trusts and exclusive funds (Lei das Offshores)."
    }
}

USD_TO_AED_RATE = 3.6725
GOLDEN_VISA_MINIMUM_AED = 2000000.0  # 2 Million AED
GOLDEN_VISA_MINIMUM_USD = GOLDEN_VISA_MINIMUM_AED / USD_TO_AED_RATE  # ~ $544,588 USD

def calculate_tax_arbitrage(
    home_country: str,
    annual_income_usd: float = 400000.0,
    capital_gains_usd: float = 1500000.0
) -> TaxComparison:
    rates = TAX_RATES_DATABASE.get(home_country, {
        "top_income_tax": 0.40,
        "capital_gains_tax": 0.20,
        "wealth_tax": 0.01,
        "corporate_tax": 0.25,
        "special_rules": "Standard high-tax jurisdiction rates applied."
    })

    # Home Country Calculations
    income_tax_home = annual_income_usd * rates["top_income_tax"]
    cgt_home = capital_gains_usd * rates["capital_gains_tax"]
    estimated_wealth_base = capital_gains_usd * 2.0
    wealth_tax_home = estimated_wealth_base * rates["wealth_tax"]
    
    total_home_tax = income_tax_home + cgt_home + wealth_tax_home
    total_gross = annual_income_usd + capital_gains_usd
    effective_home_rate = (total_home_tax / total_gross) * 100 if total_gross > 0 else 0.0

    # Dubai / UAE Calculations:
    # 0% Personal Income Tax, 0% Capital Gains Tax, 0% Wealth Tax, 0% Inheritance Tax
    # Only 9% Corporate Tax on net business profits exceeding 375,000 AED ($102,000 USD)
    dubai_tax_liability = 0.0  # Personal real estate and individual gains are 100% tax free
    dubai_effective_rate = 0.0

    annual_savings = total_home_tax
    five_year_savings = annual_savings * 5.0

    # Recommended property investment allocation (at least Golden Visa threshold)
    recommended_investment_usd = max(GOLDEN_VISA_MINIMUM_USD, capital_gains_usd * 0.6)
    recommended_investment_aed = recommended_investment_usd * USD_TO_AED_RATE

    return TaxComparison(
        home_country=home_country,
        annual_income_usd=round(annual_income_usd, 2),
        capital_gains_usd=round(capital_gains_usd, 2),
        home_tax_liability_usd=round(total_home_tax, 2),
        dubai_tax_liability_usd=0.0,
        annual_tax_savings_usd=round(annual_savings, 2),
        five_year_savings_usd=round(five_year_savings, 2),
        effective_home_tax_rate=round(effective_home_rate, 1),
        dubai_effective_tax_rate=0.0,
        golden_visa_eligible=recommended_investment_aed >= GOLDEN_VISA_MINIMUM_AED,
        recommended_investment_aed=round(recommended_investment_aed, 2),
        recommended_investment_usd=round(recommended_investment_usd, 2)
    )

def detect_currency_for_country(country_name: str) -> str:
    """
    Detects regional currency code. Falls back to USD if unidentified.
    """
    country_clean = country_name.strip().lower()
    if any(c in country_clean for c in ["united kingdom", "uk", "britain", "england", "london"]):
        return "GBP"
    if any(c in country_clean for c in ["spain", "france", "germany", "italy", "portugal", "netherlands", "belgium", "austria", "europe"]):
        return "EUR"
    if any(c in country_clean for c in ["uae", "united arab emirates", "dubai", "abu dhabi"]):
        return "AED"
    return "USD"
