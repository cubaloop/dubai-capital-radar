import httpx

SUPABASE_URL = "https://jyrqzjctkmzdvmraqrcv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cnF6amN0a216ZHZtcmFxcmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI4MTU3NCwiZXhwIjoyMTAxODU3NTc0fQ.jpzy38i_JqhKiLZwNFXESJo62kk4vWvwCVPLpFIyLjc"

headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

# 1. Create the storage bucket for WhatsApp auth
print("Creating whatsapp-auth storage bucket...")
r = httpx.post(
    f"{SUPABASE_URL}/storage/v1/bucket",
    json={"id": "whatsapp-auth", "name": "whatsapp-auth", "public": False},
    headers=headers
)
print(f"  Bucket create: {r.status_code} - {r.text[:100]}")

# 2. Create leads table via REST API
print("\nCreating leads table via Supabase management API...")
# This needs to be done via SQL editor in Supabase UI, since REST API doesn't support DDL
# Instead, we'll verify connectivity
r2 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers={
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY
    }
)
print(f"  API connectivity: {r2.status_code}")

# 3. Try inserting a test lead to see if the table exists
print("\nChecking if leads table exists...")
r3 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/leads?select=count",
    headers={
        **headers,
        "Prefer": "count=exact"
    }
)
print(f"  Leads table check: {r3.status_code}")
if r3.status_code == 200:
    print("  SUCCESS! Leads table already exists.")
elif r3.status_code == 404 or "does not exist" in r3.text:
    print("  Leads table does NOT exist yet. Needs to be created via SQL editor.")
else:
    print(f"  Response: {r3.text[:200]}")
