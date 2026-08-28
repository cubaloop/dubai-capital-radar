import httpx

token = '8894250531:AAEFADqcJEmnFNz9Y9rUXnb12hTktl2OrQ8'
chat_id = '8484840284'

test_msg = """🏰 <b>¡Dubai Capital Radar Conectado!</b>

✅ <b>Tu sistema de alertas en tiempo real está 100% activo.</b>

A partir de ahora recibirás aquí:
🔥 <b>Alertas Inmediatas:</b> Cuando un lead caliente responda en WhatsApp con intención de compra o agendar llamada.
🏗️ <b>Ingestión de Proyectos:</b> Notificaciones automáticas de nuevos lanzamientos de desarrolladoras recibidos en tu WhatsApp.
📱 <b>Contenido Diario:</b> Packs de publicación listos para copiar y pegar.

<i>Tu ID de Telegram (8484840284) ha quedado registrado en el servidor.</i>"""

r = httpx.post(
    f"https://api.telegram.org/bot{token}/sendMessage",
    json={"chat_id": chat_id, "text": test_msg, "parse_mode": "HTML"}
)
print("Status:", r.status_code)
print("Response:", r.json())
