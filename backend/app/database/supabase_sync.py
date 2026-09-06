import os
import json
import asyncio
from typing import Dict, Any, Optional
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyrqzjctkmzdvmraqrcv.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cnF6amN0a216ZHZtcmFxcmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI4MTU3NCwiZXhwIjoyMTAxODU3NTc0fQ.jpzy38i_JqhKiLZwNFXESJo62kk4vWvwCVPLpFIyLjc")

def _get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

async def async_sync_lead_to_supabase(lead_dict: Dict[str, Any]):
    """Background coroutine to persist lead changes to Supabase cloud PostgreSQL."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    lead_id = lead_dict.get("id")
    if not lead_id:
        return

    meta = {
        "campaign_id": lead_dict.get("campaign_id"),
        "whatsapp_status": lead_dict.get("whatsapp_status"),
        "last_sent_type": lead_dict.get("last_sent_type"),
        "last_contact_date": lead_dict.get("last_contact_date"),
        "personalized_message": lead_dict.get("personalized_message"),
        "objective": lead_dict.get("objective"),
        "timeline": lead_dict.get("timeline"),
        "notes": lead_dict.get("notes"),
        "clean_phone": lead_dict.get("clean_phone"),
        "budget_eur": lead_dict.get("budget_eur"),
        "next_reminder_date": lead_dict.get("next_reminder_date")
    }

    payload = {
        "id": lead_id,
        "full_name": lead_dict.get("name") or lead_dict.get("full_name"),
        "phone": lead_dict.get("phone"),
        "email": lead_dict.get("email"),
        "lead_status": lead_dict.get("crm_status", "CREATED"),
        "campaign_name": lead_dict.get("campaign_id"),
        "budget_aed": lead_dict.get("budget_aed"),
        "comments": json.dumps(meta, ensure_ascii=False),
        "last_contact_date": lead_dict.get("last_contact_date") or None
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = _get_headers()
            headers["Prefer"] = "resolution=merge-duplicates"
            await client.post(
                f"{SUPABASE_URL}/rest/v1/leads",
                json=payload,
                headers=headers
            )
    except Exception as e:
        print(f"⚠️ [SUPABASE SYNC ERROR for {lead_id}]: {e}")

def sync_lead_background(lead_dict: Dict[str, Any]):
    """Non-blocking fire-and-forget sync helper."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(async_sync_lead_to_supabase(lead_dict))
        else:
            asyncio.run(async_sync_lead_to_supabase(lead_dict))
    except Exception:
        pass
