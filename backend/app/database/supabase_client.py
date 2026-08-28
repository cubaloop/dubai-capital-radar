"""
Dubai Capital Intelligence Engine - Database Layer
Supabase integration for persistent lead storage and campaign management
"""
import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Optional[Client] = None

def get_db() -> Optional[Client]:
    """Returns the Supabase client, or None if not configured."""
    global _client
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


# ─── Lead Schema ─────────────────────────────────────────────────────────────
# Table: leads
# id: uuid (auto)
# name: text
# phone: text (unique)
# email: text
# country: text  (es, us, mx, ar, ve, uy, co...)
# campaign: text  (campaign name/slug)
# score: int (1-10)
# status: text  (cold, warm, hot, closed, unresponsive)
# language: text (es, en, pt)
# notes: text
# whatsapp_verified: bool
# last_contacted_at: timestamp
# created_at: timestamp (auto)
# ─────────────────────────────────────────────────────────────────────────────

async def upsert_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or update a lead by phone number."""
    db = get_db()
    if not db:
        return {"error": "Database not configured"}
    
    result = db.table("leads").upsert(lead, on_conflict="phone").execute()
    return result.data[0] if result.data else {}

async def get_leads_by_campaign(campaign: str) -> List[Dict[str, Any]]:
    """Get all leads for a specific campaign."""
    db = get_db()
    if not db:
        return []
    result = db.table("leads").select("*").eq("campaign", campaign).order("score", desc=True).execute()
    return result.data or []

async def get_leads_by_country(country: str) -> List[Dict[str, Any]]:
    """Get all leads for a specific country code."""
    db = get_db()
    if not db:
        return []
    result = db.table("leads").select("*").eq("country", country).execute()
    return result.data or []

async def get_hot_leads(min_score: int = 7) -> List[Dict[str, Any]]:
    """Get leads with score >= min_score ordered by score desc."""
    db = get_db()
    if not db:
        return []
    result = db.table("leads").select("*").gte("score", min_score).order("score", desc=True).execute()
    return result.data or []

async def update_lead_status(phone: str, status: str) -> bool:
    """Update lead status after contact."""
    db = get_db()
    if not db:
        return False
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    result = db.table("leads").update({"status": status}).eq("phone", clean_phone).execute()
    return bool(result.data)

async def get_campaign_summary() -> List[Dict[str, Any]]:
    """Get count of leads per campaign."""
    db = get_db()
    if not db:
        return []
    # Raw query for grouping
    result = db.rpc("campaign_summary").execute()
    return result.data or []

async def bulk_insert_leads(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Insert a batch of leads, skipping duplicates by phone."""
    db = get_db()
    if not db:
        return {"error": "Database not configured", "inserted": 0}
    
    inserted = 0
    skipped = 0
    errors = []
    
    for lead in leads:
        try:
            # Clean phone number
            if "phone" in lead:
                lead["phone"] = lead["phone"].replace("+", "").replace(" ", "").replace("-", "")
            result = db.table("leads").upsert(lead, on_conflict="phone").execute()
            if result.data:
                inserted += 1
        except Exception as e:
            errors.append({"lead": lead.get("name", "?"), "error": str(e)})
            skipped += 1
    
    return {
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors
    }
