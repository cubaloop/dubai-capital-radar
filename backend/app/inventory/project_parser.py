"""
Developer Project Ingestion & Parser via Gemini AI
Extracts real estate project information from WhatsApp messages, launch announcements, and developer updates.
"""
import os
import json
import httpx
from typing import Dict, Any, Optional

def get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()

def get_gemini_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

DEVELOPER_KEYWORDS = [
    "emaar", "damac", "binghatti", "sobha", "danube", "samana", "ellington",
    "nakheel", "meraas", "omniyat", "aldar", "azizi", "select group",
    "launch", "handover", "payment plan", "aed", "starting from", "roi",
    "downpayment", "off-plan", "residences", "tower", "villa", "penthouse",
    "dld", "escrow", "golden visa", "lanzamiento", "inversión", "inversion"
]

def is_developer_or_launch_message(text: str, is_group: bool = False) -> bool:
    """Check if incoming message looks like a developer launch or project update."""
    if not text:
        return False
    lower_text = text.lower()
    matches = sum(1 for kw in DEVELOPER_KEYWORDS if kw in lower_text)
    return matches >= (2 if is_group else 2)


async def parse_project_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts structured project data from a raw WhatsApp update or brochure text.
    Uses Groq as primary ultra-fast engine, with Gemini fallback.
    """
    if not text:
        return None

    groq_key = get_groq_key()
    gemini_key = get_gemini_key()

    prompt = f"""You are a specialized Real Estate Data Ingestion Engine for Dubai properties.

Analyze this raw developer update/announcement received on WhatsApp:
\"\"\"{text}\"\"\"

Extract ONLY the real information present in the message. Do NOT invent missing details.
If a field is not mentioned, return null.

Respond ONLY with valid JSON using this exact structure:
{{
  "is_real_estate_launch": true,
  "project_name": "Name of the project or null",
  "developer": "Developer name or null",
  "location": "Community / Area in Dubai or null",
  "starting_price_aed": 1500000,
  "starting_price_usd": 408000,
  "payment_plan": "e.g. 70/30, 1% monthly or null",
  "handover_date": "e.g. Q4 2027 or null",
  "project_type": "e.g. Luxury Waterfront Apartments, Sky Mansions, Villas or null",
  "projected_yield_percent": 8.5,
  "key_amenities": ["amenity 1", "amenity 2"],
  "golden_visa_eligible": true,
  "short_summary": "1-2 sentence executive overview of this launch"
}}"""

    # 1. Groq Engine (Ultra-Fast)
    if groq_key:
        groq_models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
        for m in groq_models:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    payload = {
                        "model": m,
                        "messages": [
                            {"role": "system", "content": "You are a real estate JSON extraction parser. Output only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 1000
                    }
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json=payload,
                        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                    )
                    if res.status_code == 200:
                        raw = res.json()["choices"][0]["message"]["content"].strip()
                        raw = raw.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(raw)
                        if parsed.get("is_real_estate_launch"):
                            return parsed
            except Exception as e:
                print(f"[Project Parser] Groq error on {m}: {e}")
                continue

    # 2. Gemini Engine (Fallback)
    if gemini_key:
        for model in ["gemini-1.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    res = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}",
                        json={"contents": [{"parts": [{"text": prompt}]}]}
                    )
                    if res.status_code == 200:
                        raw = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                        raw = raw.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(raw)
                        if parsed.get("is_real_estate_launch"):
                            return parsed
            except Exception as e:
                print(f"[Project Parser] Gemini error on {model}: {e}")
                continue

    return None
