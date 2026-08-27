import httpx
import json

url = "https://dubai-miami-radar.onrender.com/api/campaigns/miami-event/leads"
r = httpx.get(url)
leads = r.json().get("leads", [])
print(f"Total leads: {len(leads)}")

# Test sending to the first lead directly via backend /send endpoint
send_url = "https://dubai-miami-radar.onrender.com/api/whatsapp/send"
test_lead = leads[0]
payload = {
    "to": test_lead["phone"],
    "message": test_lead["sample_message"]
}

print(f"\nAttempting send to {test_lead['name']} ({test_lead['phone']})...")
r2 = httpx.post(send_url, json=payload)
print("RESPONSE STATUS:", r2.status_code)
print("RESPONSE BODY:", json.dumps(r2.json(), indent=2))
