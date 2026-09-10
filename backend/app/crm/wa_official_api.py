import httpx
from typing import Dict, Any, Tuple
from ..database.crm_db import get_agency_by_id

class WaOfficialAPIClient:
    def __init__(self):
        pass

    async def send_message(self, to_phone: str, message: str, api_key: str, phone_number_id: str) -> Dict[str, Any]:
        """
        Sends a message using Meta's official WhatsApp Business Cloud API.
        """
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Format the phone number (must omit leading zeros or + signs for Meta API usually, but keep country code)
        clean_phone = "".join(c for c in to_phone if c.isdigit())
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200:
                    message_id = data.get("messages", [{}])[0].get("id")
                    return {"success": True, "message_id": message_id, "error": None}
                else:
                    return {"success": False, "message_id": None, "error": data.get("error", {}).get("message", "Unknown Meta API error")}
        except Exception as e:
            return {"success": False, "message_id": None, "error": str(e)}

def get_wa_sender(agency_id: str) -> str:
    """Returns 'baileys' or 'official_api' based on agency config"""
    if not agency_id:
        return 'baileys'
    agency = get_agency_by_id(agency_id)
    if agency:
        return agency.get('whatsapp_mode', 'baileys')
    return 'baileys'
