"""
Direct High-Impact Madrid Expo Personalizer
Creates punchy, direct messages that:
1. Ignore any war/geopolitical mention completely.
2. Directly reference their specific previous interest/budget/notes.
3. Present the unique opportunity of having our team as personal advisors FREE in Madrid for 2 days.
4. Include event details & exclusive perks (Golden Visa gratis, 15-20% off, Property Management gratis).
5. Invite to confirm attendance for VIP list.
"""
import json
import os

LEADS_FILE = os.path.join(os.path.dirname(__file__), "spain_campaign_leads.json")

def clean_first_name(full_name: str) -> str:
    parts = full_name.strip().split()
    if not parts:
        return "Hola"
    first = parts[0]
    if first.lower() in ["dr.", "dr", "dña", "dñ.", "abg", "abg."]:
        return parts[1] if len(parts) > 1 else "Hola"
    return first.capitalize()

def generate_direct_message(lead: dict) -> str:
    name = clean_first_name(lead.get("name", ""))
    notes = (lead.get("notes") or "").lower()
    objective = (lead.get("objective") or "").lower()
    
    # 1. Direct, specific reference to their previous interest
    interest_reference = ""
    if "flipping" in notes or "300k" in notes:
        interest_reference = "Recuerdo perfectamente tu interés en oportunidades de revalorización rápida (flipping) sobre 300.000€."
    elif "160k" in notes or ("cash" in notes and "buyer" in notes):
        interest_reference = "Recuerdo que buscabas una unidad de entrada accesible (estudio sobre 150.000€ - 160.000€ / 40-45 m²) para rentabilizar al contado."
    elif "hijos" in notes or "esposa" in notes or "familia" in notes or "chalet" in notes or "downhouse" in notes:
        interest_reference = "Recuerdo que tu interés estaba enfocado en una vivienda amplia (tipo chalet / townhouse de 3-4 dormitorios) para mudarte con tu familia."
    elif "esposa le dijo que no" in notes:
        interest_reference = "Sé que estuviste viendo opciones off-plan sobre 200.000€ y querías ver el momento ideal para tomar la decisión familiar."
    elif "exportador de frutas" in notes or "empresa" in notes:
        interest_reference = "Sé que buscas diversificación patrimonial en activos seguros en dólares y optimización fiscal."
    elif "grupo de inversores" in notes or "100k" in notes:
        interest_reference = "Sé que gestionas un grupo de inversores buscando tickets desde 100.000€ con alta rentabilidad neta."
    elif "venda su propiedad" in notes:
        interest_reference = "Recuerdo que estabas planeando reinvertir capital tras la venta de un inmueble en España."
    elif "2br venice" in notes or "venice" in notes:
        interest_reference = "Recuerdo tu interés en proyectos estilo resort con canales de agua de 2 dormitorios."
    elif "off plan" in notes or "off-plan" in notes:
        interest_reference = "Sé que tu objetivo era entrar en proyectos off-plan con pagos escalonados y rentabilizar luego."
    elif "renta" in notes or "alquiler" in notes or "propósito de inversión" in objective:
        interest_reference = "Sé que tu prioridad es rentabilizar capital con retornos del 8-9% neto anual libre de IRPF."
    elif "reubicación" in objective or "residencia" in objective:
        interest_reference = "Sé que tu objetivo principal era obtener la residencia permanente y calidad de vida en Dubai."
    else:
        interest_reference = "Recuerdo tu interés cuando nos consultaste sobre inversiones inmobiliarias en Dubai."

    # 2. Tailored bullet points
    if "reubicación" in objective or "residencia" in objective or "hijos" in notes or "familia" in notes:
        benefits = """• 🛂 <b>Golden Visa de 10 Años 100% GRATIS</b> para ti y toda tu familia
• 🏷️ <b>Descuentos del 15% al 20%</b> exclusivos en el evento
• 🏠 Comunidades residenciales listas y en construcción cerca de colegios
• Planes de pago directos desde 1% mensual sin intereses"""
    elif "flipping" in notes or "300k" in notes:
        benefits = """• 🏷️ <b>Descuentos del 15% al 20%</b> en prelanzamientos para maximizar margen
• 📈 Proyectos de alta revalorización (Emaar, DAMAC, Binghatti)
• 🛂 <b>Golden Visa de 10 Años GRATIS</b>
• Planes de pago escalonados sin intereses"""
    else:
        benefits = """• 🏷️ <b>15% a 20% de Descuento exclusivo</b> en unidades seleccionadas
• 🏠 <b>Gestión de alquiler (Property Management) 100% GRATIS</b>
• 🛂 <b>Golden Visa de 10 Años GRATIS</b> con tu inversión
• Planes de pago desde 1% mensual sin hipoteca bancaria"""

    msg = f"""Hola {name},

Te escribo directamente desde nuestro equipo asesor de Dubai. {interest_reference}

Te contacto porque tienes una **oportunidad única**: por solo dos días estaremos en España con nuestro equipo de consultores y representantes directos de las principales desarrolladoras de Dubai para asesorarte **completamente gratis y en persona**.

Presentaremos en Madrid el evento oficial **DUBAI PROPERTY EXPO**:

📅 **Cuándo:** 9 y 10 de Septiembre (10:00 AM a 8:00 PM)
📍 **Dónde:** Hotel Novotel Madrid Center (4 estrellas)

Tendremos condiciones y ventajas que solo aplican durante el evento:
{benefits}

La entrada y asesoría personalizada son **100% gratuitas**, pero el aforo en el salón VIP del Novotel es limitado.

¿Te gustaría asistir? Solo respóndeme por aquí para confirmarte en la **lista de invitados VIP** y reservarte el acceso.

*(Te adjunto la invitación oficial en imagen)* ⬇️"""

    return msg.strip()

def update_all_leads():
    with open(LEADS_FILE, "r", encoding="utf-8") as f:
        leads = json.load(f)

    for l in leads:
        l["personalized_message"] = generate_direct_message(l)

    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    update_all_leads()
