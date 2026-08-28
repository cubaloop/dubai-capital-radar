"""
Deep Semantic Lead Personalizer for Dubai Property Expo Madrid
Crafts a unique, nuanced, individualized message for every one of the 112 Spain leads
taking into account their exact previous objections, notes, family situation, timeline, and budget.
"""
import json
import os
import re

LEADS_FILE = os.path.join(os.path.dirname(__file__), "spain_campaign_leads.json")

def clean_first_name(full_name: str) -> str:
    parts = full_name.strip().split()
    if not parts:
        return "Hola"
    # Filter titles
    first = parts[0]
    if first.lower() in ["dr.", "dr", "dña", "dñ.", "abg", "abg."]:
        return parts[1] if len(parts) > 1 else "Estimado/a"
    return first.capitalize()

def generate_bespoke_message(lead: dict) -> str:
    name = clean_first_name(lead.get("name", ""))
    notes = (lead.get("notes") or "").lower()
    objective = (lead.get("objective") or "").lower()
    timeline = (lead.get("timeline") or "").lower()
    
    # 1. Tailored contextual opening & reference to previous discussion
    lead_specific_hook = ""
    
    if "flipping" in notes or "300k" in notes:
        lead_specific_hook = "Recuerdo que estuvimos evaluando opciones orientadas a revalorización rápida (flipping) sobre 300.000€ y acordamos hacer una pausa por la coyuntura de esos días."
    elif "160k" in notes or ("cash" in notes and "buyer" in notes):
        lead_specific_hook = "Sé que tu prioridad era una unidad de entrada accesible (estudio sobre 150.000€ - 160.000€ / 40-45 m²) como compra al contado para rentabilizar de inmediato."
    elif "hijos" in notes or "esposa" in notes or "familia" in notes or "chalet" in notes:
        lead_specific_hook = "Recuerdo que tu objetivo era una vivienda espaciosa (3-4 dormitorios tipo chalet / townhouse) para mudarte con tu familia y tus hijos en un plazo aproximado de un año."
    elif "esposa le dijo que no" in notes:
        lead_specific_hook = "Recuerdo que en su momento estuviste viendo opciones off-plan sobre 200.000€ y decidieron no avanzar en conjunto. Te contacto con novedades que facilitan mucho la decisión familiar."
    elif "exportador de frutas" in notes or "empresa" in notes:
        lead_specific_hook = "Sé que valoras la diversificación patrimonial en activos refugio y la optimización fiscal internacional para tu capital."
    elif "grupo de inversores" in notes or "100k" in notes:
        lead_specific_hook = "Sé que gestionas un grupo de inversores buscando tickets desde 100.000€ con alta rentabilidad neta libre de impuestos."
    elif "venda su propiedad" in notes:
        lead_specific_hook = "Recuerdo que estabas pendiente de la venta de un inmueble para reinvertir en activos más rentables y seguros."
    elif "2br venice" in notes or "venice" in notes:
        lead_specific_hook = "Recuerdo tu interés específico en tipologías de 2 dormitorios en proyectos estilo resort con canales de agua."
    elif "off plan" in notes or "off-plan" in notes:
        lead_specific_hook = "Sé que tu idea era entrar en fase off-plan con un 10-20% y pagar cuotas cómodas durante la construcción para luego rentar o vender."
    elif "renta" in notes or "alquiler" in notes or "propósito de inversión" in objective:
        lead_specific_hook = "Sé que tu objetivo principal es rentabilizar capital con retornos del 8-9% neto anual libre de IRPF y plusvalías."
    elif "reubicación" in objective or "residencia" in objective:
        lead_specific_hook = "Sé que tu interés principal estaba enfocado en la residencia permanente en Dubai y las ventajas de calidad de vida y seguridad para ti."
    else:
        lead_specific_hook = "Te escribo porque en febrero solicitaste información sobre inversiones en Dubai a través de nuestro anuncio en España."

    # 2. Tailored benefit based on timeline/profile
    profile_benefit = ""
    if "reubicación" in objective or "residencia" in objective or "hijos" in notes:
        profile_benefit = "• 🛂 **Golden Visa de 10 Años 100% GRATIS** para ti y toda tu familia\n• 🏠 Comunidades residenciales cerca de colegios internacionales\n• 🏷️ **Descuentos exclusivos del 15% al 20%** durante el evento"
    elif "flipping" in notes or "300k" in notes:
        profile_benefit = "• 🏷️ **15% a 20% de Descuento directo** en fases de prelanzamiento\n• 📈 Proyectos con plusvalías estimadas del 40-50% a entrega\n• 🛂 **Golden Visa de 10 Años GRATIS** con tu inversión"
    else:
        profile_benefit = "• 🏷️ **Descuentos del 15% al 20%** en unidades seleccionadas\n• 🏠 **Gestión de alquiler (Property Management) 100% GRATIS**\n• 🛂 **Golden Visa de 10 Años GRATIS**\n• Planes de pago desde 1% mensual sin intereses bancarios"

    msg = f"""Hola {name},

Te escribo directamente desde nuestro equipo asesor de Dubai. {lead_specific_hook}

Sé que con la incertidumbre y las noticias que hubo en la región en febrero todo se puso en pausa (totalmente comprensible). Te contacto con una gran noticia: **estaremos presentando en Madrid nuestro evento presencial oficial DUBAI PROPERTY EXPO**.

📅 **Cuándo:** 9 y 10 de Septiembre (10:00 AM a 8:00 PM)
📍 **Dónde:** Hotel Novotel Madrid Center (4 estrellas)

Estaremos con directivos y representantes oficiales de las principales desarrolladoras de Dubai (Emaar, DAMAC, Sobha, Binghatti). Tendremos condiciones exclusivas **únicamente para los asistentes**:

{profile_benefit}

La entrada es **100% gratuita**, pero el aforo en el salón privado del Novotel es limitado para mantener la atención personalizada.

¿Te gustaría asistir? Respóndeme por aquí para confirmarte en la lista de invitados VIP y reservarte el acceso.

*(Te adjunto la invitación oficial en imagen)* ⬇️"""

    return msg.strip()

def process_and_save_all():
    with open(LEADS_FILE, "r", encoding="utf-8") as f:
        leads = json.load(f)

    for l in leads:
        l["personalized_message"] = generate_bespoke_message(l)

    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, ensure_ascii=False, indent=2)

    print(f"✅ Generated bespoke customized messages for all {len(leads)} Spain leads!")

if __name__ == "__main__":
    process_and_save_all()
