import os
import asyncio
import httpx
import random
from typing import List, Dict, Any

MIAMI_EVENT_LEADS = [
    {"name": "Rose", "phone": "+17863702588", "email": "rrossiter@me.com"},
    {"name": "Dayron", "phone": "+17865239922", "email": "dg_1988@live.com"},
    {"name": "Andrew", "phone": "+61402800687", "email": "Dgumaer@gmail.com"},
    {"name": "Sandra", "phone": "+17863740263", "email": "Salior11@gmail.com"},
    {"name": "Dayana", "phone": "+17864746761", "email": "dayanadiaz1@icloud.com"},
    {"name": "Yenis", "phone": "+17863004761", "email": "intrawestinvestments@gmail.com"},
    {"name": "Jenny", "phone": "+17862234057", "email": "jennyhernandez17@yahoo.com"},
    {"name": "LAL Segovia", "phone": "+17864252729", "email": "lalsegoviainversiones@gmail.com"},
    {"name": "Maryelin", "phone": "+17864536070", "email": "maryelinsanzone@gmail.com"},
    {"name": "Jose", "phone": "+17864860088", "email": "josecabrera53@gmail.com"},
    {"name": "Lucia", "phone": "+50068411925", "email": "Villalobosluciagarcia@gmail.com"},
    {"name": "Nardin", "phone": "+17863267563", "email": "Natali_carrero@gmail.com"},
    {"name": "Jesus", "phone": "+17863677464", "email": "jesus1camilo@gmail.com"}
]

def build_miami_message(name: str) -> str:
    # Use first name for clean personal greeting
    first_name = name.split()[0] if name else "Estimado/a"
    return (
        f"Hola {first_name}\n"
        f"Le escribo porque se registro para asistir a nuestro evento sobre inversiones inmobiliarias en Dubai que estaremos presentando en Miami, el domingo 29 de agosto en el Hilton Garden en Miramar, desde las 10 am hasta las 8 pm, no pierda la opurtunidad de asesorarse con nuestro equipo internacional de expertos, es completamnete gratis, solo debe confirmarme su asistencia para ponerle en la lista\n\n"
        f"Saludos"
    )

async def dispatch_miami_event_campaign(
    gateway_url: str = "http://localhost:3001",
    image_rel_path: str = "uploads/dubai_miami_event.jpg"
) -> List[Dict[str, Any]]:
    """
    Sequentially delivers the personalized Miami Dubai Real Estate Event invitation
    with attached flyer image and anti-ban randomized spacing to all 13 registered leads.
    """
    results = []
    
    # Path resolution for local or Docker execution
    possible_paths = [
        os.path.join(os.getcwd(), "whatsapp-gateway", "uploads", "dubai_miami_event.jpg"),
        os.path.join(os.getcwd(), "backend", "app", "static", "dubai_miami_event.jpg"),
        os.path.join(os.getcwd(), "uploads", "dubai_miami_event.jpg"),
        "/app/whatsapp-gateway/uploads/dubai_miami_event.jpg",
        "/app/backend/app/static/dubai_miami_event.jpg"
    ]
    
    selected_image_path = None
    for p in possible_paths:
        if os.path.exists(p):
            selected_image_path = p
            break

    print(f"🚀 [MIAMI EVENT CAMPAIGN] Starting delivery to {len(MIAMI_EVENT_LEADS)} leads...")
    print(f"🖼️ Attached flyer: {selected_image_path}")

    for idx, lead in enumerate(MIAMI_EVENT_LEADS, 1):
        personalized_text = build_miami_message(lead["name"])
        payload = {
            "to": lead["phone"],
            "message": personalized_text
        }
        if selected_image_path:
            payload["image_path"] = selected_image_path

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{gateway_url}/send", json=payload)
                resp_data = res.json()
                status_entry = {
                    "lead_index": idx,
                    "name": lead["name"],
                    "phone": lead["phone"],
                    "email": lead["email"],
                    "status": "DELIVERED" if resp_data.get("success") else "FAILED",
                    "response": resp_data
                }
                results.append(status_entry)
                print(f"[{idx}/{len(MIAMI_EVENT_LEADS)}] 📨 {lead['name']} ({lead['phone']}) -> {status_entry['status']}")

        except Exception as e:
            err_entry = {
                "lead_index": idx,
                "name": lead["name"],
                "phone": lead["phone"],
                "email": lead["email"],
                "status": "ERROR",
                "error": str(e)
            }
            results.append(err_entry)
            print(f"[{idx}/{len(MIAMI_EVENT_LEADS)}] ❌ Error sending to {lead['name']}: {e}")

        # Humanized anti-ban pause between messages (15 to 35 seconds)
        if idx < len(MIAMI_EVENT_LEADS):
            delay = random.randint(15, 30)
            print(f"⏳ Humanized safety cooldown: waiting {delay}s before next contact...")
            await asyncio.sleep(delay)

    print("🏁 [MIAMI EVENT CAMPAIGN] Finished execution.")
    return results
