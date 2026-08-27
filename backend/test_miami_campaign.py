import sys
import os

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.outreach.miami_event_campaign import MIAMI_EVENT_LEADS, build_miami_message

print(f"Total Leads: {len(MIAMI_EVENT_LEADS)}")
for i, lead in enumerate(MIAMI_EVENT_LEADS, 1):
    print(f"\n--- Lead {i}: {lead['name']} ({lead['phone']}) ---")
    print(build_miami_message(lead["name"]))

image_path = os.path.join(os.getcwd(), "whatsapp-gateway", "uploads", "dubai_miami_event.jpg")
print(f"\nImage exists: {os.path.exists(image_path)} -> {image_path}")
