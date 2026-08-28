import os
import asyncio
import httpx
import random
from typing import List, Dict, Any

CORRECT_MIAMI_LEADS = [
    {"name": "Mariano Bianchi", "phone": "+13053035578", "email": "marianobianchi2000@yahoo.com.ar"},
    {"name": "Rose Paiz", "phone": "+19546694382", "email": "rosmerypaiz@gmail.com"},
    {"name": "Gustavo Gomez", "phone": "+13055067481", "email": "gustavogomez21@hotmail.com"},
    {"name": "Andrew", "phone": "+61982068452", "email": "Opiummkt@gmail.com"},
    {"name": "Sandra Liliana Ortiz", "phone": "+17868353535", "email": "Salorb11@hotmail.com"},
    {"name": "Gustavo", "phone": "+59897384000", "email": "gustavo@sellanes.com.uy"},
    {"name": "Gerardo Y Helen", "phone": "+17864386761", "email": "ltrinvestments@yahoo.com"},
    {"name": "Adriana", "phone": "+584125574078", "email": "adriana.escalona.ae@gmail.com"},
    {"name": "L&L Seguros Internacionales", "phone": "+17542522729", "email": "lilianadeluzon@gmail.com"},
    {"name": "Nicolas Fernandez", "phone": "+19545548070", "email": "nicolasmiami@hotmail.com"},
    {"name": "Dario Perdomo", "phone": "+17864615044", "email": "darioperdomo1942@gmail.com"},
    {"name": "Mayerlyn Bencosme", "phone": "+16163500597", "email": "mayerlynb@gmail.com"},
    {"name": "Zahati", "phone": "+50499929008", "email": "zamira_handal@yahoo.com"},
    {"name": "Luxe Apartment", "phone": "+593984110628", "email": "Villacanpanora@gmail.com"},
    {"name": "Natalia Camba", "phone": "+13059707863", "email": "natalia_camba@hotmail.com"},
    {"name": "Arianne Bernal", "phone": "+17862602088", "email": "ariberc@yahoo.com"}
]

MIAMI_EVENT_LEADS = CORRECT_MIAMI_LEADS

def build_miami_message(name: str) -> str:
    # Determine appropriate name greeting
    raw = name.strip()
    if raw.lower().startswith("l&l") or raw.lower().startswith("luxe"):
        greeting = raw
    elif " " in raw and not " y " in raw.lower():
        greeting = raw.split()[0]
    else:
        greeting = raw

    return (
        f"Hola {greeting}\n"
        f"Le escribo porque se registro para asistir a nuestro evento sobre inversiones inmobiliarias en Dubai que estaremos presentando en Miami, el domingo 29 de agosto en el Hilton Garden en Miramar, desde las 10 am hasta las 8 pm, no pierda la opurtunidad de asesorarse con nuestro equipo internacional de expertos, es completamnete gratis, solo debe confirmarme su asistencia para ponerle en la lista\n\n"
        f"Saludos"
    )

CAMPAIGN_PROGRESS = {
    "is_running": False,
    "total": len(MIAMI_EVENT_LEADS),
    "sent_count": 0,
    "delivered": [],
    "last_updated": None
}

async def dispatch_miami_event_campaign(
    gateway_url: str = "http://localhost:3001",
    image_rel_path: str = "uploads/dubai_miami_event.jpg"
) -> List[Dict[str, Any]]:
    global CAMPAIGN_PROGRESS
    CAMPAIGN_PROGRESS["is_running"] = True
    CAMPAIGN_PROGRESS["sent_count"] = 0
    CAMPAIGN_PROGRESS["delivered"] = []
    
    for idx, lead in enumerate(MIAMI_EVENT_LEADS, 1):
        personalized_text = build_miami_message(lead["name"])
        payload = {
            "to": lead["phone"],
            "message": personalized_text
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
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
                CAMPAIGN_PROGRESS["delivered"].append(status_entry)
                CAMPAIGN_PROGRESS["sent_count"] += 1
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
            CAMPAIGN_PROGRESS["delivered"].append(err_entry)
            print(f"[{idx}/{len(MIAMI_EVENT_LEADS)}] ❌ Error sending to {lead['name']}: {e}")

        # Humanized anti-ban pause between messages (3 to 6 seconds)
        if idx < len(MIAMI_EVENT_LEADS):
            await asyncio.sleep(4)

    CAMPAIGN_PROGRESS["is_running"] = False
    return CAMPAIGN_PROGRESS["delivered"]

def get_miami_campaign_status():
    return CAMPAIGN_PROGRESS
