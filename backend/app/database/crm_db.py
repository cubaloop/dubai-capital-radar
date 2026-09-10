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
from .supabase_sync import sync_lead_background

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

    try:
        cursor.execute("ALTER TABLE campaigns ADD COLUMN agency_id TEXT")
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

    try:
        cursor.execute("ALTER TABLE leads ADD COLUMN agency_id TEXT")
    except Exception:
        pass

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

    # 4. Super-Admin Copilot Conversation History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS copilot_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 5. Agencies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        plan TEXT DEFAULT 'starter',
        whatsapp_mode TEXT DEFAULT 'baileys',
        wa_api_key TEXT,
        wa_phone_number_id TEXT,
        wa_accepted_risk BOOLEAN DEFAULT FALSE,
        created_at TEXT,
        is_active BOOLEAN DEFAULT TRUE
    )
    """)

    conn.commit()
    
    # Auto-seed initial campaigns if empty
    cursor.execute("SELECT COUNT(*) FROM campaigns")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_campaigns(conn)
    else:
        # Ensure Spain campaign and its leads are fully seeded
        seed_spain_campaign(conn)
        cursor.execute("SELECT COUNT(*) FROM campaigns WHERE id = 'miami_vip_event'")
        if cursor.fetchone()[0] == 0:
            seed_initial_campaigns(conn)

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
            
            notes = lead.get("notes", "")
            timeline = lead.get("timeline", "")
            is_already_sent = idx < 14 or "CONFIRMADA" in notes or "PENDIENTE" in notes
            whatsapp_status = "sent" if is_already_sent else "pending"
            last_contact = "2026-09-08 12:00:00" if ("CONFIRMADA" in notes or "PENDIENTE" in notes) else ("2026-08-28 18:35:00" if idx < 14 else None)
            last_type = "manual" if is_already_sent else None
            if "CONFIRMADA" in notes:
                crm_status = "APPOINTMENT"
            elif "PENDIENTE" in notes:
                crm_status = "FOLLOW_UP"
            elif is_already_sent:
                crm_status = "CONTACTED"
            else:
                crm_status = "CREATED"

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
    # Fetch updated lead and sync to Supabase
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    updated_lead = cursor.fetchone()
    conn.close()
    if updated_lead:
        sync_lead_background(dict(updated_lead))
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

    # Sync to Supabase
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    updated_lead = cursor.fetchone()
    conn.close()
    if updated_lead:
        sync_lead_background(dict(updated_lead))
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

def create_or_upsert_lead_db(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    lid = lead_data.get("id")
    raw_phone = lead_data.get("phone", "")
    clean_phone = "".join([c for c in raw_phone if c.isdigit()])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # If no ID provided, try finding by clean_phone or assign new index ID
    if not lid:
        if clean_phone:
            cursor.execute("SELECT id FROM leads WHERE clean_phone = ?", (clean_phone,))
            row = cursor.fetchone()
            if row:
                lid = row["id"]
        if not lid:
            cid = lead_data.get("campaign_id", "spain_madrid_expo")
            prefix = "spain_lead_" if cid == "spain_madrid_expo" else f"lead_{cid}_"
            cursor.execute(f"SELECT id FROM leads WHERE id LIKE '{prefix}%'")
            existing = [r["id"] for r in cursor.fetchall()]
            nums = []
            for e in existing:
                try:
                    nums.append(int(e.replace(prefix, "")))
                except Exception:
                    pass
            next_num = max(nums) + 1 if nums else 1
            lid = f"{prefix}{next_num}"

    # Check if lead exists
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lid,))
    existing_row = cursor.fetchone()
    if existing_row:
        cursor.execute("""
        UPDATE leads SET
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            clean_phone = COALESCE(?, clean_phone),
            email = COALESCE(?, email),
            objective = COALESCE(?, objective),
            timeline = COALESCE(?, timeline),
            notes = COALESCE(?, notes),
            crm_status = COALESCE(?, crm_status),
            whatsapp_status = COALESCE(?, whatsapp_status),
            last_contact_date = COALESCE(?, last_contact_date)
        WHERE id = ?
        """, (
            lead_data.get("name"),
            raw_phone or None,
            clean_phone or None,
            lead_data.get("email"),
            lead_data.get("objective"),
            lead_data.get("timeline"),
            lead_data.get("notes"),
            lead_data.get("crm_status"),
            lead_data.get("whatsapp_status"),
            lead_data.get("last_contact_date") or now_str,
            lid
        ))
    else:
        cursor.execute("""
        INSERT INTO leads (
            id, campaign_id, name, phone, clean_phone, email,
            objective, timeline, notes, crm_status, whatsapp_status,
            last_contact_date, last_sent_type, personalized_message,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lid,
            lead_data.get("campaign_id", "spain_madrid_expo"),
            lead_data.get("name", "Nuevo Lead"),
            raw_phone,
            clean_phone,
            lead_data.get("email", ""),
            lead_data.get("objective", "Inversión"),
            lead_data.get("timeline", ""),
            lead_data.get("notes", ""),
            lead_data.get("crm_status", "CREATED"),
            lead_data.get("whatsapp_status", "pending"),
            lead_data.get("last_contact_date") or now_str,
            lead_data.get("last_sent_type", "manual"),
            lead_data.get("personalized_message", ""),
            now_str
        ))

    conn.commit()
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lid,))
    result = dict(cursor.fetchone())
    conn.close()

    sync_lead_background(result)
    return result

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
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    updated_lead = cursor.fetchone()
    conn.close()
    if updated_lead:
        sync_lead_background(dict(updated_lead))
    return True

async def regenerate_campaign_lead_messages(campaign_id: str, new_prompt: Optional[str] = None, only_pending: bool = True) -> Dict[str, Any]:
    import asyncio
    import os
    from ..crm.ai_composer import compose_lead_message_ai, compose_lead_message_local
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
    leads_to_update = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Concurrently generate messages for ALL leads in the campaign
    sem = asyncio.Semaphore(4)
    async def generate_single(lead_dict):
        async with sem:
            try:
                msg = await compose_lead_message_ai(lead_dict, active_prompt, camp_name)
            except Exception as e:
                print(f"[Lead AI Gen Error {lead_dict.get('id')}]: {e}")
                msg = compose_lead_message_local(lead_dict, active_prompt, camp_name)
            return lead_dict["id"], msg

    results = await asyncio.gather(*[generate_single(l) for l in leads_to_update])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    for lead_id, msg in results:
        cursor.execute("UPDATE leads SET personalized_message = ? WHERE id = ?", (msg, lead_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "campaign_id": campaign_id,
        "prompt_instructions": active_prompt,
        "updated_count": len(leads_to_update),
        "ai_used": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    }

def update_campaign_meta(campaign_id: str, name: Optional[str] = None, category: Optional[str] = None, description: Optional[str] = None) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    fields = []
    vals = []
    if name is not None:
        fields.append("name = ?")
        vals.append(name)
    if category is not None:
        fields.append("category = ?")
        vals.append(category)
    if description is not None:
        fields.append("description = ?")
        vals.append(description)
    if not fields:
        conn.close()
        return False
    vals.append(campaign_id)
    query = f"UPDATE campaigns SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, tuple(vals))
    conn.commit()
    conn.close()
    return True

def delete_campaign_db(campaign_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    # Delete associated lead notes
    cursor.execute("DELETE FROM lead_notes WHERE lead_id IN (SELECT id FROM leads WHERE campaign_id = ?)", (campaign_id,))
    # Delete leads
    cursor.execute("DELETE FROM leads WHERE campaign_id = ?", (campaign_id,))
    # Delete campaign
    cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    conn.commit()
    conn.close()
    return True

def delete_lead_db(lead_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lead_notes WHERE lead_id = ?", (lead_id,))
    cursor.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
    conn.commit()
    conn.close()
    return True

def save_copilot_message_db(role: str, content: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO copilot_chat (role, content, created_at) VALUES (?, ?, ?)", (role, content, now_str))
    conn.commit()
    conn.close()

def get_recent_copilot_history_db(limit: int = 14) -> List[Dict[str, str]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role, content FROM copilot_chat ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

def mount_novotel_madrid_reminder_campaign() -> Dict[str, Any]:
    """
    Mounts the Novotel Madrid Center (9 y 10 de septiembre) reminder message 
    for all unconfirmed leads in spain_madrid_expo.
    Protects confirmed leads (Patricia, Javier, Sergio, Marcela, Yuan, Keila Martinez, etc.).
    Sets whatsapp_status = 'pending' so David can send them manually one by one.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM leads WHERE campaign_id = 'spain_madrid_expo' ORDER BY rowid ASC")
    rows = cursor.fetchall()
    all_leads = [dict(r) for r in rows]

    confirmed_phones = {
        '+34613004173', # Patricia
        '+34665917032', # Javier Araya
        '+34629291549', # Javier
        '+34629512099', # Sergio
        '+34641139736', # Marcela
        '+34654083551', # Yuan
        '+34627184236', # Keila Martínez
    }

    updated_leads = []
    protected_leads = []

    for lead in all_leads:
        phone = (lead.get("phone") or "").strip()
        notes = (lead.get("notes") or "").lower()
        status = lead.get("crm_status") or ""
        name = (lead.get("name") or "").strip()

        is_confirmed = (
            phone in confirmed_phones or
            'asistencia conf' in notes or
            'asistencia confirmada' in notes or
            status in ['APPOINTMENT', 'WON']
        )

        if is_confirmed:
            protected_leads.append({
                "id": lead["id"],
                "name": name,
                "phone": phone,
                "status": status
            })
            continue

        # Clean first name
        first_name = name.split()[0].title() if name else ""
        if first_name.lower() in ["lead", "inversor", "cliente", "prospecto"]:
            first_name = ""
        salutation = f"Hola {first_name}," if first_name else "Hola,"

        reminder_msg = (
            f"{salutation}\n\n"
            f"Te saluda David de H.O.M.E Properties / Dubai Capital Radar.\n\n"
            f"Te escribo para recordarte que mañana 9 de septiembre y pasado mañana 10 de septiembre "
            f"estaremos en Madrid en el Novotel Madrid Center (Calle O'Donnell, 53) presentando oportunidades exclusivas "
            f"de inversión en Dubái.\n\n"
            f"Tendremos ofertas especiales de hasta un 20% de descuento en proyectos seleccionados y opciones de inversión "
            f"desde los 60K€, válidas únicamente durante los días que estemos presencialmente en España.\n\n"
            f"¿Te gustaría que te reserve un espacio privado de 15 minutos para revisar las opciones y rentabilidades en persona? "
            f"Respóndeme a este mensaje y te asigno tu horario antes de cerrar agenda."
        )

        cursor.execute("""
            UPDATE leads 
            SET personalized_message = ?, 
                whatsapp_status = 'pending'
            WHERE id = ?
        """, (reminder_msg, lead["id"]))

        lead_copy = dict(lead)
        lead_copy["personalized_message"] = reminder_msg
        lead_copy["whatsapp_status"] = "pending"
        sync_lead_background(lead_copy)
        updated_leads.append(lead["id"])

    conn.commit()
    conn.close()

    return {
        "success": True,
        "total_leads": len(all_leads),
        "updated_count": len(updated_leads),
        "protected_count": len(protected_leads),
        "protected_leads": protected_leads
    }

# --- Agency CRUD ---
def create_agency(agency_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    aid = agency_data.get("id") or f"agency_{int(datetime.now().timestamp())}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO agencies (id, name, email, plan, whatsapp_mode, wa_api_key, wa_phone_number_id, wa_accepted_risk, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        aid,
        agency_data.get("name", "New Agency"),
        agency_data.get("email"),
        agency_data.get("plan", "starter"),
        agency_data.get("whatsapp_mode", "baileys"),
        agency_data.get("wa_api_key"),
        agency_data.get("wa_phone_number_id"),
        agency_data.get("wa_accepted_risk", False),
        now_str,
        True
    ))
    conn.commit()
    conn.close()
    return get_agency_by_id(aid)

def get_agency_by_id(agency_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agencies WHERE id = ?", (agency_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_agency_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agencies WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_agency_wa_config(agency_id: str, wa_api_key: str, wa_phone_number_id: str, mode: str, accepted_risk: bool) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE agencies 
    SET wa_api_key = ?, wa_phone_number_id = ?, whatsapp_mode = ?, wa_accepted_risk = ?
    WHERE id = ?
    """, (wa_api_key, wa_phone_number_id, mode, accepted_risk, agency_id))
    conn.commit()
    conn.close()
    return True

def list_agencies() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agencies ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Initialize on import
init_crm_db()
