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
    
    instructions_clean = (prompt_instructions or "").strip()
    
    if instructions_clean and len(instructions_clean) > 8:
        core_instruction = clean_user_instruction_meta(instructions_clean)
        
        # If the instruction already has a greeting, return it directly
        if re.match(r"^hola\b", core_instruction, flags=re.IGNORECASE):
            return core_instruction
        
        # Check if instruction already has a question / CTA
        has_cta = any(w in core_instruction.lower() for w in ["?", "¿", "zoom", "día y hora", "dia y hora", "disponible", "conectarnos", "reunión", "reunion", "catálogo", "catalogo", "dossier", "confirmas", "escríbeme", "escribeme"])
        
        cta = ""
        if not has_cta:
            inst_lower = instructions_clean.lower()
            if "online" in inst_lower or "zoom" in inst_lower or "reunión" in inst_lower or "reunion" in inst_lower:
                cta = "¿Qué día y hora te vendría bien entre esta semana para hacer una breve presentación online y mostrártelo en detalle?"
            elif "turismo" in inst_lower or "viaje" in inst_lower or "tour" in inst_lower or "dossier" in inst_lower or "catálogo" in inst_lower or "catalogo" in inst_lower:
                cta = "¿Te gustaría que te comparta el catálogo digital y los detalles por aquí? Solo respóndeme con un 'Sí'."
            else:
                cta = "¿Te gustaría que te comparta los detalles? Solo respóndeme por aquí y con gusto lo revisamos."
            
        parts = [p for p in [core_instruction, cta] if p]
        body = "\n\n".join(parts)
        return f"{salutation}\n\n{body}".strip()

    # Default fallback only if NO instructions were provided at all
    notes = (lead.get("notes") or "").strip()
    is_tourism = any(w in (campaign_name + " " + objective + " " + notes).lower() for w in ["turismo", "viaje", "tour", "surprise", "latam"])
    if is_tourism:
        body = f"""Te contacto desde Surprise Tourism Dubai porque tenemos experiencias turísticas exclusivas y paquetes vacacionales VIP diseñados para que conozcas Dubai al más alto nivel:
• Safaris exclusivos en el desierto con buggies y cena VIP
• Alquiler y paseos en yates privados por Dubai Marina y Palm Jumeirah
• Tours guiados a Abu Dhabi y accesos VIP a atracciones icónicas

¿Te gustaría que te comparta nuestro catálogo digital e itinerarios por aquí? Solo respóndeme con un 'Sí' y te lo comparto con gusto."""
    else:
        body = f"""Te contacto porque tenemos novedades y oportunidades exclusivas en Dubai diseñadas a tu medida:
• Opciones seleccionadas con condiciones especiales
• Asesoría integral personalizada sin compromiso

¿Te gustaría que te comparta los detalles y el dossier informativo? Solo respóndeme por aquí y te lo envío."""
    return f"{salutation}\n\n{body}".strip()

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
    objective = (lead.get("objective") or "").strip()
    notes = (lead.get("notes") or "").strip()
    budget = lead.get("budget_eur") or lead.get("budget_aed") or ""

    instructions_clean = (prompt_instructions or "").strip()

    if instructions_clean:
        campaign_directive = f"""DIRECTRICES ESPECÍFICAS DE LA CAMPAÑA (MÁXIMA PRIORIDAD):
\"\"\"{instructions_clean}\"\"\"

Tu misión es redactar el mensaje de WhatsApp para el cliente adaptando fielmente estas directrices."""
    else:
        is_tourism = any(w in (campaign_name + " " + objective + " " + notes).lower() for w in ["turismo", "viaje", "tour", "surprise", "latam"])
        if is_tourism:
            campaign_directive = f"""DIRECTRICES DE LA CAMPAÑA (SURPRISE TOURISM DUBAI):
Preséntate como Carol Serra de Surprise Tourism Dubai. Te escribo para presentarte experiencias turísticas exclusivas y paquetes vacacionales VIP para conocer Dubai (safaris en el desierto, yates privados, hoteles 5 estrellas y tours en Abu Dhabi). Pregúntale si desea que le compartamos el catálogo e itinerarios por WhatsApp. (NOTA: Somos 100% empresa de turismo, NO real estate ni inmuebles)."""
        else:
            campaign_directive = f"""DIRECTRICES DE LA CAMPAÑA:
Presenta los servicios exclusivos de la campaña "{campaign_name or 'Dubai Opportunities'}", destacando excelencia y atención personalizada."""

    lead_context = f"""DATOS DEL CLIENTE:
- Nombre completo: {name}
- Nombre de pila: {first_name}"""
    if objective:
        lead_context += f"\n- Objetivo/Interés registrado: {objective}"
    if budget:
        lead_context += f"\n- Presupuesto/Rango: {budget}"

    system_prompt = f"""Eres un redactor experto en marketing conversacional por WhatsApp.
Tu misión es redactar un mensaje individual, directo, elegante y de alta conversión para este cliente, siguiendo ESTRICTAMENTE las directrices e identidad indicadas a continuación.

{campaign_directive}

{lead_context}

REGLAS ESTRICTAS DE REDACCIÓN:
1. Comienza saludando únicamente con el nombre de pila: "Hola {first_name}," (o saludo cordial con su nombre). NUNCA dupliques el saludo (PROHIBIDO decir "Hola {first_name}... Hola...").
2. Adopta fielmente el rol, nombre de asesor, agencia y propuesta de valor indicados en las DIRECTRICES DE LA CAMPAÑA. Si las directrices indican quién eres (por ejemplo un asesor específico o una empresa), preséntate exactamente como se pide. Si no indican nombre, habla en primera persona como el asesor de la campaña.
3. TOTALMENTE PROHIBIDO mencionar notas técnicas de CRM como "asistencia confirmada al evento" o jerga interna. Si se hace referencia a un evento o interacción previa, hazlo con elegancia y naturalidad.
4. Desarrolla la propuesta de valor con fluidez, naturalidad y tono consultivo, respetando exactamente el producto o servicio que se ofrece en las directrices (turismo, viajes, propiedades, inversión, etc.).
5. NUNCA copies las órdenes textuales del usuario como "Quiero que le mandes un mensaje", "además de la información del excel", ni "vincula la siguiente idea". Escribe directamente hablándole al cliente.
6. Finaliza con la llamada a la acción (CTA) especificada en las directrices de la campaña (o una pregunta cordial para continuar la conversación o coordinar una llamada/presentación).
7. Mantén el mensaje limpio, sin repeticiones, estructurado en 2 a 3 párrafos cortos formato WhatsApp.
8. Devuelve ÚNICAMENTE el texto final del mensaje listo para enviar, sin introducciones, sin explicaciones ni comillas envolventes."""

    # ==========================================
    # 1. PRIMARY: GROQ (Ultra-Fast 0.5s LPU)
    # ==========================================
    if groq_key:
        groq_models = [
            "groq/compound",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ]
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        for m in groq_models:
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        payload = {
                            "model": m,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": f"Por favor redacta el mensaje de WhatsApp para {first_name} siguiendo estrictamente las instrucciones."}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 800
                        }
                        r = await client.post(groq_url, json=payload, headers=groq_headers)
                        if r.status_code == 200:
                            data = r.json()
                            choice_msg = data["choices"][0]["message"]
                            raw_content = (choice_msg.get("content") or "").strip()
                            if not raw_content and choice_msg.get("reasoning"):
                                raw_content = choice_msg["reasoning"].strip()
                            
                            clean_text = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                            if clean_text.startswith('"') and clean_text.endswith('"'):
                                clean_text = clean_text[1:-1].strip()
                            if clean_text:
                                print(f"[AI Composer] [OK] Message generated via Groq ({m}) for {name}")
                                return clean_text
                        elif r.status_code == 429:
                            print(f"[AI Composer] Groq rate limited on {m}, backing off...")
                            await asyncio.sleep(1.5)
                            continue
                        else:
                            print(f"[AI Composer] Groq returned HTTP {r.status_code} on {m}")
                            break
                except Exception as e:
                    print(f"[AI Composer] Groq error on {m}: {e}")
                    await asyncio.sleep(0.5)
                    continue

    # ==========================================
    # 2. SECONDARY: GOOGLE GEMINI (Fallback)
    # ==========================================
    if gemini_key:
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.0-flash",
            "gemini-3.1-flash-lite"
        ]
        
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        res = await client.post(url, json={
                            "contents": [{"parts": [{"text": f"{system_prompt}\n\nPor favor redacta el mensaje de WhatsApp para {first_name}."}]}],
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
                                    if text.startswith('"') and text.endswith('"'):
                                        text = text[1:-1].strip()
                                    if text:
                                        print(f"[AI Composer] [OK] Message generated via Gemini ({model_name}) for {name}")
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
    print(f"[AI Composer] [INFO] Fallback to local copy for {name}")
    return compose_lead_message_local(lead, prompt_instructions, campaign_name)
