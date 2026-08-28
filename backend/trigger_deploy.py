import httpx

headers = {
    "Authorization": "Bearer rnd_qPPyQH4ZQESrKB9V2ifnyAqAdQjx",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

r = httpx.post(
    "https://api.render.com/v1/services/srv-da8ac1vavr4c73etmdn0/deploys",
    json={"clearCache": "do_not_clear"},
    headers=headers
)
print("Status:", r.status_code)
print("Response:", r.text[:300])
