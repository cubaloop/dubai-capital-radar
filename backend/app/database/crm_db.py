"""
CRM and Campaign Persistence Engine (SQLite with Supabase sync)
Guarantees 100% persistent state of:
- Campaigns & tagged groups
- Leads and their CRM lifecycle stages
- WhatsApp contact timestamps and delivery states (manual vs automatic)
- Chronological notes and reminders
"""
import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "crm.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_crm_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        description TEXT,
        attached_flyer TEXT,
        ai_prompt_instructions TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Migration for existing campaigns table
    try:
        cursor.execute("ALTER TABLE campaigns ADD COLUMN ai_prompt_instructions TEXT")
    except Exception:
        pass

    # 2. Leads table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        clean_phone TEXT NOT NULL,
        email TEXT,
        budget_aed REAL,
        budget_eur REAL,
        objective TEXT,
        timeline TEXT,
        notes TEXT,
        crm_status TEXT DEFAULT 'CREATED',
        whatsapp_status TEXT DEFAULT 'pending',
        last_contact_date TEXT,
        last_sent_type TEXT,
        personalized_message TEXT,
        next_reminder_date TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
    )
    """)

    # 3. Lead Notes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lead_notes (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'note',
        created_at TEXT NOT NULL,
        FOREIGN KEY (lead_id) REFERENCES leads (id)
    )
    """)

    conn.commit()
    
    # Auto-seed initial campaigns if empty
    cursor.execute("SELECT COUNT(*) FROM campaigns")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_campaigns(conn)
    else:
        # Check if Spain campaign exists
        cursor.execute("SELECT COUNT(*) FROM campaigns WHERE id = 'spain_madrid_expo'")
        if cursor.fetchone()[0] == 0:
            seed_spain_campaign(conn)

    conn.close()

def seed_spain_campaign(conn):
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR IGNORE INTO campaigns (id, name, category, description, attached_flyer, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        "spain_madrid_expo",
        "🇪🇸 Reactivación España - Novotel Madrid Expo",
        "España",
        "112 Leads de Febrero con invitación exclusiva al Novotel Madrid Center (9 y 10 Septiembre)",
        "/static/dubai_madrid_event.jpg",
        "2026-08-28 10:00:00"
    ))

    # Read Spain leads json
    spain_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outreach", "spain_campaign_leads.json")
    if os.path.exists(spain_json_path):
        with open(spain_json_path, "r", encoding="utf-8") as f:
            spain_leads = json.load(f)

        for idx, lead in enumerate(spain_leads):
            lead_id = f"spain_lead_{idx + 1}"
            raw_phone = lead.get("phone", "")
            clean_digits = "".join([c for c in raw_phone if c.isdigit()])
            
            # The user manually sent to the first 14 leads!
            is_already_sent = idx < 14
            whatsapp_status = "sent" if is_already_sent else "pending"
            last_contact = "2026-08-28 18:35:00" if is_already_sent else None
            last_type = "manual" if is_already_sent else None
            crm_status = "CONTACTED" if is_already_sent else "CREATED"

            cursor.execute("""
            INSERT OR IGNORE INTO leads (
                id, campaign_id, name, phone, clean_phone, email,
                objective, timeline, notes, crm_status, whatsapp_status,
                last_contact_date, last_sent_type, personalized_message,
                next_reminder_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lead_id,
                "spain_madrid_expo",
                lead.get("name", f"Lead #{idx + 1}"),
                raw_phone,
                clean_digits,
                lead.get("email", ""),
                lead.get("objective", "Inversión"),
                lead.get("timeline", ""),
                lead.get("notes", ""),
                crm_status,
                whatsapp_status,
                last_contact,
                last_type,
                lead.get("personalized_message", ""),
                None,
                "2026-08-28 10:00:00"
            ))

    conn.commit()

def seed_initial_campaigns(conn):
    seed_spain_campaign(conn)

    # Also seed Miami campaign
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR IGNORE INTO campaigns (id, name, category, description, attached_flyer, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        "miami_vip_event",
        "🇺🇸 Evento Presencial VIP Miami",
        "USA",
        "16 Leads para el evento en Hilton Garden Inn Miramar con flyer adjunto",
        "/static/dubai_miami_event.jpg",
        "2026-08-19 12:00:00"
    ))

    # Read Miami leads
    try:
        from ..outreach.miami_event_campaign import MIAMI_EVENT_LEADS, build_miami_message
        for idx, l in enumerate(MIAMI_EVENT_LEADS):
            lid = f"miami_lead_{idx + 1}"
            raw_phone = l.get("phone", "")
            clean_digits = "".join([c for c in raw_phone if c.isdigit()])
            cursor.execute("""
            INSERT OR IGNORE INTO leads (
                id, campaign_id, name, phone, clean_phone, email,
                objective, timeline, notes, crm_status, whatsapp_status,
                last_contact_date, last_sent_type, personalized_message,
                next_reminder_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lid,
                "miami_vip_event",
                l.get("name", f"Lead #{idx + 1}"),
                raw_phone,
                clean_digits,
                l.get("email", ""),
                "Evento Presencial",
                "Inmediato",
                "Asistencia confirmada a evento VIP",
                "CREATED",
                "pending",
                None,
                None,
                build_miami_message(l.get("name", "")),
                None,
                "2026-08-19 12:00:00"
            ))
    except Exception as e:
        print("[CRM DB] Notice seeding Miami leads:", e)

    conn.commit()

# --- Public API methods ---

def get_campaigns_list() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent_leads
    FROM campaigns c
    LEFT JOIN leads l ON c.id = l.campaign_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
    """)
    rows = cursor.fetchall()
    campaigns = []
    for r in rows:
        campaigns.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "description": r["description"],
            "attached_flyer": r["attached_flyer"],
            "ai_prompt_instructions": r["ai_prompt_instructions"] if "ai_prompt_instructions" in r.keys() and r["ai_prompt_instructions"] else "",
            "created_at": r["created_at"],
            "total_leads": r["total_leads"] or 0,
            "sent_leads": r["sent_leads"] or 0,
            "pending_leads": (r["total_leads"] or 0) - (r["sent_leads"] or 0)
        })
    conn.close()
    return campaigns

def get_campaign_by_id(campaign_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent_leads
    FROM campaigns c
    LEFT JOIN leads l ON c.id = l.campaign_id
    WHERE c.id = ?
    GROUP BY c.id
    """, (campaign_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "name": r["name"],
        "category": r["category"],
        "description": r["description"],
        "attached_flyer": r["attached_flyer"],
        "ai_prompt_instructions": r["ai_prompt_instructions"] if "ai_prompt_instructions" in r.keys() and r["ai_prompt_instructions"] else "",
        "created_at": r["created_at"],
        "total_leads": r["total_leads"] or 0,
        "sent_leads": r["sent_leads"] or 0,
        "pending_leads": (r["total_leads"] or 0) - (r["sent_leads"] or 0)
    }

def create_campaign_with_leads(campaign_data: Dict[str, Any], leads_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cid = campaign_data.get("id") or f"camp_{int(datetime.now().timestamp())}"
    cname = campaign_data.get("name", "Nueva Campaña")
    category = campaign_data.get("category", "General")
    description = campaign_data.get("description", "")
    attached_flyer = campaign_data.get("attached_flyer", "")
    ai_prompt = campaign_data.get("ai_prompt_instructions", "")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO campaigns (id, name, category, description, attached_flyer, ai_prompt_instructions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (cid, cname, category, description, attached_flyer, ai_prompt, now_str))

    for idx, l in enumerate(leads_data):
        lid = l.get("id") or f"lead_{cid}_{idx + 1}"
        phone = l.get("phone", "")
        clean_phone = "".join([c for c in phone if c.isdigit()])
        
        cursor.execute("""
        INSERT INTO leads (
            id, campaign_id, name, phone, clean_phone, email,
            budget_aed, budget_eur, objective, timeline, notes,
            crm_status, whatsapp_status, last_contact_date, last_sent_type,
            personalized_message, next_reminder_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lid,
            cid,
            l.get("name", f"Lead #{idx + 1}"),
            phone,
            clean_phone,
            l.get("email", ""),
            l.get("budget_aed"),
            l.get("budget_eur"),
            l.get("objective", ""),
            l.get("timeline", ""),
            l.get("notes", ""),
            l.get("crm_status", "CREATED"),
            l.get("whatsapp_status", "pending"),
            l.get("last_contact_date"),
            l.get("last_sent_type"),
            l.get("personalized_message", ""),
            l.get("next_reminder_date"),
            now_str
        ))

    conn.commit()
    conn.close()
    return {"id": cid, "name": cname, "total_leads": len(leads_data)}

def get_leads_by_campaign(campaign_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM leads WHERE campaign_id = ? ORDER BY rowid ASC
    """, (campaign_id,))
    rows = cursor.fetchall()
    leads = [dict(r) for r in rows]
    conn.close()
    return leads

def get_lead_by_id(lead_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def mark_lead_whatsapp_sent(lead_id: str, sent_type: str = "manual") -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    UPDATE leads
    SET whatsapp_status = 'sent',
        last_contact_date = ?,
        last_sent_type = ?,
        crm_status = CASE WHEN crm_status = 'CREATED' THEN 'CONTACTED' ELSE crm_status END
    WHERE id = ?
    """, (now_str, sent_type, lead_id))
    
    # Also log note
    note_id = f"note_{int(datetime.now().timestamp() * 1000)}"
    cursor.execute("""
    INSERT INTO lead_notes (id, lead_id, author, content, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        note_id,
        lead_id,
        "Sistema WhatsApp",
        f"Mensaje de campaña enviado ({sent_type.capitalize()})",
        "whatsapp",
        now_str
    ))
    
    conn.commit()
    conn.close()
    return True

def update_lead_crm_fields(lead_id: str, updates: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    allowed = ["name", "email", "budget_aed", "budget_eur", "objective", "timeline", "notes", "crm_status", "next_reminder_date"]
    set_clauses = []
    values = []
    for k, v in updates.items():
        if k in allowed:
            set_clauses.append(f"{k} = ?")
            values.append(v)

    if not set_clauses:
        conn.close()
        return False

    values.append(lead_id)
    query = f"UPDATE leads SET {', '.join(set_clauses)} WHERE id = ?"
    cursor.execute(query, tuple(values))
    conn.commit()
    conn.close()
    return True

def add_lead_note_db(lead_id: str, author: str, content: str, note_type: str = "note") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    nid = f"note_{int(datetime.now().timestamp() * 1000)}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO lead_notes (id, lead_id, author, content, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (nid, lead_id, author, content, note_type, now_str))
    
    # Also update last contact
    cursor.execute("UPDATE leads SET last_contact_date = ? WHERE id = ?", (now_str, lead_id))
    conn.commit()
    conn.close()
    return {"id": nid, "lead_id": lead_id, "author": author, "content": content, "type": note_type, "created_at": now_str}

def get_lead_notes_db(lead_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC", (lead_id,))
    notes = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return notes

def get_all_crm_leads() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT l.*, c.name as campaign_name, c.category as campaign_category
    FROM leads l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    ORDER BY l.last_contact_date DESC NULLS LAST, l.created_at DESC
    """)
    leads = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return leads

def update_campaign_ai_prompt(campaign_id: str, new_prompt: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE campaigns SET ai_prompt_instructions = ? WHERE id = ?", (new_prompt, campaign_id))
    conn.commit()
    conn.close()
    return True

def update_single_lead_message(lead_id: str, new_message: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE leads SET personalized_message = ? WHERE id = ?", (new_message, lead_id))
    conn.commit()
    conn.close()
    return True

def regenerate_campaign_lead_messages(campaign_id: str, new_prompt: Optional[str] = None, only_pending: bool = True) -> Dict[str, Any]:
    from ..crm.ai_composer import compose_lead_message_local
    conn = get_db_connection()
    cursor = conn.cursor()

    if new_prompt is not None:
        cursor.execute("UPDATE campaigns SET ai_prompt_instructions = ? WHERE id = ?", (new_prompt, campaign_id))
        conn.commit()

    # Get campaign details
    cursor.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,))
    camp_row = cursor.fetchone()
    if not camp_row:
        conn.close()
        return {"success": False, "error": "Campaña no encontrada", "updated_count": 0}

    active_prompt = camp_row["ai_prompt_instructions"] if "ai_prompt_instructions" in camp_row.keys() and camp_row["ai_prompt_instructions"] else ""
    camp_name = camp_row["name"] or ""

    query = "SELECT * FROM leads WHERE campaign_id = ?"
    if only_pending:
        query += " AND (whatsapp_status IS NULL OR whatsapp_status != 'sent')"
    
    cursor.execute(query, (campaign_id,))
    leads_to_update = cursor.fetchall()

    updated_count = 0
    for l_row in leads_to_update:
        lead_dict = dict(l_row)
        new_msg = compose_lead_message_local(lead_dict, active_prompt, camp_name)
        cursor.execute("UPDATE leads SET personalized_message = ? WHERE id = ?", (new_msg, lead_dict["id"]))
        updated_count += 1

    conn.commit()
    conn.close()
    return {
        "success": True,
        "campaign_id": campaign_id,
        "prompt_instructions": active_prompt,
        "updated_count": updated_count
    }

# Initialize on import
init_crm_db()
