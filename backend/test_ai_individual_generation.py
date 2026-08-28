import os
import json
import httpx
import asyncio

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Load Spain leads
with open("backend/app/outreach/spain_campaign_leads.json", "r", encoding="utf-8") as f:
    leads = json.load(f)

# Event facts (Ground truth, NO hallucinations)
EVENT_FACTS = """
- Evento: DUBAI PROPERTY EXPO EN MADRID
- Fechas: 9 y 10 de Septiembre (10:00 AM - 8:00 PM)
- Lugar: Hotel Novotel Madrid Center (4 estrellas)
- Organizador: H.O.M.E Properties
- Beneficios exclusivos sólo durante el evento:
  * Golden Visa de 10 Años GRATIS con la compra
  * Descuentos del 15% al 20% en unidades seleccionadas
  * Property Management (Gestión de alquiler) 100% GRATIS
  * Planes de pago directos desde 1% mensual sin intereses bancarios
- Entrada: 100% Gratuita pero con aforo limitado (lista VIP)
"""

prompt_template = """Eres un asesor inmobiliario senior de Dubai con trato cercano, elegante y profesional.
Escribe un mensaje de WhatsApp individualizado para este lead específico de España que se enfrió tras las noticias de febrero.

Datos reales del lead:
- Nombre: {name}
- Objetivo: {objective}
- Plazo que tenía en mente: {timeline}
- Notas históricas de conversaciones previas: {notes}

Datos del Evento en Madrid:
{event_facts}

Instrucciones de redacción:
1. Saluda por su nombre de pila de forma natural.
2. Haz referencia sutil y empática a lo que habló en febrero ({notes} si tiene notas, o su objetivo de {objective}) para que sepa que te acuerdas perfectamente de él.
3. Menciona que tras la incertidumbre de febrero la situación está 100% normalizada y con gran dinamismo.
4. Invítalo al DUBAI PROPERTY EXPO en el Novotel Madrid Center (9 y 10 Septiembre).
5. Destaca los beneficios clave que más le interesen a su perfil (precios en Euros y m²).
6. Pídele que te confirme asistencia para anotarle en la lista VIP de invitados.
7. Longitud: 4-5 párrafos breves, formato WhatsApp, tono español natural.

Devuelve ÚNICAMENTE el texto del mensaje."""

async def generate_for_lead(lead):
    prompt = prompt_template.format(
        name=lead["name"],
        objective=lead.get("objective", "Inversión"),
        timeline=lead.get("timeline", "Próximos meses"),
        notes=lead.get("notes") or "Interesado en opciones de inversión en Dubai",
        event_facts=EVENT_FACTS
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
        data = res.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text

async def test_3_diverse_leads():
    # Pick 3 very different leads:
    # 1. Javier (300k flipping)
    # 2. Rafael Redondo (Chalet familiar con esposa y 2 hijos)
    # 3. Fatima Saban (Cash buyer 160k studio)
    sample_leads = [
        l for l in leads if l["name"] in ["Javier", "Rafael Redondo", "Fatlma Saban", "Edison Robalino Freire"]
    ]
    
    print(f"Generating true bespoke AI messages for {len(sample_leads)} test leads...\n")
    for l in sample_leads:
        print(f"==================================================")
        print(f"LEAD: {l['name']} | Tel: {l['phone']}")
        print(f"Notas previas: {l['notes']}")
        print(f"Objetivo: {l['objective']} | Plazo: {l['timeline']}")
        print(f"--------------------------------------------------")
        ai_msg = await generate_for_lead(l)
        print(ai_msg)
        print(f"==================================================\n")

if __name__ == "__main__":
    asyncio.run(test_3_diverse_leads())
