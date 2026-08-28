"""
Dubai Property Expo Madrid - VIP Invitation & Reactivation Campaign
Invites the 112 Spain leads to the in-person event at Novotel Madrid Center (Sept 9 & 10).
Formats in EUR (€) and m², references their historical interest/notes, and attaches the official flyer.
"""
import json
import os
import asyncio
import random
import httpx
from typing import List, Dict, Any

LEADS_FILE = os.path.join(os.path.dirname(__file__), "spain_campaign_leads.json")
GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:3001")
MADRID_FLYER_PATH = "/app/whatsapp-gateway/uploads/dubai_madrid_event.jpg"

def load_spain_leads() -> List[Dict[str, Any]]:
    if not os.path.exists(LEADS_FILE):
        return []
    with open(LEADS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def build_madrid_expo_invitation(lead: Dict[str, Any]) -> str:
    """
    Builds a high-conversion, personalized WhatsApp message inviting the lead
    to the Dubai Property Expo in Madrid (Novotel Madrid Center, Sept 9 & 10).
    """
    raw_name = lead.get("name", "").strip()
    first_name = raw_name.split()[0] if raw_name else "Hola"
    notes = lead.get("notes", "").lower()

    # Specific historical reference based on previous conversation
    custom_reference = ""
    if "flipping" in notes or "300k" in notes:
        custom_reference = "Recuerdo que en su momento estuvimos viendo opciones sobre 300.000€ enfocadas a revalorización y rentabilidad."
    elif "160k" in notes or "studio" in notes:
        custom_reference = "Recuerdo que tu interés era una unidad accesible de entrada sobre 150.000€ - 160.000€ (40-45 m²) con alta rentabilidad neta."
    elif "200k" in notes or "casa" in notes or "chalet" in notes or "mudarse" in notes:
        custom_reference = "Sé que buscabas una tipología amplia (100-140 m²) con plan de pago cómodo para residencia o uso propio."
    elif "renta" in notes or "alquiler" in notes:
        custom_reference = "Sé que tu prioridad era maximizar la rentabilidad neta por alquiler libre de impuestos."

    message = f"""Hola {first_name},

Te escribo directamente porque en febrero estuviste evaluando opciones de inversión en Dubai con nosotros. {custom_reference}

Sé que con las noticias e incertidumbre que hubo en la región en ese momento todo se puso en pausa. Te contacto con una gran noticia: **estaremos presentando en Madrid nuestro evento presencial exclusivo DUBAI PROPERTY EXPO**.

📅 **Cuándo:** 9 y 10 de Septiembre (de 10:00 AM a 8:00 PM)
📍 **Dónde:** Hotel Novotel Madrid Center (4 estrellas)

Estaremos con el equipo internacional y representantes directos de las principales desarrolladoras de Dubai. Tendremos beneficios exclusivos **únicamente para los asistentes al evento**:
• 🛂 **Golden Visa de 10 Años 100% GRATIS**
• 🏷️ **Descuentos exclusivos del 15% al 20%**
• 🏠 **Gestión de alquiler (Property Management) GRATIS**
• Planes de pago directos desde 1% mensual sin intereses

La entrada es **100% gratuita**, pero el aforo en el salón VIP del Novotel es limitado.

¿Te gustaría asistir? Solo confírmame por aquí para anotarte en la lista de invitados VIP y reservarte el acceso.

*(Te adjunto la invitación oficial en imagen)* ⬇️"""

    return message.strip()

SPAIN_LEADS_DATA = load_spain_leads()

CAMPAIGN_PROGRESS = {
    "status": "idle",
    "total": len(SPAIN_LEADS_DATA),
    "sent_count": 0,
    "failed_count": 0,
    "current_lead": None,
    "last_error": None
}

async def dispatch_spain_event_campaign():
    """
    Dispatches the Madrid Expo invitation with image attached
    to all Spain leads with human-like delays (60-180 seconds) to prevent bans.
    """
    global CAMPAIGN_PROGRESS
    CAMPAIGN_PROGRESS["status"] = "running"
    CAMPAIGN_PROGRESS["sent_count"] = 0
    CAMPAIGN_PROGRESS["failed_count"] = 0
    
    leads = load_spain_leads()
    print(f"[Spain Campaign] Starting sequence for {len(leads)} leads...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, lead in enumerate(leads):
            phone = lead.get("phone", "")
            name = lead.get("name", "Inversor")
            CAMPAIGN_PROGRESS["current_lead"] = f"{name} ({phone})"
            
            message_text = build_madrid_expo_invitation(lead)
            
            payload = {
                "to": phone,
                "message": message_text,
                "image_path": MADRID_FLYER_PATH if os.path.exists(MADRID_FLYER_PATH) else None
            }
            
            try:
                r = await client.post(f"{GATEWAY_URL}/send", json=payload)
                data = r.json()
                if data.get("success"):
                    CAMPAIGN_PROGRESS["sent_count"] += 1
                    print(f"[{idx+1}/{len(leads)}] ✅ Madrid Expo invite sent to {name} ({phone})")
                else:
                    CAMPAIGN_PROGRESS["failed_count"] += 1
                    print(f"[{idx+1}/{len(leads)}] ⚠️ Failed to send to {name} ({phone}): {data.get('error')}")
            except Exception as e:
                CAMPAIGN_PROGRESS["failed_count"] += 1
                CAMPAIGN_PROGRESS["last_error"] = str(e)
                print(f"[{idx+1}/{len(leads)}] ❌ Network error for {name}: {e}")
            
            # Anti-ban pause: wait 60 to 150 seconds between messages
            if idx < len(leads) - 1:
                delay = random.randint(60, 150)
                print(f"[Anti-Ban Safety] Pausing {delay}s before next send...")
                await asyncio.sleep(delay)
                
    CAMPAIGN_PROGRESS["status"] = "completed"
    print("[Spain Campaign] Sequence completed!")
