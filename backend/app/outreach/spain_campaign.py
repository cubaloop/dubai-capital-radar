"""
Spain Feb Video Ads - Reactivation Campaign Manager
Handles the 112 Spain leads with EUR (€) and m² metrics, personalized by notes and timeframe.
"""
import json
import os
from typing import List, Dict, Any

LEADS_FILE = os.path.join(os.path.dirname(__file__), "spain_campaign_leads.json")

def load_spain_leads() -> List[Dict[str, Any]]:
    if not os.path.exists(LEADS_FILE):
        return []
    with open(LEADS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def build_spain_reactivation_message(lead: Dict[str, Any]) -> str:
    """
    Builds a culturally accurate, empathic, Spain-specific reactivation message.
    Uses Euros (€), Metros Cuadrados (m²), and references their historical notes if present.
    """
    raw_name = lead.get("name", "").strip()
    # Extract first name cleanly
    first_name = raw_name.split()[0] if raw_name else "Inversor"
    notes = lead.get("notes", "").lower()
    objective = lead.get("objective", "")
    
    # Custom hook if they had specific budget or preference notes
    custom_hook = ""
    if "flipping" in notes or "300k" in notes:
        custom_hook = "Recuerdo que buscabas una oportunidad en torno a los 300.000€ orientada a revalorización (flipping)."
    elif "160k" in notes or "studio" in notes:
        custom_hook = "Sé que tu objetivo era un estudio o unidad de entrada sobre los 150.000€ - 160.000€ (aprox. 40-45 m²) con alta rentabilidad por alquiler."
    elif "200k" in notes or "casa" in notes or "chalet" in notes or "mudarse" in notes:
        custom_hook = "Recuerdo que tu idea era una opción residencial (sobre 100-140 m²) con plan de pago cómodo para uso propio o alquiler."
    elif "renta" in notes or "alquiler" in notes:
        custom_hook = "Sé que tu prioridad era maximizar la rentabilidad neta por alquiler con una unidad lista o con entrega cercana."
    elif "off plan" in notes or "off-plan" in notes:
        custom_hook = "Sé que te interesaba el modelo off-plan para entrar con un 10-20% y pagar el resto en cuotas sin hipoteca bancaria."

    if custom_hook:
        body = f"""Hola {first_name},

Te escribo porque en febrero estuvimos viendo opciones inmobiliarias en Dubai para ti. {custom_hook}

Sé que con las noticias e incertidumbre que hubo en la región en ese momento todo se puso en pausa (totalmente comprensible).

Te contacto brevemente porque la situación en Dubai está 100% normalizada, el mercado ha cerrado el semestre con récord histórico de transacciones en el DLD y las desarrolladoras han lanzado planes de pago muy atractivos (desde 1% mensual y unidades desde 150.000€ / 40 m² con 8-9% de rentabilidad neta libre de impuestos).

Si sigues con la idea de diversificar capital fuera de España o quieres ver cómo está el mercado ahora, dime y te paso un resumen de 2 minutos sin compromiso.

Un saludo!"""
    else:
        body = f"""Hola {first_name},

Te escribo directamente porque en febrero solicitaste información sobre inversiones en Dubai a través de nuestro anuncio en España. Sé que con la incertidumbre y las noticias que hubo en la región en esas fechas todo quedó en pausa (totalmente lógico).

Te escribo porque la situación en Dubai está 100% normalizada y con gran dinamismo: las principales desarrolladoras (Emaar, DAMAC, Binghatti) acaban de abrir fases con planes de pago escalonados sin intereses (desde 150.000€ y tipologías de 45 m² a 120 m² con rentabilidades del 7-9% neto y 0% de IRPF).

Si en algún momento retomas la idea de diversificar patrimonio fuera de España, avísame y te comparto un análisis actualizado sin ningún compromiso.

Un saludo!"""

    return body.strip()

SPAIN_LEADS_DATA = load_spain_leads()
