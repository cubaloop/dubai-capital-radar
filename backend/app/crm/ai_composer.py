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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

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
    """Removes meta directives like 'Quiero que les digas que' and trailing 'que me escriba...' so text is natural."""
    s = instruction.strip()
    patterns = [
        r"^(?:por favor\s+)?(?:quiero\s+que\s+(?:además\s+de[^\.]*\s+|ademas\s+de[^\.]*\s+)?(?:les\s+)?(?:menciones|digas|comentes|avises|expliques|recuerdes)\s+(?:que\s+)?)+",
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
    Calls Gemini if GEMINI_API_KEY is configured, else seamlessly falls back to compose_lead_message_local.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return compose_lead_message_local(lead, prompt_instructions, campaign_name)

    name = lead.get("name", "")
    first_name = format_lead_first_name(name)
    notes = lead.get("notes", "")
    objective = lead.get("objective", "")
    timeline = lead.get("timeline", "")
    budget = lead.get("budget_eur") or lead.get("budget_aed") or ""

    system_prompt = f"""Eres un asesor senior de inversiones inmobiliarias en Dubai.
Tu objetivo es redactar un mensaje de WhatsApp individual, ultra personalizado, directo y persuasivo para un lead específico.

INSTRUCCIONES CLAVE DE LA CAMPAÑA DADAS POR EL BROKER:
"{prompt_instructions}"

DATOS ESPECÍFICOS DEL LEAD:
- Nombre: {name} (Llámalo por su nombre: {first_name})
- Notas o conversación previa: {notes or 'Sin notas previas'}
- Objetivo de inversión: {objective or 'Inversión'}
- Plazo: {timeline or 'No especificado'}
- Presupuesto: {budget}

REGLAS OBLIGATORIAS:
1. Saluda cordialmente por su nombre: "Hola {first_name},"
2. Conecta de forma sutil con su interés o notas previas si existen.
3. Incorpora FIELMENTE y con naturalidad las instrucciones de la campaña que dio el broker (fechas, lugares, eventos, ofertas, requisitos o llamadas a la acción).
4. Termina con una llamada a la acción clara y sencilla para que responda por WhatsApp.
5. Usa formato de WhatsApp (*negrita* en puntos clave, párrafos cortos y limpios).
6. Tono: profesional, cercano, directo, sin rodeos ni saludos robóticos.
7. Devuelve ÚNICAMENTE el texto exacto del mensaje de WhatsApp, nada más."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json={
                "contents": [{"parts": [{"text": system_prompt}]}],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 600
                }
            })
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text
    except Exception as e:
        print(f"[AI Composer] Gemini call error: {e}, falling back to local synthesizer.")

    return compose_lead_message_local(lead, prompt_instructions, campaign_name)
