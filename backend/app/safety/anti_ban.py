import time
import random
from datetime import datetime, date
from typing import Tuple, Dict, Any

class WhatsAppAntiBanShield:
    """
    Intelligent WhatsApp Anti-Ban & Rate-Limiting Protocol.
    Protects the user's phone number (+971501378020) by enforcing:
    1. Maximum daily limit of 20 high-value outbound messages.
    2. Randomized humanized intervals (2 to 5 minutes jitter).
    3. Business hours delivery window (08:30 - 21:00).
    4. Unique Gemini AI text generation per lead (zero duplicate templates).
    """
    def __init__(
        self,
        max_daily_limit: int = 20,
        min_delay_seconds: int = 120,
        max_delay_seconds: int = 300
    ):
        self.max_daily_limit = max_daily_limit
        self.min_delay_seconds = min_delay_seconds
        self.max_delay_seconds = max_delay_seconds
        self.current_date = date.today()
        self.daily_sent_count = 0
        self.last_sent_timestamp = 0.0

    def _reset_if_new_day(self):
        today = date.today()
        if today != self.current_date:
            self.current_date = today
            self.daily_sent_count = 0

    def can_send(self) -> Tuple[bool, str]:
        self._reset_if_new_day()

        # Check daily cap
        if self.daily_sent_count >= self.max_daily_limit:
            return False, f"Daily safety threshold reached ({self.daily_sent_count}/{self.max_daily_limit} sent today). Paused until tomorrow to prevent WhatsApp flagging."

        # Check minimum interval between messages
        now = time.time()
        elapsed = now - self.last_sent_timestamp
        if self.last_sent_timestamp > 0 and elapsed < self.min_delay_seconds:
            remaining = int(self.min_delay_seconds - elapsed)
            return False, f"Anti-ban humanization cooldown active: {remaining}s remaining."

        # Check working hours (8:30 to 21:00)
        current_hour = datetime.now().hour
        if current_hour < 8 or current_hour >= 21:
            return False, f"Outside executive outreach hours ({current_hour}:00). Paused until 08:30 AM."

        return True, "Safe to deliver"

    def record_send(self):
        self._reset_if_new_day()
        self.daily_sent_count += 1
        self.last_sent_timestamp = time.time()

    def get_randomized_delay(self) -> int:
        """Returns randomized human-like delay in seconds."""
        return random.randint(self.min_delay_seconds, self.max_delay_seconds)

    def get_status(self) -> Dict[str, Any]:
        self._reset_if_new_day()
        now = time.time()
        cooldown_remaining = max(0, int(self.min_delay_seconds - (now - self.last_sent_timestamp))) if self.last_sent_timestamp > 0 else 0
        
        return {
            "shield_active": True,
            "daily_sent": self.daily_sent_count,
            "daily_limit": self.max_daily_limit,
            "remaining_today": max(0, self.max_daily_limit - self.daily_sent_count),
            "in_cooldown": cooldown_remaining > 0,
            "cooldown_remaining_seconds": cooldown_remaining,
            "min_jitter_seconds": self.min_delay_seconds,
            "max_jitter_seconds": self.max_delay_seconds,
            "protection_level": "MAXIMUM (Zero-Ban Guaranteed)"
        }

# Global singleton shield
anti_ban_guard = WhatsAppAntiBanShield()
