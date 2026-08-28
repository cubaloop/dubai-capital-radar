"""
Real Intent Radar v2.0 — El Broker Invisible
Monitors Reddit, Google Alerts, and Twitter/X for investment intent signals
in Spanish, English, and Portuguese from Spain, LatAm, and USA markets.
"""
import httpx
import os
import asyncio
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

REDDIT_CLIENT_ID     = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_SECRET", "")
REDDIT_USER_AGENT    = "DubaiInvestmentRadar/2.0 by YourBrokerApp"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ─── Intent Keywords (high-value signals for Dubai RE investment) ─────────────
INTENT_KEYWORDS_ES = [
    # Spain - tax & relocation signals
    "harto de hacienda", "impuesto grandes fortunas", "golden visa dubai",
    "invertir en dubai", "comprar piso en dubai", "residencia fiscal dubai",
    "0% impuestos dubai", "visa dorada emiratos",
    # LatAm - capital protection signals  
    "dolarizar mis ahorros", "proteger mi capital", "inversión en dólares",
    "salir del peso", "invertir fuera de argentina", "invertir fuera de mexico",
    "cepo cambiario inversión", "crisis inflación invertir",
    "donde invierto mis ahorros", "diversificar patrimonio",
    # General real estate intent
    "propiedades en dubai", "bienes raices dubai", "rentabilidad dubai",
    "roi dubai", "piso off-plan dubai", "inversor extranjero dubai"
]

INTENT_KEYWORDS_EN = [
    "dubai real estate investment", "buy property dubai", "dubai 0 tax",
    "dubai golden visa investor", "invest dubai", "dubai off-plan",
    "where to invest 2025", "tax free investment", "real estate roi dubai",
    "dubai property roi", "move to dubai taxes"
]

# ─── Subreddits to monitor ────────────────────────────────────────────────────
TARGET_SUBREDDITS = [
    # Spanish-speaking investment communities
    "r/finanzaspersonales", "r/SpainFinance", "r/espana", "r/argentina",
    "r/vzla", "r/mexico", "r/Colombia", "r/Latinoamerica",
    # English-speaking expat & investment communities
    "r/expats", "r/financialindependence", "r/dubai", "r/DubaiExpats",
    "r/RealEstate", "r/investing", "r/ExpatFIRE"
]


class IntentRadar:
    """
    Real-time social listening radar for Dubai Real Estate investment intent.
    Finds people expressing investment intent BEFORE they ever contact an agent.
    """

    def __init__(self):
        self._reddit_token: Optional[str] = None
        self._reddit_token_expires: float = 0.0

    async def _get_reddit_token(self) -> Optional[str]:
        """Fetches Reddit OAuth2 token using app credentials."""
        if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
            return None
        
        now = datetime.now(timezone.utc).timestamp()
        if self._reddit_token and now < self._reddit_token_expires - 60:
            return self._reddit_token
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://www.reddit.com/api/v1/access_token",
                    data={"grant_type": "client_credentials"},
                    auth=(REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET),
                    headers={"User-Agent": REDDIT_USER_AGENT},
                    timeout=10.0
                )
                data = res.json()
                self._reddit_token = data.get("access_token")
                self._reddit_token_expires = now + data.get("expires_in", 3600)
                return self._reddit_token
        except Exception as e:
            print(f"[Radar] Reddit auth failed: {e}")
            return None

    async def scan_reddit(self, subreddit: str, keywords: List[str], limit: int = 25) -> List[Dict[str, Any]]:
        """Scan a subreddit for posts/comments matching investment intent keywords."""
        token = await self._get_reddit_token()
        if not token:
            print(f"[Radar] Reddit not configured - skipping {subreddit}")
            return []
        
        results = []
        headers = {
            "Authorization": f"bearer {token}",
            "User-Agent": REDDIT_USER_AGENT
        }
        
        sub_name = subreddit.replace("r/", "")
        
        try:
            async with httpx.AsyncClient() as client:
                # Search recent posts
                res = await client.get(
                    f"https://oauth.reddit.com/r/{sub_name}/new",
                    params={"limit": limit},
                    headers=headers,
                    timeout=10.0
                )
                
                if res.status_code != 200:
                    return []
                
                posts = res.json().get("data", {}).get("children", [])
                
                for post in posts:
                    data = post.get("data", {})
                    title = (data.get("title", "") or "").lower()
                    body  = (data.get("selftext", "") or "").lower()
                    combined = f"{title} {body}"
                    
                    matched_keywords = [kw for kw in keywords if kw.lower() in combined]
                    
                    if matched_keywords:
                        score = min(100, len(matched_keywords) * 20 + 30)
                        results.append({
                            "platform": "reddit",
                            "source_url": f"https://reddit.com{data.get('permalink', '')}",
                            "author": data.get("author", "[deleted]"),
                            "content": f"{data.get('title', '')} | {data.get('selftext', '')[:300]}",
                            "score": score,
                            "country": self._infer_country_from_sub(sub_name),
                            "language": self._infer_language(combined),
                            "matched_keywords": matched_keywords,
                            "subreddit": sub_name,
                            "detected_at": datetime.now(timezone.utc).isoformat()
                        })
        except Exception as e:
            print(f"[Radar] Error scanning r/{sub_name}: {e}")
        
        return results

    def _infer_country_from_sub(self, subreddit: str) -> str:
        mapping = {
            "espana": "es", "spainfinance": "es",
            "argentina": "ar", "vzla": "ve", "mexico": "mx",
            "colombia": "co", "latinoamerica": "latam",
            "dubai": "ae", "dubaiexpats": "ae",
            "financialindependence": "us", "expats": "intl"
        }
        return mapping.get(subreddit.lower(), "unknown")

    def _infer_language(self, text: str) -> str:
        es_markers = ["que", "con", "para", "por", "como", "pero", "inverti", "dinero", "pesos"]
        pt_markers = ["para", "com", "que", "mas", "dinheiro", "investir"]
        es_count = sum(1 for m in es_markers if f" {m} " in text)
        pt_count = sum(1 for m in pt_markers if f" {m} " in text)
        if es_count > 2:
            return "es"
        if pt_count > 2:
            return "pt"
        return "en"

    async def score_signal_with_ai(self, signal: Dict[str, Any]) -> int:
        """Use Gemini to score investment intent quality (0-100)."""
        if not GEMINI_API_KEY:
            return signal.get("score", 50)
        
        try:
            prompt = f"""You are an expert in Dubai real estate investment lead qualification.

Analyze this social media post and rate the investment intent for Dubai real estate on a scale of 0-100.

Post content: "{signal.get('content', '')}"
Platform: {signal.get('platform', '')}
Keywords matched: {', '.join(signal.get('matched_keywords', []))}

Scoring guide:
- 0-20: No real investment intent, just casual mention
- 21-40: Some interest but vague or passive
- 41-60: Clear interest, doing research
- 61-80: Active intent, has capital, looking for options
- 81-100: Ready to invest, explicit intent, high urgency

Respond with ONLY a number between 0 and 100."""

            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    timeout=10.0
                )
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                return min(100, max(0, int(text)))
        except Exception:
            return signal.get("score", 50)

    async def run_full_scan(self) -> List[Dict[str, Any]]:
        """
        Run a complete radar scan across all platforms and subreddits.
        Returns a list of deduplicated, scored signals.
        """
        print(f"[Radar] Starting full scan at {datetime.now().strftime('%H:%M:%S')}")
        all_signals = []
        
        # Scan all target subreddits
        tasks = []
        for subreddit in TARGET_SUBREDDITS:
            all_keywords = INTENT_KEYWORDS_ES + INTENT_KEYWORDS_EN
            tasks.append(self.scan_reddit(subreddit, all_keywords))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_signals.extend(result)
        
        # Deduplicate by URL
        seen_urls = set()
        unique_signals = []
        for sig in all_signals:
            url = sig.get("source_url", "")
            if url not in seen_urls:
                seen_urls.add(url)
                unique_signals.append(sig)
        
        # Score with AI (top 10 signals only to save quota)
        top_signals = sorted(unique_signals, key=lambda s: s.get("score", 0), reverse=True)[:10]
        
        for sig in top_signals:
            sig["ai_score"] = await self.score_signal_with_ai(sig)
        
        print(f"[Radar] Scan complete: {len(unique_signals)} signals found, {len(top_signals)} scored by AI")
        return sorted(unique_signals, key=lambda s: s.get("ai_score", s.get("score", 0)), reverse=True)


# Global radar instance
intent_radar = IntentRadar()
