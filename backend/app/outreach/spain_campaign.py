"""
Dubai Property Expo Madrid - VIP Invitation & Reactivation Campaign
Invites the 112 Spain leads to the in-person event at Novotel Madrid Center (Sept 9 & 10).
Uses the direct personalizer without any mention of the Gulf war.
"""
import json
import os
import asyncio
import random
import httpx
from typing import List, Dict, Any
from .spain_personalizer import generate_direct_message

LEADS_FILE = os.path.join(os.path.dirname(__file__), "spain_campaign_leads.json")
GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:3001")
MADRID_FLYER_PATH = "/app/whatsapp-gateway/uploads/dubai_madrid_event.jpg"

def load_spain_leads() -> List[Dict[str, Any]]:
    if not os.path.exists(LEADS_FILE):
        return []
    with open(LEADS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def build_madrid_expo_invitation(lead: Dict[str, Any]) -> str:
    return generate_direct_message(lead)

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
    to all Spain leads with human-like delays (60-150 seconds) to prevent bans.
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
            
            message_text = generate_direct_message(lead)
            
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
