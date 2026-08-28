"""
Organic Social & WhatsApp Status Content Generator
Generates daily high-hook generic real estate posts and WhatsApp status updates
focused on Dubai tax advantages, ROI, Golden Visa, and lifestyle without making false claims.
"""
import os
import json
import httpx
from typing import Dict, Any, List, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

POST_THEMES = [
    {
        "theme": "tax_arbitrage",
        "title": "Comparativa Fiscal 0% Impuestos",
        "description": "Comparación del 0% de IRPF y plusvalías en Dubai frente al 45%+ en Europa/España o impuestos en LatAm."
    },
    {
        "theme": "rental_yield",
        "title": "Rentabilidad Neta por Alquiler",
        "description": "Explicación de por qué Dubai genera 7-9% neto anual frente al 3-4% en ciudades occidentales."
    },
    {
        "theme": "golden_visa",
        "title": "Golden Visa de 10 Años para Inversores",
        "description": "Requisitos reales para obtener residencia permanente para toda la familia con inversión desde 2M AED (~$545k USD)."
    },
    {
        "theme": "payment_plans",
        "title": "Planes de Pago Off-Plan Directos de Desarrolladora",
        "description": "Cómo funcionan los pagos escalonados durante la construcción (ej. 10% inicial y cuotas mensuales) sin hipoteca bancaria."
    },
    {
        "theme": "safety_escrow",
        "title": "Seguridad Jurídica y Cuentas Escrow DLD",
        "description": "Cómo el gobierno de Dubai y el Dubai Land Department protegen el dinero del inversor extranjero al 100%."
    }
]

async def generate_daily_social_pack(language: str = "es") -> Dict[str, Any]:
    """
    Generates a daily content pack:
    1. WhatsApp Status story (short, punchy, curiosity hook).
    2. LinkedIn / Facebook text post with educational value.
    3. Instagram caption with bullet points and clear CTA.
    """
    if not GEMINI_API_KEY:
        return {
            "error": "GEMINI_API_KEY not configured",
            "whatsapp_status": "Invierte en activos en dólares en Dubai con 0% de impuestos sobre la renta. Escríbeme al privado para conocer el dossier del mes.",
            "linkedin_post": "El mercado inmobiliario de Dubai sigue liderando los rendimientos globales en 2026...",
            "cta": "Envía un mensaje privado para recibir el análisis comparativo completo."
        }

    prompt = f"""You are an elite digital strategist for a private real estate wealth advisory in Dubai.

Generate a daily organic marketing content pack in {language.upper()} for high-net-worth individuals in Spain, USA, and Latin America.

Rules:
1. NEVER invent fake promotions or guarantee impossible returns.
2. Focus on REAL Dubai fundamentals: 0% income tax, 0% capital gains, 7-9% average rental yield, DLD regulated escrow accounts, and 10-year Golden Visa.
3. Tone: Executive, sophisticated, advisory, educational, high-curiosity hook.
4. Call to Action (CTA): Direct message or WhatsApp inquiry to request a private advisory session or market dossier.

Respond ONLY with valid JSON:
{{
  "theme": "Theme title",
  "whatsapp_status": "Punchy 30-word WhatsApp status text with emojis and clear question hook",
  "linkedin_post": "Engaging 150-word LinkedIn/Facebook post structured with: Hook, 3 key bullet insights, and executive CTA",
  "instagram_caption": "100-word Instagram caption with relevant hashtags",
  "suggested_visual_idea": "Description of what image or video background to use (e.g. skyline, construction handover graph, marina view)"
}}"""

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15.0
            )
            raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            clean_json = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
    except Exception as e:
        return {"error": str(e)}
