import httpx
import json

send_url = "https://dubai-miami-radar.onrender.com/api/whatsapp/send"

# Test sending to Dayron (+17865239922) with image_path
payload = {
    "to": "+17865239922",
    "message": "Hola Dayron\nLe escribo porque se registro para asistir a nuestro evento sobre inversiones inmobiliarias en Dubai que estaremos presentando en Miami, el domingo 29 de agosto en el Hilton Garden en Miramar, desde las 10 am hasta las 8 pm, no pierda la opurtunidad de asesorarse con nuestro equipo internacional de expertos, es completamnete gratis, solo debe confirmarme su asistencia para ponerle en la lista\n\nSaludos",
    "image_path": "/app/whatsapp-gateway/uploads/dubai_miami_event.jpg"
}

print(f"Sending to Dayron with image_path...")
r = httpx.post(send_url, json=payload)
print("STATUS:", r.status_code)
print("BODY:", json.dumps(r.json(), indent=2))
