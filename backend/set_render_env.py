import httpx
import json
import time

RENDER_API_KEY = "rnd_qPPyQH4ZQESrKB9V2ifnyAqAdQjx"
SERVICE_ID = "srv-da8ac1vavr4c73etmdn0"

SUPABASE_URL = "https://jyrqzjctkmzdvmraqrcv.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cnF6amN0a216ZHZtcmFxcmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI4MTU3NCwiZXhwIjoyMTAxODU3NTc0fQ.jpzy38i_JqhKiLZwNFXESJo62kk4vWvwCVPLpFIyLjc"

env_vars = [
    {"key": "SUPABASE_URL",          "value": SUPABASE_URL},
    {"key": "SUPABASE_SERVICE_KEY",  "value": SUPABASE_SERVICE_KEY},
    {"key": "SELF_URL",              "value": "https://dubai-miami-radar.onrender.com"},
]

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

print("Setting environment variables on Render...")

for var in env_vars:
    r = httpx.put(
        f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars/{var['key']}",
        json={"value": var["value"]},
        headers=headers
    )
    print(f"  {var['key']}: HTTP {r.status_code}")

# Now trigger a fresh deploy
print("\nTriggering redeploy with new environment variables...")
r = httpx.post(
    f"https://api.render.com/v1/services/{SERVICE_ID}/deploys",
    json={"clearCache": "do_not_clear"},
    headers=headers
)
deploy_data = r.json()
print(f"Deploy triggered: {r.status_code}")
if r.status_code == 201:
    deploy_id = deploy_data.get("id", "unknown")
    print(f"Deploy ID: {deploy_id}")
    print(f"Status: {deploy_data.get('status', 'unknown')}")
else:
    print(f"Response: {deploy_data}")
