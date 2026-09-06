"""
Smart Excel / CSV Lead Parser & AI Message Customizer
Standard-library only implementation for 100% portability (uses zipfile + xml.etree for .xlsx and csv for .csv).
Requires zero external dependencies.
"""
import io
import re
import csv
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Tuple

def clean_phone_number(raw_phone: str) -> Tuple[str, str]:
    """Cleans phone string into digits-only and formatted +prefix number."""
    if not raw_phone:
        return "", ""
    
    # Strip any prefix text like 'p:' from Meta Ads
    s = str(raw_phone).strip()
    if s.lower().startswith("p:"):
        s = s[2:].strip()
        
    digits = "".join([c for c in s if c.isdigit()])
    if not digits:
        return "", ""
        
    formatted = f"+{digits}"
    return formatted, digits

def clean_name(raw_name: str) -> str:
    if not raw_name:
        return "Inversor"
    cleaned = str(raw_name).strip()
    return cleaned if cleaned else "Inversor"

def _parse_xlsx_pure_python(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parses .xlsx workbook using Python standard zipfile and xml parser."""
    rows: List[List[str]] = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
        # 1. Read shared strings if present
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            with z.open("xl/sharedStrings.xml") as f:
                tree = ET.parse(f)
                root = tree.getroot()
                # namespace handling
                ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for si in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    # get text inside t
                    t_nodes = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                    shared_strings.append("".join([t.text or "" for t in t_nodes]))

        # 2. Read first worksheet
        sheet_file = "xl/worksheets/sheet1.xml"
        if sheet_file not in z.namelist():
            # fallback: find first sheet
            sheet_files = [n for n in z.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")]
            if sheet_files:
                sheet_file = sheet_files[0]
            else:
                return []

        with z.open(sheet_file) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            sheet_data = root.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
            if sheet_data is None:
                return []

            for row in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                row_vals = []
                for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    cell_type = c.attrib.get('t', '')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = ""
                    if v_elem is not None and v_elem.text:
                        raw_v = v_elem.text
                        if cell_type == 's' and raw_v.isdigit():
                            idx = int(raw_v)
                            if idx < len(shared_strings):
                                val = shared_strings[idx]
                        elif cell_type == 'b':
                            val = "TRUE" if raw_v == "1" else "FALSE"
                        else:
                            val = raw_v
                    row_vals.append(val.strip())
                if any(row_vals):
                    rows.append(row_vals)

    if not rows:
        return []

    headers = [str(h).strip() if h else f"col_{idx}" for idx, h in enumerate(rows[0])]
    dict_rows = []
    for r in rows[1:]:
        row_dict = {}
        for idx, val in enumerate(r):
            if idx < len(headers):
                row_dict[headers[idx]] = val
        dict_rows.append(row_dict)

    return dict_rows

def parse_spreadsheet_bytes(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Parses .xlsx, .xls, or .csv into a list of row dicts."""
    lower_fn = filename.lower()
    
    if lower_fn.endswith(".csv"):
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                content = file_bytes.decode(enc)
                reader = csv.DictReader(io.StringIO(content))
                rows = [{k.strip() if k else "": v.strip() if isinstance(v, str) else v for k, v in r.items()} for r in reader]
                if rows:
                    return rows
            except Exception:
                continue
        content = file_bytes.decode("utf-8", errors="ignore")
        reader = csv.DictReader(io.StringIO(content))
        return [{k.strip() if k else "": v.strip() if isinstance(v, str) else v for k, v in r.items()} for r in reader]

    # XLSX (try pure python zip parser first, zero dependencies)
    try:
        return _parse_xlsx_pure_python(file_bytes)
    except Exception as e:
        print("[Excel Parser] Notice on pure parser:", e)
        # fallback if openpyxl is installed
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
            iter_rows = list(sheet.iter_rows(values_only=True))
            if not iter_rows:
                return []
            headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(iter_rows[0])]
            rows = []
            for r in iter_rows[1:]:
                if any(r):
                    rows.append({headers[i]: str(v).strip() if v is not None else "" for i, v in enumerate(r) if i < len(headers)})
            return rows
        except Exception:
            return []

def map_and_structure_leads(raw_rows: List[Dict[str, Any]], campaign_context: str = "") -> List[Dict[str, Any]]:
    """Maps raw rows to unified Lead objects and generates personalized messages."""
    mapped: List[Dict[str, Any]] = []

    for idx, row in enumerate(raw_rows):
        def get_field(*patterns: str) -> str:
            for k, v in row.items():
                k_clean = k.lower().replace("_", " ").replace("-", " ")
                for pat in patterns:
                    if pat in k_clean:
                        return str(v).strip()
            return ""

        name = get_field("full name", "full_name", "nombre", "name", "contacto", "cliente") or f"Lead #{idx + 1}"
        phone_raw = get_field("phone", "telefono", "teléfono", "celular", "mobile", "whatsapp")
        email = get_field("email", "correo", "mail")
        notes = get_field("notes", "notas", "comentarios", "comments", "observaciones", "mensaje")
        objective = get_field("objective", "goal", "objetivo", "proposito", "interes", "purpose")
        timeline = get_field("timeline", "plazo", "tiempo", "cuando")
        budget_raw = get_field("budget", "presupuesto", "inversion", "capital", "monto")

        budget_eur = None
        if budget_raw:
            digits_budget = "".join([c for c in budget_raw if c.isdigit() or c in [".", ","]])
            try:
                clean_num = digits_budget.replace(".", "").replace(",", ".")
                budget_eur = float(clean_num)
            except Exception:
                budget_eur = None

        formatted_phone, clean_digits = clean_phone_number(phone_raw)
        if not clean_digits:
            continue

        first_name = clean_name(name).split()[0]
        personalized_msg = build_lead_message(
            first_name=first_name,
            objective=objective,
            notes=notes,
            budget=budget_raw,
            timeline=timeline,
            campaign_context=campaign_context
        )

        mapped.append({
            "name": clean_name(name),
            "phone": formatted_phone,
            "clean_phone": clean_digits,
            "email": email,
            "objective": objective or "Inversión Inmobiliaria",
            "timeline": timeline or "Próximos meses",
            "notes": notes,
            "budget_eur": budget_eur,
            "crm_status": "CREATED",
            "whatsapp_status": "pending",
            "personalized_message": personalized_msg
        })

    return mapped

def build_lead_message(
    first_name: str,
    objective: str,
    notes: str,
    budget: str,
    timeline: str,
    campaign_context: str
) -> str:
    """Creates a high-converting, personalized WhatsApp invitation or proposal."""
    from .ai_composer import compose_lead_message_local
    lead_dict = {
        "name": first_name,
        "objective": objective,
        "notes": notes,
        "timeline": timeline
    }
    if budget:
        digits = "".join([c for c in str(budget) if c.isdigit()])
        if digits:
            lead_dict["budget_eur"] = float(digits)
    return compose_lead_message_local(lead_dict, prompt_instructions=campaign_context)
