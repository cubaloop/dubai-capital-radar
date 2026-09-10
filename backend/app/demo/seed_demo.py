import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ..database.crm_db import create_campaign_with_leads, get_campaign_by_id

DEMO_LEADS = [
    {"name": "Ahmed Al Maktoum", "phone": "+971501234567", "email": "ahmed@example.ae"},
    {"name": "Sofia Garcia", "phone": "+34600123456", "email": "sofia.g@example.es"},
    {"name": "James Smith", "phone": "+447700900123", "email": "james.s@example.co.uk"},
    {"name": "Fatima Zahra", "phone": "+971569876543", "email": "fatima@example.ae"},
    {"name": "Carlos Fernandez", "phone": "+34611223344", "email": "carlos.f@example.es"},
    {"name": "Emma Wilson", "phone": "+447812345678", "email": "emma.w@example.co.uk"},
    {"name": "Mohammed Ali", "phone": "+971552345678", "email": "m.ali@example.ae"},
    {"name": "Maria Rodriguez", "phone": "+34622334455", "email": "maria.r@example.es"},
    {"name": "Oliver Brown", "phone": "+447912345678", "email": "oliver.b@example.co.uk"},
    {"name": "Tariq Saeed", "phone": "+971543456789", "email": "tariq@example.ae"},
    {"name": "Alejandro Martinez", "phone": "+34633445566", "email": "alejandro.m@example.es"},
    {"name": "Charlotte Taylor", "phone": "+447512345678", "email": "charlotte.t@example.co.uk"},
    {"name": "Omar Hassan", "phone": "+971524567890", "email": "omar@example.ae"},
    {"name": "Lucia Sanchez", "phone": "+34644556677", "email": "lucia.s@example.es"},
    {"name": "William Davies", "phone": "+447412345678", "email": "william.d@example.co.uk"}
]

STATUSES = ["CREATED", "CONTACTED", "INTERESTED", "APPOINTMENT", "WON", "LOST"]

def generate_demo_leads() -> List[Dict[str, Any]]:
    leads = []
    now = datetime.now()
    for idx, dl in enumerate(DEMO_LEADS):
        status = random.choice(STATUSES)
        leads.append({
            "id": f"demo_lead_{idx}",
            "name": dl["name"],
            "phone": dl["phone"],
            "email": dl["email"],
            "budget_eur": random.choice([60000, 100000, 250000, 500000]),
            "objective": "Inversión Inmobiliaria" if "346" in dl["phone"] else "Real Estate Investment",
            "crm_status": status,
            "whatsapp_status": "sent" if status != "CREATED" else "pending",
            "personalized_message": f"Hello {dl['name']}, here are some great investment opportunities for you in Dubai.",
            "notes": "Follow up soon." if status in ["CONTACTED", "INTERESTED"] else "",
        })
    return leads

def seed_demo_data() -> bool:
    camp_id = "demo_leads_outpilot"
    existing = get_campaign_by_id(camp_id)
    if existing:
        return False
    
    campaign_data = {
        "id": camp_id,
        "name": "Demo Campaign Outpilot",
        "category": "Demo",
        "description": "Realistic demo leads for Outpilot CRM",
        "ai_prompt_instructions": "Be polite and professional."
    }
    
    leads = generate_demo_leads()
    create_campaign_with_leads(campaign_data, leads)
    return True

def demo_data_exists() -> bool:
    camp_id = "demo_leads_outpilot"
    return get_campaign_by_id(camp_id) is not None
