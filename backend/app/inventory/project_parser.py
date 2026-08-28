"""
Developer Project Ingestion & Parser via Gemini AI
Extracts real estate project information from WhatsApp messages, launch announcements, and developer updates.
"""
import os
import json
import httpx
from typing import Dict, Any, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

DEVELOPER_KEYWORDS = [
    "emaar", "damac", "binghatti", "sobha", "danube", "samana", "ellington",
    "nakheel", "meraas", "omniyat", "aldar", "azizi", "select group",
    "launch", "handover", "payment plan", "aed", "starting from", "roi",
    "downpayment", "off-plan", "residences", "tower", "villa", "penthouse",
    "dld", "escrow", "golden visa"
]

def is_developer_or_launch_message(text: str, is_group: bool = False) -> bool:
    """Check if incoming message looks like a developer launch or project update."""
    if not text:
        return False
    lower_text = text.lower()
    matches = sum(1 for kw in DEVELOPER_KEYWORDS if kw in lower_text)
    # If from a group and has 2+ keywords, or if direct message with 3+ keywords
    return matches >= (2 if is_group else 3)


async def parse_project_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Uses Gemini to extract structured project data from a raw WhatsApp update or brochure text.
    Returns 100% extracted real facts, never invented metrics.
    """
    if not GEMINI_API_KEY or not text:
        return None

    prompt = f"""You are a specialized Real Estate Data Ingestion Engine for Dubai properties.

Analyze this raw developer update/announcement received on WhatsApp:
\"\"\"{text}\"\"\"

Extract ONLY the real information present in the message. Do NOT invent missing details.
If a field is not mentioned, return null.

Respond ONLY with valid JSON using this exact structure:
{{
  "is_real_estate_launch": true | false,
  "project_name": "Name of the project or null",
  "developer": "Developer name or null",
  "location": "Community / Area in Dubai or null",
  "starting_price_aed": number or null,
  "starting_price_usd": number or null,
  "payment_plan": "e.g. 70/30, 1% monthly or null",
  "handover_date": "e.g. Q4 2027 or null",
  "project_type": "e.g. Luxury Waterfront Apartments, Sky Mansions, Villas or null",
  "projected_yield_percent": number or null,
  "key_amenities": ["amenity 1", "amenity 2"],
  "golden_visa_eligible": true | false,
  "short_summary": "1-2 sentence executive overview of this launch"
}}"""

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15.0
            )
            data = res.json()
            raw_content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            clean_json = raw_content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_json)
            
            if parsed.get("is_real_estate_launch"):
                return parsed
            return None
    except Exception as e:
        print(f"[Project Parser] Extraction error: {e}")
        return None
