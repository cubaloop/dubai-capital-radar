"""
Telegram VIP Real-Time Alert Engine
Sends high-priority notifications to the broker's personal Telegram:
1. Hot prospect replies (booking requests, pricing queries, ready-to-buy signals).
2. Developer launch updates ingested from WhatsApp.
3. Daily organic social pack ready to publish.
"""
import os
import httpx
from typing import Dict, Any, Optional

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8894250531:AAEFADqcJEmnFNz9Y9rUXnb12hTktl2OrQ8")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

async def send_telegram_alert(message: str, parse_mode: str = "HTML") -> bool:
    """Sends a formatted message to the broker via Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram Alert] Token or Chat ID not configured.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": parse_mode,
        "disable_web_page_preview": False
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=10.0)
            data = res.json()
            if data.get("ok"):
                print("[Telegram Alert] ✅ Notification delivered successfully.")
                return True
            else:
                print(f"[Telegram Alert] Error: {data.get('description')}")
                return False
    except Exception as e:
        print(f"[Telegram Alert] Network error: {e}")
        return False


async def notify_hot_prospect_reply(lead_name: str, lead_phone: str, message: str, intent: str, country: str = "España"):
    """Alerts the broker when a lead sends an important reply."""
    flag = "🇪🇸" if "es" in country.lower() or "españa" in country.lower() else "🇺🇸" if "us" in country.lower() or "usa" in country.lower() else "🌎"
    
    text = f"""🔥 <b>¡HOT LEAD DETECTADO EN WHATSAPP!</b> {flag}

👤 <b>Cliente:</b> {lead_name}
📱 <b>Teléfono:</b> <code>{lead_phone}</code>
🎯 <b>Intención:</b> <code>{intent.upper()}</code>
🌍 <b>Mercado:</b> {country}

💬 <b>Mensaje recibido:</b>
<i>"{message}"</i>

⚡ <i>Abre WhatsApp para atender la llamada o responder de inmediato.</i>
<a href="https://wa.me/{lead_phone.replace('+', '').replace(' ', '')}">📲 Abrir Chat Directo</a>"""

    return await send_telegram_alert(text)


async def notify_developer_launch(project_name: str, developer: str, price_aed: Optional[float], payment_plan: Optional[str]):
    """Alerts the broker when a new developer project is ingested from WhatsApp."""
    price_eur_approx = f"~{(price_aed / 4.0 / 1000):.0f}k €" if price_aed else "Por confirmar"
    
    text = f"""🏗️ <b>NUEVO PROYECTO DETECTADO EN WHATSAPP</b>

🏢 <b>Proyecto:</b> {project_name}
🏗️ <b>Desarrolladora:</b> {developer}
💰 <b>Precio Entrada:</b> {price_eur_approx} ({price_aed:,.0f} AED)
📅 <b>Plan de Pago:</b> {payment_plan or 'Por confirmar'}

✅ <i>Los datos han sido incorporados automáticamente al cerebro de la IA.</i>"""

    return await send_telegram_alert(text)
