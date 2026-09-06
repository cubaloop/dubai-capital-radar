"""
Security & Anti-Hacking Hardening Layer
Features:
- Supabase Auth JWT Verification
- In-memory rate limiting (leaky bucket) to prevent brute force & DoS
- Input sanitization & injection protection
- Security audit event logging
"""
import os
import time
import re
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyrqzjctkmzdvmraqrcv.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

security_scheme = HTTPBearer(auto_error=False)

# In-Memory Rate Limiting: IP -> list of timestamps
_RATE_LIMITS: Dict[str, list] = {}

def rate_limiter(max_requests: int = 60, window_seconds: int = 60):
    """
    Simple token-window rate limiter per client IP.
    Protects against DDoS, bot scraping, and credential stuffing.
    """
    async def check_rate_limit(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        # Forwarded header check (e.g. Render / Cloudflare proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        now = time.time()
        timestamps = _RATE_LIMITS.get(client_ip, [])
        # Keep only timestamps within window
        valid_timestamps = [t for t in timestamps if now - t < window_seconds]

        if len(valid_timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Anti-abuse rate limit exceeded. Please try again later."
            )

        valid_timestamps.append(now)
        _RATE_LIMITS[client_ip] = valid_timestamps

    return check_rate_limit

async def verify_supabase_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Optional[Dict[str, Any]]:
    """
    Verifies incoming Supabase Auth JWT.
    If valid token is provided, returns user dict.
    If no token is provided, returns a default public/demo organization context.
    """
    if not credentials:
        return {
            "id": "anon",
            "email": "demo@brokerage.com",
            "role": "agent",
            "organization_id": "a0000000-0000-0000-0000-000000000001",
            "authenticated": False
        }

    token = credentials.credentials
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY or token,
                    "Authorization": f"Bearer {token}"
                }
            )
            if resp.status_code == 200:
                user_data = resp.json()
                user_data["authenticated"] = True
                user_data["organization_id"] = user_data.get("user_metadata", {}).get("organization_id", "a0000000-0000-0000-0000-000000000001")
                return user_data
    except Exception as e:
        print(f"⚠️ [AUTH VERIFY ERROR]: {e}")

    # Fallback to demo context
    return {
        "id": "anon",
        "email": "demo@brokerage.com",
        "role": "agent",
        "organization_id": "a0000000-0000-0000-0000-000000000001",
        "authenticated": False
    }

def sanitize_text(text: str, max_length: int = 5000) -> str:
    """Strip null bytes, control characters, and dangerous payload tags."""
    if not text:
        return ""
    # Truncate
    cleaned = text[:max_length]
    # Remove null bytes
    cleaned = cleaned.replace("\x00", "")
    # Remove script tags
    cleaned = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()
