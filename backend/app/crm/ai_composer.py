"""
AI Campaign Message Composer
Generates custom, hyper-targeted WhatsApp messages for leads based on:
1. User-provided natural-language instructions per campaign (e.g. event details, 50K minimum, Zoom calls, etc.)
2. Lead profile extracted from Excel (name, past notes, budget, objective, timeline)
3. Gemini AI engine if GEMINI_API_KEY is available, with instant high-converting local fallback.
"""
import os
import re
import httpx
from typing import Dict, Any, Optional

def get_gemini_api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

GEMINI_API_KEY = get_gemini_api_key()

def format_lead_first_name(raw_name: str) -> str:
    if not raw_name:
        return "amigo"
    cleaned = raw_name.strip()
    if not cleaned or cleaned.lower() in ["inversor", "lead", "cliente"]:
        return "hola"
    # Title-case if all uppercase or lowercase
    if cleaned.isupper() or cleaned.islower():
        cleaned = cleaned.title()
    first = cleaned.split()[0]
    return first

def clean_user_instruction_meta(instruction: str) -> str:
    """Removes meta directives and extracts the core pitch."""
    s = instruction.strip()
    
    # If the user explicitly provided the idea/pitch after "idea:" or similar delimiter
    match_idea = re.search(r"(?:la siguiente idea|esta idea|el siguiente texto|el mensaje)\s*:\s*(.*)", s, flags=re.IGNORECASE | re.DOTALL)
    if match_idea:
        s = match_idea.group(1).strip()
    else:
        # Check if there is an embedded greeting like "Hola soy David"
        match_greeting = re.search(r"(Hola\s+soy\s+.*)", s, flags=re.IGNORECASE | re.DOTALL)
        if match_greeting:
            s = match_greeting.group(1).strip()
        else:
            patterns = [
                r"^(?:por favor\s+)?(?:quiero\s+que\s+.*?(?:menciones|digas|vincula(?:s)?|escribas|le\s+mandes[^\:]*\:?)\s*)",
                r"^(?:por favor\s+)?(?:quiero\s+que\s+(?:le\s+|les\s+)?(?:mandes|envíes|envies|hagas|digas|comentes|avises|expliques|recuerdes|menciones)[^\:]*?(?:vincula(?:s)?|con|la siguiente idea)?:?\s*)",
                r"^(?:diles\s+que\s+|recuérdales\s+que\s+|recuerdales\s+que\s+|menciónales\s+que\s+|mencionales\s+que\s+|avísales\s+que\s+)",
                r"^(?:quiero\s+que\s+)"
            ]
            for p in patterns:
                s = re.sub(p, "", s, flags=re.IGNORECASE).strip()
    
    # Strip trailing meta instructions directing the bot to ask for something (as the CTA handles it)
    s = re.sub(r"[,;\.]\s*(?:y\s+)?(?:que\s+)?(?:me\s+escriba|me\s+diga|me\s+confirme|les\s+pides|pídeles|pideles)\s+.*$", ".", s, flags=re.IGNORECASE).strip()
    if s and not s.endswith("."):
        s += "."
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    return s

def compose_lead_message_local(lead: Dict[str, Any], prompt_instructions: str = "", campaign_name: str = "") -> str:
    """
    Intelligent local copy synthesizer. Guaranteed 0-latency, 100% reliable,
    and dynamically blends lead context with campaign prompt instructions.
    """
    name = lead.get("name", "")
    first_name = format_lead_first_name(name)
    salutation = f"Hola {first_name}," if first_name != "hola" else "Hola,"
    
    notes = (lead.get("notes") or "").strip()
    objective = (lead.get("objective") or "").strip()
    timeline = (lead.get("timeline") or "").strip()
    budget_eur = lead.get("budget_eur")
    budget_aed = lead.get("budget_aed")
    
    # 1. Lead Specific Memory Hook
    hook = ""
    notes_lower = notes.lower()
    negative_words = ["no interesado", "no interesa", "no está interesado", "descartado", "no contesta", "equivocado", "spam", "mala hora", "no quiere", "baja"]
    is_negative_note = any(w in notes_lower for w in negative_words)

    vague_objectives = ["inversión", "inversion", "general", "no especificado", "solo estoy explorando", "explorando", "curiosidad", "viendo"]
    is_vague_objective = any(w in objective.lower() for w in vague_objectives)

    if budget_eur:
        hook = f"Te contacto recordando tu interés en proyectos en el rango de {int(budget_eur):,} €."
    elif budget_aed:
        hook = f"Te contacto recordando tu interés en opciones de inversión en torno a {int(budget_aed):,} AED."
    elif "flipping" in notes_lower or "plusvalia" in notes_lower or "plusvalía" in notes_lower:
        hook = "Te escribo recordando tu enfoque en revalorización de capital y proyectos con alto potencial de salida."
    elif "estudio" in notes_lower or "studio" in notes_lower:
        hook = "Te escribo teniendo en mente tu interés en unidades tipo estudio con alta rentabilidad neta por alquiler."
    elif "familia" in notes_lower or "chalet" in notes_lower or "villa" in notes_lower:
        hook = "Te escribo recordando tu búsqueda de propiedades amplias y residenciales."
    elif notes and len(notes) > 5 and not notes.isdigit() and not is_negative_note:
        clean_note = notes[0].lower() + notes[1:] if len(notes) > 1 else notes
        hook = f"Te escribo teniendo presente tu interés previo ({clean_note})."
    elif objective and not is_vague_objective:
        hook = f"Te escribo recordando tu objetivo enfocado en {objective.lower()}."
    else:
        hook = "Te contacto directamente desde nuestro equipo asesor de Dubai."

    # 2. Process Custom Instructions or Fallback
    instructions_clean = (prompt_instructions or "").strip()
    
    if instructions_clean and len(instructions_clean) > 8:
        # User provided specific custom bot instructions!
        core_instruction = clean_user_instruction_meta(instructions_clean)
        
        # Check call-to-action type inside instruction
        inst_lower = instructions_clean.lower()
        if "online" in inst_lower or "zoom" in inst_lower or "hora y fecha" in inst_lower or "reunión" in inst_lower or "reunion" in inst_lower:
            cta = "¿Qué día y hora te vendría bien entre esta semana para hacer una breve presentación online y mostrarte los números exactos?"
        elif "hotel" in inst_lower or "evento" in inst_lower or "asistencia" in inst_lower or "madrid" in inst_lower or "presencial" in inst_lower:
            cta = "El aforo es exclusivo y limitado. Si te gustaría asistir o recibir el pase VIP, ¿me confirmas por aquí y te reservo tu plaza?"
        elif "dossier" in inst_lower or "catalogo" in inst_lower or "catálogo" in inst_lower:
            cta = "¿Te gustaría que te envíe el dossier completo y las fichas técnicas por aquí? Solo respóndeme con un 'Sí'."
        else:
            cta = "¿Te gustaría que te comparta los detalles y números de estas opciones? Solo respóndeme por aquí y lo revisamos."
            
        body = f"""{hook}

{core_instruction}

{cta}"""

    else:
        # Default high-converting real estate campaign body
        body = f"""{hook}

Te contacto porque tenemos una oportunidad única: estaremos presentando novedades exclusivas y proyectos con condiciones especiales:
• 🛂 *Golden Visa de 10 Años GRATIS*
• 🏷️ *Descuentos del 15% al 20%* exclusivos en fases de lanzamiento
• 🏠 *Gestión de alquiler (Property Management) 100% GRATIS*
• Planes de pago directos desde 1% mensual sin intereses

¿Te gustaría que te comparta los detalles y el dossier informativo? Solo respóndeme por aquí y te lo envío sin compromiso."""

    msg = f"""{salutation}

{body}

Un saludo cordial."""
    return msg.strip()

async def compose_lead_message_ai(lead: Dict[str, Any], prompt_instructions: str, campaign_name: str = "") -> str:
    """
    Calls Google Gemini (v3.6 Flash / v3.5 Flash) with full broker instructions and lead CRM profile.
    Includes rate-limit (429) backoff retry and falls back gracefully to local synthesizer.
    """
    import asyncio
    api_key = get_gemini_api_key()
    if not api_key:
        return compose_lead_message_local(lead, prompt_instructions, campaign_name)

    name = lead.get("name", "")
    first_name = format_lead_first_name(name)
    notes = lead.get("notes", "")
    objective = lead.get("objective", "")
    timeline = lead.get("timeline", "")
    budget = lead.get("budget_eur") or lead.get("budget_aed") or ""

    system_prompt = f"""Eres David, asesor experto en inversiones y Bienes Raíces en Dubai con trato ejecutivo, cercano y de alto valor.
Tu objetivo es redactar un mensaje de WhatsApp individual, ultra personalizado, directo y persuasivo para un lead específico.

INSTRUCCIONES CLAVE DE LA CAMPAÑA DADAS POR TI (EL BROKER):
"{prompt_instructions}"

DATOS ESPECÍFICOS DEL LEAD (DEL EXCEL / CRM):
- Nombre completo: {name} (Llámalo por su nombre de pila: {first_name})
- Notas históricas o conversación previa: {notes or 'Sin notas previas'}
- Objetivo de inversión: {objective or 'Inversión'}
- Plazo: {timeline or 'No especificado'}
- Presupuesto: {budget or 'Flexible'}

REGLAS OBLIGATORIAS:
1. Saluda cordialmente por su nombre de pila: "Hola {first_name}," o "¿Cómo estás, {first_name}?".
2. Preséntate con naturalidad en primera persona como David.
3. Conecta de forma sutil, empática y creíble con su interés previo o notas registradas en el CRM ("{notes}") para que sienta atención 1 a 1 genuina.
4. Desarrolla las ofertas, ideas y beneficios señalados en las instrucciones (importes de depósito, cuotas mensuales, tipos de propiedades, evento reciente en Miami o ventajas fiscales) con lenguaje seductor y profesional.
5. NUNCA copies las órdenes de desarrollo textuales del usuario. NUNCA digas "Quiero que le mandes un mensaje", ni "vincula la siguiente idea", ni repitas directivas técnicas. Habla directamente al cliente.
6. Termina con una llamada a la acción clara para agendar día y hora por Zoom o responder por WhatsApp.
7. Usa formato nativo de WhatsApp (*negrita* en importes y puntos clave, párrafos cortos y limpios).
8. Devuelve ÚNICAMENTE el texto exacto del mensaje de WhatsApp, sin introducciones ni notas adicionales."""

    models_to_try = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite"]
    
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    res = await client.post(url, json={
                        "contents": [{"parts": [{"text": system_prompt}]}],
                        "generationConfig": {
                            "temperature": 0.4,
                            "maxOutputTokens": 2048
                        }
                    })
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and parts[0].get("text"):
                                text = parts[0]["text"].strip()
                                if text:
                                    return text
                    elif res.status_code == 429:
                        # Rate limit reached on free tier (15 RPM) - backoff and retry
                        await asyncio.sleep(2.0 * (attempt + 1))
                        continue
                    elif res.status_code == 404:
                        break  # Try next model
            except Exception as e:
                print(f"[AI Composer] Gemini call error on {model_name} attempt {attempt}: {e}")
                await asyncio.sleep(1.5)
                continue

    return compose_lead_message_local(lead, prompt_instructions, campaign_name)
