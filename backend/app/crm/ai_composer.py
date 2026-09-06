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

def get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()

def get_gemini_api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

def get_active_provider() -> str:
    if get_groq_api_key():
        return "groq"
    elif get_gemini_api_key():
        return "gemini"
    return "local"

GEMINI_API_KEY = get_gemini_api_key()
GROQ_API_KEY = get_groq_api_key()

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
    ignore_notes = ["asistencia confirmada", "evento vip", "asistió", "asistio", "invitado", "evento"]
    is_event_note = any(w in notes_lower for w in ignore_notes)

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
    elif notes and len(notes) > 5 and not notes.isdigit() and not is_negative_note and not is_event_note:
        clean_note = notes[0].lower() + notes[1:] if len(notes) > 1 else notes
        hook = f"Te escribo recordando tu interés en el mercado inmobiliario de Dubai."
    elif objective and not is_vague_objective:
        hook = f"Te escribo recordando tu objetivo enfocado en {objective.lower()}."
    else:
        hook = ""

    # 2. Process Custom Instructions or Fallback
    instructions_clean = (prompt_instructions or "").strip()
    
    if instructions_clean and len(instructions_clean) > 8:
        core_instruction = clean_user_instruction_meta(instructions_clean)
        
        # Avoid duplicate greeting if core_instruction starts with greeting
        if re.match(r"^hola\s+soy\s+david", core_instruction, flags=re.IGNORECASE):
            core_instruction = re.sub(r"^hola\s+soy\s+david,?\s*", "Soy David, ", core_instruction, flags=re.IGNORECASE)
        
        # Check if instruction already has a CTA to avoid duplicating ideas
        has_cta = any(w in core_instruction.lower() for w in ["zoom", "día y hora", "dia y hora", "disponible", "conectarnos", "reunión", "reunion"])
        
        cta = ""
        if not has_cta:
            inst_lower = instructions_clean.lower()
            if "online" in inst_lower or "zoom" in inst_lower or "hora y fecha" in inst_lower or "reunión" in inst_lower or "reunion" in inst_lower:
                cta = "¿Qué día y hora te vendría bien entre esta semana para hacer una breve presentación online y mostrarte los números exactos?"
            elif "hotel" in inst_lower or "evento" in inst_lower or "asistencia" in inst_lower or "madrid" in inst_lower or "presencial" in inst_lower:
                cta = "El aforo es exclusivo y limitado. Si te gustaría asistir o recibir el pase VIP, ¿me confirmas por aquí y te reservo tu plaza?"
            elif "dossier" in inst_lower or "catalogo" in inst_lower or "catálogo" in inst_lower:
                cta = "¿Te gustaría que te envíe el dossier completo y las fichas técnicas por aquí? Solo respóndeme con un 'Sí'."
            else:
                cta = "¿Te gustaría que te comparta los detalles y números de estas opciones? Solo respóndeme por aquí y lo revisamos."
            
        parts = [p for p in [hook, core_instruction, cta] if p]
        body = "\n\n".join(parts)

    else:
        # Default high-converting real estate campaign body
        body = f"""Te contacto porque tenemos una oportunidad única en Dubai: estuvimos presentando novedades exclusivas y proyectos con condiciones especiales:
• 🛂 *Golden Visa de 10 Años GRATIS*
• 🏷️ *Descuentos del 15% al 20%* exclusivos en fases de lanzamiento
• 🏠 *Gestión de alquiler (Property Management) 100% GRATIS*
• Planes de pago directos desde 1% mensual sin intereses

¿Te gustaría que te comparta los detalles y el dossier informativo? Solo respóndeme por aquí y te lo envío sin compromiso."""

    msg = f"""{salutation}

{body}"""
    return msg.strip()

async def compose_lead_message_ai(lead: Dict[str, Any], prompt_instructions: str, campaign_name: str = "") -> str:
    """
    1. PRIMARY: Groq Cloud LPU (Ultra-fast 0.5s generation)
    2. FALLBACK: Google Gemini (high-quota fast models)
    3. TERTIARY: Local intelligent copy synthesizer
    """
    import asyncio
    groq_key = get_groq_api_key()
    gemini_key = get_gemini_api_key()

    if not groq_key and not gemini_key:
        return compose_lead_message_local(lead, prompt_instructions, campaign_name)

    name = lead.get("name", "")
    first_name = format_lead_first_name(name)
    objective = lead.get("objective", "")
    budget = lead.get("budget_eur") or lead.get("budget_aed") or ""

    system_prompt = f"""Eres David, asesor experto en inversiones y Bienes Raíces en Dubai.
Tu objetivo es redactar un mensaje de WhatsApp individual, directo, elegante y de alta conversión para este cliente.

INSTRUCCIONES CLAVE DEL BROKER (DAVID):
"{prompt_instructions}"

DATOS DEL CLIENTE:
- Nombre: {name} (Llámalo por su nombre de pila: {first_name})
- Objetivo: {objective or 'Inversión'}
- Presupuesto: {budget or 'Flexible'}

REGLAS ESTRICTAS DE REDACCIÓN:
1. Comienza saludando únicamente con el nombre de pila: "Hola {first_name}," y a continuación preséntate con naturalidad en primera persona: "Soy David, asesor experto en bienes raíces en Dubai..." o "Te saluda David...". NUNCA dupliques saludos (PROHIBIDO decir "Hola {first_name}... Hola soy David...").
2. TOTALMENTE PROHIBIDO mencionar "asistencia confirmada al evento", notas técnicas de CRM o decir que asistió al evento VIP (ese registro es una nota interna antigua y no debe mencionarse al cliente). Si se hace referencia a un evento pasado, menciónalo como un evento exclusivo reciente donde presentamos oportunidades de inversión de alto nivel en Dubai.
3. Desarrolla la propuesta de valor con fluidez, naturalidad y tono consultivo de alto nivel, integrando las condiciones descritas en las instrucciones del broker (planes de pago, depósitos desde 60K USD con 500$ mensuales, propiedades de lujo, 0% impuestos y alta rentabilidad).
4. NUNCA copies las órdenes de desarrollo textuales del usuario como "Quiero que le mandes un mensaje", "además de la información del excel", ni "vincula la siguiente idea".
5. Termina con UNA SOLA llamada a la acción clara y directa: consultar qué día y hora le viene bien entre esta semana para conectarse brevemente por Zoom y mostrarle las opciones y su rentabilidad.
6. NO repitas ideas, saludos ni preguntas al final. Mantén el mensaje limpio, en 3 párrafos cortos formato WhatsApp.
7. Devuelve ÚNICAMENTE el texto final del mensaje listo para enviar, sin introducciones ni comillas envolventes."""

    # ==========================================
    # 1. PRIMARY: GROQ (Ultra-Fast 0.5s LPU)
    # ==========================================
    if groq_key:
        groq_models = [
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b"
        ]
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        for m in groq_models:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    payload = {
                        "model": m,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Por favor redacta el mensaje de WhatsApp para {name} siguiendo estrictamente las instrucciones."}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 800
                    }
                    r = await client.post(groq_url, json=payload, headers=groq_headers)
                    if r.status_code == 200:
                        data = r.json()
                        content = data["choices"][0]["message"]["content"].strip()
                        if content:
                            print(f"[AI Composer] ✅ Message generated via Groq ({m}) for {name}")
                            return content
            except Exception as e:
                print(f"[AI Composer] Groq error on {m}: {e}")
                continue

    # ==========================================
    # 2. SECONDARY: GOOGLE GEMINI (Fallback)
    # ==========================================
    if gemini_key:
        models_to_try = [
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-flash-latest",
            "gemini-3.6-flash"
        ]
        
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        res = await client.post(url, json={
                            "contents": [{"parts": [{"text": system_prompt}]}],
                            "generationConfig": {
                                "temperature": 0.3,
                                "maxOutputTokens": 1000
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
                                        print(f"[AI Composer] ✅ Message generated via Gemini ({model_name}) for {name}")
                                        return text
                        elif res.status_code == 429:
                            await asyncio.sleep(1.0)
                            break
                        elif res.status_code == 404:
                            break
                except Exception as e:
                    print(f"[AI Composer] Gemini call error on {model_name} attempt {attempt}: {e}")
                    await asyncio.sleep(1.0)
                    continue

    # ==========================================
    # 3. TERTIARY: LOCAL INTELLIGENT FALLBACK
    # ==========================================
    print(f"[AI Composer] ℹ️ Fallback to local copy for {name}")
    return compose_lead_message_local(lead, prompt_instructions, campaign_name)
