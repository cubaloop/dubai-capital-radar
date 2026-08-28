import httpx

RENDER_API_KEY = "rnd_qPPyQH4ZQESrKB9V2ifnyAqAdQjx"
SERVICE_ID = "srv-da8ac1vavr4c73etmdn0"

TELEGRAM_BOT_TOKEN = "8894250531:AAEFADqcJEmnFNz9Y9rUXnb12hTktl2OrQ8"
TELEGRAM_CHAT_ID = "8484840284"

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

print("Configuring Telegram variables on Render...")

r1 = httpx.put(
    f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars/TELEGRAM_BOT_TOKEN",
    json={"value": TELEGRAM_BOT_TOKEN},
    headers=headers
)
print("TELEGRAM_BOT_TOKEN:", r1.status_code)

r2 = httpx.put(
    f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars/TELEGRAM_CHAT_ID",
    json={"value": TELEGRAM_CHAT_ID},
    headers=headers
)
print("TELEGRAM_CHAT_ID:", r2.status_code)
