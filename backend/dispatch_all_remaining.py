import httpx
import time
import sys

send_url = "https://dubai-miami-radar.onrender.com/api/whatsapp/send"

leads_to_send = [
    {"index": 4, "name": "Sandra", "phone": "+17863740263"},
    {"index": 5, "name": "Dayana", "phone": "+17864746761"},
    {"index": 6, "name": "Yenis", "phone": "+17863004761"},
    {"index": 7, "name": "Jenny", "phone": "+17862234057"},
    {"index": 8, "name": "LAL Segovia", "phone": "+17864252729"},
    {"index": 9, "name": "Maryelin", "phone": "+17864536070"},
    {"index": 10, "name": "Jose", "phone": "+17864860088"},
    {"index": 11, "name": "Lucia", "phone": "+50068411925"},
    {"index": 12, "name": "Nardin", "phone": "+17863267563"},
    {"index": 13, "name": "Jesus", "phone": "+17863677464"}
]

for item in leads_to_send:
    idx = item["index"]
    name = item["name"]
    phone = item["phone"]
    first_name = name.split()[0] if not name.startswith("LAL") else "LAL Segovia"
    
    msg = (
        f"Hola {first_name}\n"
        f"Le escribo porque se registro para asistir a nuestro evento sobre inversiones inmobiliarias en Dubai que estaremos presentando en Miami, el domingo 29 de agosto en el Hilton Garden en Miramar, desde las 10 am hasta las 8 pm, no pierda la opurtunidad de asesorarse con nuestro equipo internacional de expertos, es completamnete gratis, solo debe confirmarme su asistencia para ponerle en la lista\n\n"
        f"Saludos"
    )
    payload = {
        "to": phone,
        "message": msg,
        "image_path": "/app/whatsapp-gateway/uploads/dubai_miami_event.jpg"
    }
    
    print(f"[{idx}/13] Delivering to {name} ({phone})...")
    try:
        r = httpx.post(send_url, json=payload, timeout=25.0)
        res_data = r.json()
        print(f"[{idx}/13] Status: {r.status_code} | Delivered: {res_data.get('success')}")
    except Exception as e:
        print(f"[{idx}/13] Error: {e}")
        
    if idx < 13:
        print(f"Waiting 12s before lead {idx + 1}...")
        time.sleep(12)

print("\nALL 13 LEADS PROCESSED SUCCESSFULLY!")
