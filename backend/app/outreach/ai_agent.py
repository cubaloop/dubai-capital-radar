"""
AI Conversational Agent - Handles WhatsApp responses 24/7
Classifies intent and generates personalized responses per lead profile
"""
import os
import httpx
from typing import Dict, Any, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """Eres el asistente de ventas de un broker experto en Real Estate de Dubai.
Tu nombre es "Asistente del equipo".
Hablas SIEMPRE en el idioma del cliente (español, inglés, portugués).
Tu objetivo es:
1. Responder amablemente a cualquier consulta sobre propiedades en Dubai
2. Entender la situación del inversor (presupuesto, objetivo, país de origen)
3. Superar objeciones de forma natural, sin presión
4. Cuando el cliente está listo, pedir que agende una llamada con el experto

Hechos clave que puedes mencionar:
- Dubai tiene 0% impuesto sobre la renta y plusvalías
- ROI promedio de alquiler: 6-9% anual (vs 3-4% en España/Europa)
- Plan de pagos off-plan: 10% ahora, resto durante la obra
- Golden Visa disponible desde inversiones de AED 750,000 (~200,000 USD)
- El mercado lleva 4 años de crecimiento sostenido
- DLD (Dubai Land Department) garantiza todas las transacciones

IMPORTANTE: Nunca inventes precios ni datos específicos de proyectos. 
Si no tienes el dato exacto, di "te confirmo ese detalle con el equipo enseguida".
Mantén el tono profesional pero cercano. Máximo 3 párrafos por respuesta."""


async def classify_message_intent(message: str, lead_context: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Classify incoming WhatsApp message intent using Gemini.
    Returns: intent type, urgency level, and suggested action.
    """
    if not GEMINI_API_KEY:
        return {"intent": "unknown", "urgency": "low", "action": "manual_review"}
    
    context_str = ""
    if lead_context:
        context_str = f"""
Lead context:
- Name: {lead_context.get('name', 'Unknown')}
- Country: {lead_context.get('country', 'Unknown')}
- Score: {lead_context.get('score', 5)}/10
- Status: {lead_context.get('status', 'cold')}
- Previous interactions: {lead_context.get('notes', 'None')}
"""

    prompt = f"""Classify this WhatsApp message from a real estate investment prospect.
{context_str}
Message: "{message}"

Respond in JSON with these exact fields:
{{
  "intent": "interested" | "objection_price" | "objection_trust" | "objection_spouse" | "objection_timing" | "ready_to_buy" | "info_request" | "not_interested" | "scheduling" | "other",
  "urgency": "high" | "medium" | "low",
  "language": "es" | "en" | "pt",
  "notify_human": true | false,
  "summary": "one-line summary in English"
}}

Set notify_human=true if: urgency is high, intent is ready_to_buy, or the message requires human judgment.
Respond ONLY with valid JSON."""

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=8.0
            )
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean markdown if present
            text = text.replace("```json", "").replace("```", "").strip()
            import json
            return json.loads(text)
    except Exception as e:
        return {"intent": "unknown", "urgency": "low", "action": "manual_review", "error": str(e)}


async def generate_ai_response(
    message: str,
    lead: Dict[str, Any],
    intent_data: Optional[Dict] = None
) -> str:
    """
    Generate a personalized WhatsApp response for the lead.
    Uses the lead's profile and classified intent to craft the right response.
    """
    if not GEMINI_API_KEY:
        return "Gracias por tu mensaje! Un asesor te contactará pronto."
    
    name = lead.get("name", "").split()[0] if lead.get("name") else ""
    country = lead.get("country", "es")
    intent = intent_data.get("intent", "info_request") if intent_data else "info_request"
    language = intent_data.get("language", "es") if intent_data else "es"
    
    country_context = {
        "es": "inversor español buscando diversificar patrimonio y posiblemente reducir carga fiscal",
        "us": "investor in USA looking for passive income and tax-efficient real estate",
        "mx": "inversor mexicano buscando dolarizar sus ahorros y proteger capital",
        "ar": "inversor argentino buscando refugio del cepo cambiario e inflación",
        "ve": "inversor venezolano buscando estabilidad y activos en dólares",
        "uy": "inversor uruguayo buscando diversificar fuera de la región"
    }.get(country, "inversor internacional")

    objection_guides = {
        "objection_price": "Muéstrale opciones de menor entrada (desde 150k USD). Menciona el plan de pago off-plan (10% ahora). Compara con precio de mercado en su país.",
        "objection_trust": "Menciona el DLD (Dubai Land Department), las cuentas escrow reguladas, y que el mercado lleva 4 años en máximos históricos. Ofrece videollamada con el equipo.",
        "objection_spouse": "Empatiza. Ofrece mandar materiales que ella/él pueda ver. Sugiere llamada en pareja con el asesor.",
        "objection_timing": "Menciona que los precios off-plan suelen subir un 15-25% una vez completados. El momento de entrar es ahora. Sin urgencia artificial.",
        "ready_to_buy": "Excelente momento. Pide agenda una llamada AHORA con el asesor experto. Sé directo y cálido.",
        "scheduling": "Facilita la agenda. Da dos opciones de horario concretas."
    }

    intent_guide = objection_guides.get(intent, "Responde su consulta con datos precisos y redirige hacia agendar una llamada.")
    
    full_name_greeting = f"Hola {name}," if name else "Hola,"

    prompt = f"""{SYSTEM_PROMPT}

Context about this lead:
- Name: {lead.get('name', 'the client')}
- Profile: {country_context}
- Detected intent: {intent}
- Response language: {language}

Their message: "{message}"

Response guidance: {intent_guide}

Write a natural WhatsApp reply (1-3 short paragraphs, no bullet points, conversational tone).
Start with: {full_name_greeting}"""

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=12.0
            )
            return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        return f"Gracias por tu mensaje{', ' + name if name else ''}. En breve te contacta un asesor de nuestro equipo."
