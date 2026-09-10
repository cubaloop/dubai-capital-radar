"""
David Conversational Clone Engine (Jota Autopilot)
Handles inbound WhatsApp messages from registered CRM leads:
1. Speaks in first person as David (Senior Broker at H.O.M.E Properties).
2. Preserves real conversation context & thread continuity (NEVER re-introduces itself if chatting).
3. Intelligently parses real estate requirements:
   - Currency detection and normalization to AED (EUR, USD, GBP, AED).
   - Typology mapping (1 cuarto / 1 hab / 1 dormitorio -> 1BHK / 1 Bedroom).
   - Area preferences.
4. Matches with real project inventory and developer launches.
5. Generates dual-channel output:
   - Natural reply to client via WhatsApp.
   - Detailed executive briefing sent directly to David's personal WhatsApp.
"""

import os
import re
import json
import asyncio
import httpx
from typing import Dict, Any, List, Optional, Tuple
from ..inventory.projects import CURATED_PROJECTS

CURRENCY_RATES_TO_AED = {
    "EUR": 4.05,
    "€": 4.05,
    "USD": 3.67,
    "$": 3.67,
    "GBP": 4.75,
    "£": 4.75,
    "AED": 1.0,
    "DIRHAM": 1.0,
    "DIRHAMS": 1.0
}

def extract_property_requirements(text: str) -> Dict[str, Any]:
    """
    Extracts budget, currency, typology, and location from a client message.
    """
    clean_text = text.lower()
    
    # 1. Extract budget & currency
    detected_currency = "EUR"  # default for European investors
    if any(c in clean_text for c in ["usd", "$", "dolares", "dólares", "dollars"]):
        detected_currency = "USD"
    elif any(c in clean_text for c in ["aed", "dirham", "dirhams"]):
        detected_currency = "AED"
    elif any(c in clean_text for c in ["gbp", "£", "libras", "pounds"]):
        detected_currency = "GBP"
    elif any(c in clean_text for c in ["eur", "€", "euro", "euros"]):
        detected_currency = "EUR"

    # Regex for amounts: 1M, 1.5m, 1 millón, 500k, 500.000, 500000
    raw_amount = None
    
    # Check millions (e.g. 1M, 1.5M, 2 millones)
    m_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:m\b|mill[oó]n|millones)', clean_text)
    k_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:k\b|mil\b)', clean_text)
    plain_match = re.search(r'(\d{1,3}(?:[.,]\d{3})+|\d{5,})', clean_text)
    
    if m_match:
        val_str = m_match.group(1).replace(',', '.')
        raw_amount = float(val_str) * 1_000_000
    elif k_match:
        val_str = k_match.group(1).replace(',', '.')
        raw_amount = float(val_str) * 1_000
    elif plain_match:
        val_str = plain_match.group(1).replace('.', '').replace(',', '')
        raw_amount = float(val_str)

    budget_aed = None
    if raw_amount:
        rate = CURRENCY_RATES_TO_AED.get(detected_currency, 4.05)
        budget_aed = round(raw_amount * rate, 2)

    # 2. Extract typology
    typology = "Unknown"
    if any(w in clean_text for w in ["estudio", "studio", "monoambiente"]):
        typology = "Studio"
    elif any(w in clean_text for w in ["un cuarto", "1 cuarto", "de cuarto", "de 1 cuarto", "un dormitorio", "1 dormitorio", "una habitacion", "una habitación", "1 hab", "1br", "1 br", "1bhk", "1 bhk", "1bd", "1 bd", "1 bed", "1 bedroom", "un recamara", "1 recámara"]):
        typology = "1 Bedroom (1BHK)"
    elif any(w in clean_text for w in ["dos cuartos", "2 cuartos", "de 2 cuartos", "dos dormitorios", "2 dormitorios", "dos habitaciones", "2 habitaciones", "2 hab", "2br", "2 br", "2bhk", "2 bhk", "2bd", "2 bd", "2 bed", "2 bedrooms"]):
        typology = "2 Bedrooms (2BHK)"
    elif any(w in clean_text for w in ["tres cuartos", "3 cuartos", "de 3 cuartos", "tres dormitorios", "3 dormitorios", "tres habitaciones", "3 habitaciones", "3 hab", "3br", "3 br", "3bhk", "3 bhk", "3bd", "3 bd", "3 bed", "3 bedrooms"]):
        typology = "3 Bedrooms (3BHK)"
    elif any(w in clean_text for w in ["villa", "chalet"]):
        typology = "Villa"
    elif any(w in clean_text for w in ["townhouse", "adosado"]):
        typology = "Townhouse"
    elif any(w in clean_text for w in ["penthouse", "atico", "ático"]):
        typology = "Penthouse"

    # 3. Extract preferred location
    locations = []
    area_keywords = {
        "Downtown Dubai": ["downtown", "centro", "burj khalifa"],
        "Business Bay": ["business bay", "canal"],
        "Dubai Marina": ["marina", "dubai marina"],
        "Dubai Creek Harbour": ["creek", "creek harbour"],
        "Dubai Hills Estate": ["dubai hills", "hills estate"],
        "Palm Jumeirah": ["palm", "palmera", "palm jumeirah"],
        "Jumeirah Lakes Towers (JLT)": ["jlt", "jumeirah lakes"],
        "Dubai Maritime City": ["maritime", "maritime city"]
    }
    for area_name, synonyms in area_keywords.items():
        if any(syn in clean_text for syn in synonyms):
            locations.append(area_name)

    return {
        "raw_amount": raw_amount,
        "currency": detected_currency,
        "budget_aed": budget_aed,
        "typology": typology,
        "locations": locations,
        "has_property_request": raw_amount is not None or typology != "Unknown" or len(locations) > 0
    }


def find_matching_projects(
    requirements: Dict[str, Any], 
    ingested_feed: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Matches client requirements against curated inventory and ingested WhatsApp feed.
    """
    matches = []
    target_budget_aed = requirements.get("budget_aed")
    req_locations = requirements.get("locations", [])

    # 1. Search Curated Projects
    for proj in CURATED_PROJECTS:
        score = 0
        price = proj.starting_price_aed

        if target_budget_aed:
            # If within 30% of budget or lower
            if price <= target_budget_aed * 1.3:
                score += 2
        else:
            score += 1

        if req_locations:
            if any(loc.lower() in proj.location.lower() for loc in req_locations):
                score += 3

        if score > 0:
            matches.append({
                "source": "curated",
                "name": proj.name,
                "developer": proj.developer,
                "location": proj.location,
                "starting_price_aed": proj.starting_price_aed,
                "starting_price_usd": proj.starting_price_usd,
                "completion_date": proj.completion_date,
                "project_type": proj.project_type,
                "projected_net_yield": proj.projected_net_yield,
                "payment_plan": proj.payment_plan,
                "golden_visa": proj.golden_visa_eligible,
                "score": score
            })

    # 2. Search Ingested WhatsApp Group Feed
    if ingested_feed:
        for item in ingested_feed:
            price = item.get("starting_price_aed") or 0
            score = 0
            if target_budget_aed and price > 0:
                if price <= target_budget_aed * 1.3:
                    score += 2
            else:
                score += 1

            matches.append({
                "source": "whatsapp_group_launch",
                "name": item.get("project_name", "Nuevo Proyecto Ingestado"),
                "developer": item.get("developer", "Desarrolladora Líder"),
                "location": item.get("location", "Dubai Prime"),
                "starting_price_aed": price,
                "completion_date": item.get("completion_date", "Por confirmar"),
                "payment_plan": item.get("payment_plan", "Plan de pago directo"),
                "score": score
            })

    # Sort by score descending, then by price
    matches.sort(key=lambda x: (x.get("score", 0), -x.get("starting_price_aed", 0)), reverse=True)
    return matches[:3]


async def generate_david_response(
    incoming_text: str,
    lead: Dict[str, Any],
    prior_notes: List[Dict[str, Any]],
    requirements: Dict[str, Any],
    matches: List[Dict[str, Any]]
) -> Tuple[str, str]:
    """
    Generates:
    1. The first-person WhatsApp response to the lead as David (no re-introduction).
    2. The private executive briefing message for David's personal WhatsApp.
    """
    lead_name = lead.get("name", "Cliente").strip()
    first_name = lead_name.split()[0] if lead_name else "Amigo"
    has_prior_history = len(prior_notes) > 0 or lead.get("whatsapp_status") == "sent" or lead.get("last_contact_date") is not None

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()

    # Formulate context for the LLM
    notes_summary = "\n".join([f"- [{n.get('created_at', '')[:10]}]: {n.get('content', '')}" for n in prior_notes[-4:]]) if prior_notes else "Sin notas previas"

    matches_summary = ""
    for idx, m in enumerate(matches, 1):
        price_eur = round(m.get("starting_price_aed", 0) / 4.05, 0)
        matches_summary += f"{idx}. {m.get('name')} ({m.get('developer')}) en {m.get('location')} - Desde {m.get('starting_price_aed', 0):,} AED (~{price_eur:,.0f} €). Entrega: {m.get('completion_date')}. Plan: {m.get('payment_plan')}.\n"

    system_prompt = f"""Eres David, Broker Senior de Real Estate e Inversiones en H.O.M.E Properties en Dubai.
Estás chateando DIRECTAMENTE con un cliente por WhatsApp. Hablas en PRIMERA PERSONA ("yo", "te busco", "te paso").

REGLAS CRÍTICAS DE CONVERSACIÓN:
1. CONTINUIDAD DE HILO:
   - {'ESTA CONVERSACIÓN YA ESTÁ ABIERTA. TIENES PROHIBIDO presentarte de nuevo ("Hola, soy David"). NO saludes como si fuera la primera vez.' if has_prior_history else 'Si es el primer contacto, puedes saludar brevemente con "Hola [Nombre]".'}
   - Ve DIRECTO a responder la consulta del cliente.
2. TONO:
   - Ejecutivo, cercano, ágil, seguro, profesional.
   - Trato de tú a tú cordial, estilo broker de confianza en Dubai.
3. CONSULTA DE PROPIEDADES:
   - Si el cliente pide opciones (ej. 1 habitación por 1M € o similar):
     Confírmale que tienes justo un par de opciones excelentes en mente que encajan con ese presupuesto y zona (~{requirements.get('budget_aed', 0):,.0f} AED), y dile que en unos minutos le envías las fichas/brochures completos por aquí para que los revise con calma.
4. FORMATO:
   - Máximo 2 párrafos cortos (estás en WhatsApp).
   - Usa formato limpio.
"""

    user_prompt = f"""Mensaje recibido del cliente {lead_name}:
"{incoming_text}"

Historial previo con este cliente:
{notes_summary}

Datos extraídos del pedido:
- Tipología: {requirements.get('typology')}
- Presupuesto original: {requirements.get('raw_amount')} {requirements.get('currency')}
- Equivalente en Dubai: ~{requirements.get('budget_aed', 0):,.0f} AED
- Opciones detectadas en tu inventario:
{matches_summary if matches_summary else "Inventario general de Dubai disponible."}

Redacta tu respuesta como David para enviársela por WhatsApp al cliente:"""

    lead_reply = ""

    # 1. Generate Lead Reply via Groq
    if groq_key:
        for model in ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": 0.35,
                            "max_tokens": 300
                        },
                        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                    )
                    if res.status_code == 200:
                        raw = res.json()["choices"][0]["message"]["content"].strip()
                        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
                        if raw:
                            lead_reply = raw
                            break
            except Exception:
                continue

    # 2. Fallback via Gemini
    if not lead_reply and gemini_key:
        for g_model in ["gemini-2.5-flash", "gemini-flash-latest"]:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}",
                        json={"contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}]}
                    )
                    if res.status_code == 200:
                        lead_reply = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if lead_reply:
                            break
            except Exception:
                continue

    # Fallback template if LLMs fail
    if not lead_reply:
        if requirements.get("has_property_request"):
            lead_reply = f"¡Hola {first_name}! Justo estoy revisando un par de opciones excelentes en {requirements.get('typology', 'propiedades')} que encajan perfecto con ese presupuesto (~{requirements.get('budget_aed', 0):,.0f} AED). Ya te las estoy preparando y en breve te paso las fichas completas por aquí para que las revises con calma."
        else:
            lead_reply = f"¡Hola {first_name}! Recibido perfectamente. Ya lo reviso y en breve te doy respuesta con toda la información."

    # 3. Formulate the Private Executive Alert for David's Personal WhatsApp
    david_alert = f"🎯 *SOLICITUD DE CLIENTE: {lead_name}*\n"
    david_alert += f"📱 *Teléfono:* +{lead.get('phone', '').replace('+', '')}\n"
    david_alert += f"💬 *Mensaje del Cliente:* \"{incoming_text}\"\n\n"

    if requirements.get("has_property_request"):
        david_alert += "🔍 *Parámetros Detectados por Jota:*\n"
        if requirements.get('typology') != 'Unknown':
            david_alert += f"• *Tipología:* {requirements.get('typology')}\n"
        if requirements.get('raw_amount'):
            david_alert += f"• *Presupuesto:* {requirements.get('raw_amount'):,.0f} {requirements.get('currency')} (~{requirements.get('budget_aed', 0):,.0f} AED)\n"
        if requirements.get('locations'):
            david_alert += f"• *Zonas:* {', '.join(requirements.get('locations'))}\n"

        david_alert += "\n🏗️ *Opciones Encontradas en Inventario / Grupos:*\n"
        if matches:
            for i, m in enumerate(matches, 1):
                price_eur = round(m.get("starting_price_aed", 0) / 4.05, 0)
                david_alert += f"*{i}. {m.get('name')}* ({m.get('developer')})\n"
                david_alert += f"   📍 {m.get('location')} | 💰 {m.get('starting_price_aed', 0):,} AED (~{price_eur:,.0f} €)\n"
                if m.get('completion_date'):
                    david_alert += f"   📅 Entrega: {m.get('completion_date')}\n"
        else:
            david_alert += "• Se requieren opciones manuales de desarrolladora.\n"

    david_alert += f"\n✅ *Respuesta enviada al cliente en tu nombre:*\n\"{lead_reply}\"\n\n"
    david_alert += "👉 _Accede al chat de WhatsApp para enviarle la ficha seleccionada o llamarlo directamente._"

    return lead_reply, david_alert
