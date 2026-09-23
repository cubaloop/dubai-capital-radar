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
import urllib.request
from datetime import datetime
from typing import List, Dict, Any, Optional
from .supabase_sync import sync_lead_background, SUPABASE_URL, SUPABASE_KEY

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

    # Super-Admin Copilot Conversation History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS copilot_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        agency_id TEXT DEFAULT 'agency_master',
        created_at TEXT NOT NULL
    )
    """)
    try:
        cursor.execute("ALTER TABLE copilot_chat ADD COLUMN agency_id TEXT DEFAULT 'agency_master'")
    except Exception:
        pass

    # 5. Agencies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        plan TEXT DEFAULT 'free',
        messages_limit INTEGER DEFAULT 500,
        messages_used INTEGER DEFAULT 0,
        whatsapp_mode TEXT DEFAULT 'baileys',
        wa_api_key TEXT,
        wa_phone_number_id TEXT,
        wa_accepted_risk BOOLEAN DEFAULT FALSE,
        created_at TEXT,
        is_active BOOLEAN DEFAULT TRUE
    )
    """)

    # Migrations for existing agencies table
    for col, definition in [
        ("messages_limit", "INTEGER DEFAULT 500"),
        ("messages_used", "INTEGER DEFAULT 0"),
        ("admin_phone", "TEXT"),
        ("bot_phone", "TEXT"),
        ("business_niche", "TEXT"),
        ("ai_instructions", "TEXT"),
        ("bot_name", "TEXT DEFAULT 'Jota'"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE agencies ADD COLUMN {col} {definition}")
        except Exception:
            pass

    # Ensure all leads have phone starting with '+'
    try:
        cursor.execute("UPDATE leads SET phone = '+' || clean_phone WHERE phone NOT LIKE '+%' AND clean_phone != ''")
    except Exception:
        pass

    # Seed or ensure default system agencies
    try:
        cursor.execute("SELECT id FROM agencies WHERE id = 'agency_master' OR email = 'davidhabana98@gmail.com'")
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO agencies (id, name, email, plan, messages_limit, messages_used, whatsapp_mode, admin_phone, bot_phone, created_at, is_active)
            VALUES ('agency_master', 'H.O.M.E Properties / Dubai Capital Radar', 'davidhabana98@gmail.com', 'enterprise', -1, 0, 'baileys', '+971508379080', '+971501378020', '2026-08-01 00:00:00', 1)
            """)
        else:
            cursor.execute("UPDATE agencies SET admin_phone = '+971508379080', bot_phone = '+971501378020' WHERE id = 'agency_master' OR email = 'davidhabana98@gmail.com'")

        cursor.execute("SELECT id FROM agencies WHERE id = 'agency_bd_surprisetourism_com' OR email = 'bd@surprisetourism.com'")
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO agencies (id, name, email, plan, messages_limit, messages_used, whatsapp_mode, admin_phone, bot_phone, created_at, is_active)
            VALUES ('agency_bd_surprisetourism_com', 'Surprise Tourism', 'bd@surprisetourism.com', 'free', 500, 0, 'baileys', '+971564317976', '+971545932205', '2026-09-20 00:00:00', 1)
            """)
        else:
            cursor.execute("UPDATE agencies SET admin_phone = '+971564317976', bot_phone = '+971545932205' WHERE id = 'agency_bd_surprisetourism_com' OR email = 'bd@surprisetourism.com'")
    except Exception as e:
        print("[CRM DB] Notice seeding agencies:", e)

    conn.commit()

    # Auto-seed initial campaigns if empty
    cursor.execute("SELECT COUNT(*) FROM campaigns")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_campaigns(conn)
    else:
        # Ensure Spain campaign and its leads are fully seeded
        seed_spain_campaign(conn)
        cursor.execute("SELECT COUNT(*) FROM campaigns WHERE id = 'campaign_demo_studios'")
        if cursor.fetchone()[0] == 0:
            seed_initial_campaigns(conn)

    # Always ensure Surprise Tourism's leads LATAM campaign is seeded
    seed_latam_campaign(conn)

    # Hydrate sent/failed lead statuses from Supabase so redeploys never repeat leads
    hydrate_leads_from_supabase(conn)

    # Hydrate custom campaigns & leads uploaded via Excel from Supabase
    hydrate_campaigns_from_supabase(conn)

    conn.close()

    # Hydrate agency configs (admin_phone, bot_phone, etc.) from Supabase
    hydrate_agencies_from_supabase()

def hydrate_leads_from_supabase(conn):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        url = f"{SUPABASE_URL}/rest/v1/leads?id=like.latam_lead_%25&select=id,comments"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            cursor = conn.cursor()
            updated = 0
            for r in rows:
                lid = r.get("id")
                raw_comments = r.get("comments")
                if not lid or not raw_comments:
                    continue
                try:
                    meta = json.loads(raw_comments) if isinstance(raw_comments, str) else raw_comments
                    ws = meta.get("whatsapp_status")
                    lcd = meta.get("last_contact_date")
                    lst = meta.get("last_sent_type")
                    if ws in ("sent", "failed"):
                        cursor.execute("""
                        UPDATE leads
                        SET whatsapp_status = ?,
                            last_contact_date = COALESCE(?, last_contact_date),
                            last_sent_type = COALESCE(?, last_sent_type)
                        WHERE id = ?
                        """, (ws, lcd, lst, lid))
                        updated += cursor.rowcount
                except Exception:
                    pass
            conn.commit()
            if updated > 0:
                print(f"[Supabase Hydration] Restored sent/failed status for {updated} leads from cloud database")
    except Exception as e:
        print("[Supabase Hydration] Warning:", e)

def backup_campaign_to_supabase(campaign_id: str):
    """Backs up a full campaign and its leads to Supabase leads table under camp_data_<id>."""
    if not SUPABASE_URL or not SUPABASE_KEY or not campaign_id:
        return
    try:
        camp = get_campaign_by_id(campaign_id)
        if not camp:
            return
        leads = get_leads_by_campaign(campaign_id)
        bundle = {
            "campaign": dict(camp),
            "leads": [dict(l) for l in leads]
        }
        bundle_json = json.dumps(bundle, ensure_ascii=False)
        record = {
            "id": f"camp_data_{campaign_id}",
            "name": camp.get("name", "Campaign"),
            "email": "system@dubaicapitalradar.com",
            "phone": "+971501378020",
            "country": "CampaignBundle",
            "budget_eur": len(leads),
            "status": "active",
            "comments": bundle_json
        }
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/leads",
            data=json.dumps([record]).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
    except Exception as e:
        print(f"[Supabase Campaign Backup] Warning for {campaign_id}: {e}")

def hydrate_campaigns_from_supabase(conn):
    """Restores all custom uploaded campaigns and leads from Supabase on system startup."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/leads?id=like.camp_data_%&select=id,comments",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            if not rows:
                return
            cursor = conn.cursor()
            restored_count = 0
            for r in rows:
                comments_raw = r.get("comments")
                if not comments_raw:
                    continue
                try:
                    data = json.loads(comments_raw)
                    camp = data.get("campaign", {})
                    leads = data.get("leads", [])
                    cid = camp.get("id")
                    if not cid:
                        continue
                    
                    cursor.execute("""
                    INSERT OR REPLACE INTO campaigns (id, name, category, description, attached_flyer, ai_prompt_instructions, agency_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        cid, camp.get("name"), camp.get("category"), camp.get("description"),
                        camp.get("attached_flyer"), camp.get("ai_prompt_instructions"),
                        camp.get("agency_id"), camp.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    ))
                    
                    for l in leads:
                        cursor.execute("""
                        INSERT OR REPLACE INTO leads (
                            id, campaign_id, name, phone, clean_phone, email,
                            budget_aed, budget_eur, objective, timeline, notes,
                            crm_status, whatsapp_status, last_contact_date, last_sent_type,
                            personalized_message, next_reminder_date, agency_id, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            l.get("id"), cid, l.get("name"), l.get("phone"), l.get("clean_phone"),
                            l.get("email"), l.get("budget_aed"), l.get("budget_eur"),
                            l.get("objective"), l.get("timeline"), l.get("notes"),
                            l.get("crm_status", "CREATED"), l.get("whatsapp_status", "pending"),
                            l.get("last_contact_date"), l.get("last_sent_type"),
                            l.get("personalized_message"), l.get("next_reminder_date"),
                            l.get("agency_id"), l.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        ))
                    restored_count += 1
                except Exception as row_err:
                    print(f"[Supabase Campaign Restore] Row error: {row_err}")
            conn.commit()
            if restored_count > 0:
                print(f"[Supabase Hydration] Restored {restored_count} custom campaigns from cloud.")
    except Exception as e:
        print(f"[Supabase Hydration] Warning during campaign restore: {e}")

def seed_latam_campaign(conn):
    cursor = conn.cursor()
    cid = "camp_latam_surprise"
    cname = "leads LATAM"
    now_str = "2026-09-20 00:00:00"

    cursor.execute("""
    INSERT OR IGNORE INTO campaigns (id, name, category, description, attached_flyer, ai_prompt_instructions, agency_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        cid,
        cname,
        "Turismo Dubai",
        "Viajeros y turistas LATAM interesados en paquetes turísticos y experiencias VIP en Dubái - Asesora Carol Serra",
        "",
        "Preséntate como Carol Serra de Surprise Tourism Dubai. Te contacto para presentarte experiencias turísticas exclusivas y paquetes VIP para conocer Dubai (safaris en el desierto, yates privados, hoteles 5 estrellas y tours en Abu Dhabi). Pregúntale cordialmente si desea que le enviemos el catálogo digital e itinerarios por WhatsApp.",
        "agency_bd_surprisetourism_com",
        now_str
    ))

    # Also ensure any other uploaded LATAM campaigns keep the agency tag and tourism prompt
    cursor.execute("""
    UPDATE campaigns 
    SET agency_id = 'agency_bd_surprisetourism_com',
        category = 'Turismo Dubai',
        description = 'Viajeros y turistas LATAM interesados en paquetes turísticos y experiencias VIP en Dubái - Asesora Carol Serra',
        ai_prompt_instructions = 'Preséntate como Carol Serra de Surprise Tourism Dubai. Te contacto para presentarte experiencias turísticas exclusivas y paquetes VIP para conocer Dubai (safaris en el desierto, yates privados, hoteles 5 estrellas y tours en Abu Dhabi). Pregúntale cordialmente si desea que le enviemos el catálogo digital e itinerarios por WhatsApp.'
    WHERE id = ? OR name LIKE '%leads LATAM%'
    """, (cid,))

    latam_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outreach", "latam_campaign_leads.json")
    if os.path.exists(latam_json_path):
        with open(latam_json_path, "r", encoding="utf-8") as f:
            leads = json.load(f)

        for idx, l in enumerate(leads):
            lid = f"latam_lead_{idx + 1}"
            raw_phone = l.get("phone", "")
            if not raw_phone.startswith("+"):
                raw_phone = "+" + raw_phone
            clean_digits = "".join([c for c in raw_phone if c.isdigit()])

            cursor.execute("""
            INSERT OR IGNORE INTO leads (
                id, campaign_id, name, phone, clean_phone, email,
                objective, timeline, notes, crm_status, whatsapp_status,
                last_contact_date, last_sent_type, personalized_message,
                next_reminder_date, agency_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lid,
                cid,
                l.get("name", f"Lead #{idx + 1}"),
                raw_phone,
                clean_digits,
                "",
                "Turismo y Experiencias VIP Dubai",
                "Inmediato",
                l.get("notes", "Origen: Meta Ads | Agencia: Surprise Tourism | Asesora: Carol Serra"),
                "CREATED",
                "pending",
                None,
                None,
                f"Hola {l.get('name', '')}, te contacto desde Surprise Tourism Dubai para presentarte nuestras experiencias y paquetes turísticos exclusivos para conocer Dubai. ¿Te gustaría recibir nuestro catálogo digital e itinerario?",
                None,
                "agency_bd_surprisetourism_com",
                now_str
            ))

    cursor.execute("""
    UPDATE leads 
    SET objective = 'Turismo y Experiencias VIP Dubai' 
    WHERE campaign_id = ? AND (objective LIKE '%Inversión%' OR objective LIKE '%inversion%')
    """, (cid,))

    conn.commit()

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

    # Seed Demo campaign
    try:
        cursor.execute("""
        INSERT OR IGNORE INTO campaigns (id, name, category, description, attached_flyer, ai_prompt_instructions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "campaign_demo_studios",
            "Demo",
            "Dubai Studios Off-Plan",
            "Ofertas de estudios desde 550K AED",
            "",
            "Hi, i have new offerts from 550K for Studios",
            "2026-09-11 12:00:00"
        ))

        demo_leads = [
            {
                "id": "studio_demo_lead_sandeep",
                "name": "Sandeep",
                "phone": "+971569588338",
                "clean_phone": "971569588338",
                "email": "",
                "budget_aed": 550000,
                "objective": "Studios from 550K",
                "timeline": "Immediate",
                "notes": "Demo lead - Studios 550K offer",
                "crm_status": "CREATED",
                "whatsapp_status": "pending",
                "personalized_message": "Hi Sandeep, i have new offerts from 550K for Studios"
            },
            {
                "id": "studio_demo_lead_anirban",
                "name": "Anirban",
                "phone": "+971502556248",
                "clean_phone": "971502556248",
                "email": "",
                "budget_aed": 550000,
                "objective": "Studios from 550K",
                "timeline": "Immediate",
                "notes": "Demo lead - Studios 550K offer",
                "crm_status": "CREATED",
                "whatsapp_status": "pending",
                "personalized_message": "Hi Anirban, i have new offerts from 550K for Studios"
            }
        ]

        for l in demo_leads:
            cursor.execute("""
            INSERT OR IGNORE INTO leads (
                id, campaign_id, name, phone, clean_phone, email,
                budget_aed, objective, timeline, notes,
                crm_status, whatsapp_status, personalized_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                l["id"],
                "campaign_demo_studios",
                l["name"],
                l["phone"],
                l["clean_phone"],
                l["email"],
                l["budget_aed"],
                l["objective"],
                l["timeline"],
                l["notes"],
                l["crm_status"],
                l["whatsapp_status"],
                l["personalized_message"],
                "2026-09-11 12:00:00"
            ))
    except Exception as e:
        print("[CRM DB] Notice seeding Demo leads:", e)

    conn.commit()

# --- Public API methods ---

def is_admin_agency_or_user(agency_id_or_email: str) -> bool:
    if not agency_id_or_email:
        return False
    admin_tokens = ["admin", "superadmin", "master", "davidhabana", "dvdaguez", "director@outpilot.ae"]
    low = str(agency_id_or_email).lower()
    if any(tok in low for tok in admin_tokens):
        return True
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM agencies WHERE id = ?", (agency_id_or_email,))
        row = cursor.fetchone()
        conn.close()
        if row and row["email"]:
            email_low = row["email"].lower()
            if any(tok in email_low for tok in admin_tokens):
                return True
    except Exception:
        pass
    return False

def get_campaigns_list(agency_id: str = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if agency_id:
        if is_admin_agency_or_user(agency_id):
            cursor.execute("""
            SELECT c.*,
                   COUNT(l.id) as total_leads,
                   SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent_leads
            FROM campaigns c
            LEFT JOIN leads l ON c.id = l.campaign_id
            WHERE c.agency_id = ? OR c.agency_id IS NULL
            GROUP BY c.id
            ORDER BY c.created_at DESC
            """, (agency_id,))
        else:
            cursor.execute("""
            SELECT c.*,
                   COUNT(l.id) as total_leads,
                   SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent_leads
            FROM campaigns c
            LEFT JOIN leads l ON c.id = l.campaign_id
            WHERE c.agency_id = ?
               OR c.agency_id = (SELECT id FROM agencies WHERE email = ? LIMIT 1)
               OR c.agency_id IN (
                   SELECT a2.id FROM agencies a1
                   JOIN agencies a2 ON a1.email = a2.email
                   WHERE a1.id = ? OR a1.email = ?
               )
            GROUP BY c.id
            ORDER BY c.created_at DESC
            """, (agency_id, agency_id, agency_id, agency_id))
    else:
        # Default safety: if unauthenticated, return empty list
        cursor.execute("""
        SELECT c.*,
               COUNT(l.id) as total_leads,
               SUM(CASE WHEN l.whatsapp_status = 'sent' THEN 1 ELSE 0 END) as sent_leads
        FROM campaigns c
        LEFT JOIN leads l ON c.id = l.campaign_id
        WHERE 1 = 0
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
    agency_id = campaign_data.get("agency_id") or None
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO campaigns (id, name, category, description, attached_flyer, ai_prompt_instructions, agency_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, cname, category, description, attached_flyer, ai_prompt, agency_id, now_str))

    for idx, l in enumerate(leads_data):
        lid = l.get("id") or f"lead_{cid}_{idx + 1}"
        phone = l.get("phone", "")
        clean_phone = "".join([c for c in phone if c.isdigit()])
        lead_agency_id = l.get("agency_id") or agency_id or None
        
        cursor.execute("""
        INSERT INTO leads (
            id, campaign_id, name, phone, clean_phone, email,
            budget_aed, budget_eur, objective, timeline, notes,
            crm_status, whatsapp_status, last_contact_date, last_sent_type,
            personalized_message, next_reminder_date, agency_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            lead_agency_id,
            now_str
        ))

    conn.commit()
    conn.close()
    backup_campaign_to_supabase(cid)
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

def mark_lead_whatsapp_failed(lead_id: str, reason: str = "failed") -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    UPDATE leads
    SET whatsapp_status = 'failed',
        notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || ' | ' || ? END
    WHERE id = ?
    """, (f"WhatsApp Error: {reason}", f"WhatsApp Error: {reason}", lead_id))
    
    note_id = f"note_{int(datetime.now().timestamp() * 1000)}"
    cursor.execute("""
    INSERT INTO lead_notes (id, lead_id, author, content, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        note_id,
        lead_id,
        "Sistema WhatsApp",
        f"Envío fallido: {reason}",
        "whatsapp",
        now_str
    ))
    conn.commit()
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    updated_lead = cursor.fetchone()
    conn.close()
    if updated_lead:
        sync_lead_background(dict(updated_lead))
    return True

def update_lead_crm_fields(lead_id: str, updates: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    allowed = ["name", "phone", "clean_phone", "email", "budget_aed", "budget_eur", "objective", "timeline", "notes", "crm_status", "next_reminder_date"]
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

def get_all_crm_leads(agency_id: str = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if agency_id:
        if is_admin_agency_or_user(agency_id):
            cursor.execute("""
            SELECT l.*, c.name as campaign_name, c.category as campaign_category
            FROM leads l
            LEFT JOIN campaigns c ON l.campaign_id = c.id
            WHERE l.agency_id = ? OR c.agency_id = ? OR (l.agency_id IS NULL AND (c.agency_id IS NULL OR c.agency_id = ?))
            ORDER BY l.last_contact_date DESC NULLS LAST, l.created_at DESC
            """, (agency_id, agency_id, agency_id))
        else:
            cursor.execute("""
            SELECT l.*, c.name as campaign_name, c.category as campaign_category
            FROM leads l
            LEFT JOIN campaigns c ON l.campaign_id = c.id
            WHERE (
                l.agency_id = ? OR c.agency_id = ?
                OR l.agency_id = (SELECT id FROM agencies WHERE email = ? LIMIT 1)
                OR c.agency_id = (SELECT id FROM agencies WHERE email = ? LIMIT 1)
                OR l.agency_id IN (
                    SELECT a2.id FROM agencies a1
                    JOIN agencies a2 ON a1.email = a2.email
                    WHERE a1.id = ? OR a1.email = ?
                )
                OR c.agency_id IN (
                    SELECT a2.id FROM agencies a1
                    JOIN agencies a2 ON a1.email = a2.email
                    WHERE a1.id = ? OR a1.email = ?
                )
            )
            ORDER BY l.last_contact_date DESC NULLS LAST, l.created_at DESC
            """, (agency_id, agency_id, agency_id, agency_id, agency_id, agency_id, agency_id, agency_id))
    else:
        # Default safety: unauthenticated queries return empty list
        cursor.execute("""
        SELECT l.*, c.name as campaign_name, c.category as campaign_category
        FROM leads l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE 1 = 0
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
        backup_campaign_to_supabase(updated_lead["campaign_id"])
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

    # Progressive Hydration:
    # 1. Synthesize first batch (up to 8 leads) synchronously so the user gets instant UI update (<3s)
    # 2. Persist each lead immediately to DB
    # 3. Process remaining leads in background task with rate-pacing to respect Groq RPM limits
    sync_batch_size = min(8, len(leads_to_update))
    immediate_leads = leads_to_update[:sync_batch_size]
    background_leads = leads_to_update[sync_batch_size:]

    async def generate_and_save_lead(lead_dict):
        try:
            msg = await compose_lead_message_ai(lead_dict, active_prompt, camp_name)
        except Exception as e:
            print(f"[Lead AI Gen Error {lead_dict.get('id')}]: {e}")
            msg = compose_lead_message_local(lead_dict, active_prompt, camp_name)
        
        c = get_db_connection()
        cur = c.cursor()
        cur.execute("UPDATE leads SET personalized_message = ? WHERE id = ?", (msg, lead_dict["id"]))
        c.commit()
        c.close()
        return lead_dict["id"], msg

    if immediate_leads:
        await asyncio.gather(*[generate_and_save_lead(l) for l in immediate_leads])

    async def process_remaining_leads_worker(remaining_list, prompt, name):
        for l in remaining_list:
            try:
                msg = await compose_lead_message_ai(l, prompt, name)
            except Exception as e:
                print(f"[BG Lead AI Gen Error {l.get('id')}]: {e}")
                msg = compose_lead_message_local(l, prompt, name)
            try:
                c = get_db_connection()
                cur = c.cursor()
                cur.execute("UPDATE leads SET personalized_message = ? WHERE id = ?", (msg, l["id"]))
                c.commit()
                c.close()
            except Exception as dbe:
                print(f"[BG DB Save Error {l.get('id')}]: {dbe}")
            await asyncio.sleep(0.8)

    if background_leads:
        asyncio.create_task(process_remaining_leads_worker(background_leads, active_prompt, camp_name))

    ai_active = bool(os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))

    return {
        "success": True,
        "campaign_id": campaign_id,
        "prompt_instructions": active_prompt,
        "updated_count": len(leads_to_update),
        "ai_used": ai_active
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

def save_copilot_message_db(role: str, content: str, agency_id: str = "agency_master"):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO copilot_chat (role, content, agency_id, created_at) VALUES (?, ?, ?, ?)", (role, content, agency_id, now_str))
    conn.commit()
    conn.close()

def get_recent_copilot_history_db(limit: int = 14, agency_id: str = "agency_master") -> List[Dict[str, str]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if agency_id:
        cursor.execute("SELECT role, content FROM copilot_chat WHERE agency_id = ? ORDER BY id DESC LIMIT ?", (agency_id, limit))
    else:
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

# --- Agency CRUD & Quotas ---
PLAN_LIMITS = {
    "free": 500,
    "starter": 2000,
    "professional": 15000,
    "enterprise": -1 # Unlimited
}

def create_agency(agency_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    email = (agency_data.get("email") or "").lower().strip()
    clean_email_slug = "".join([c if c.isalnum() else "_" for c in email])
    aid = agency_data.get("id") or (f"agency_{clean_email_slug}" if clean_email_slug else f"agency_{int(datetime.now().timestamp())}")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    plan = agency_data.get("plan", "free")
    messages_limit = agency_data.get("messages_limit", PLAN_LIMITS.get(plan, 500))
    messages_used = agency_data.get("messages_used", 0)

    cursor.execute("""
    INSERT INTO agencies (
        id, name, email, plan, messages_limit, messages_used,
        whatsapp_mode, wa_api_key, wa_phone_number_id, wa_accepted_risk, created_at, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        aid,
        agency_data.get("name", "New Agency"),
        agency_data.get("email"),
        plan,
        messages_limit,
        messages_used,
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

def get_agency_quota(agency_id_or_email: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agencies WHERE id = ? OR email = ?", (agency_id_or_email, agency_id_or_email))
    row = cursor.fetchone()
    conn.close()
    if not row:
        # Default fallback for new unregistered agency or guest: 500 free trial
        return {
            "plan": "free",
            "messages_limit": 500,
            "messages_used": 0,
            "messages_remaining": 500,
            "is_unlimited": False,
            "has_quota": True
        }
    data = dict(row)
    limit = data.get("messages_limit", 500)
    used = data.get("messages_used", 0)
    is_unlimited = (limit == -1)
    remaining = -1 if is_unlimited else max(0, limit - used)
    return {
        "agency_id": data.get("id"),
        "name": data.get("name"),
        "plan": data.get("plan", "free"),
        "messages_limit": limit,
        "messages_used": used,
        "messages_remaining": remaining,
        "is_unlimited": is_unlimited,
        "has_quota": is_unlimited or (remaining > 0)
    }

def consume_agency_quota(agency_id_or_email: str, count: int = 1) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, plan, messages_limit, messages_used FROM agencies WHERE id = ? OR email = ?", (agency_id_or_email, agency_id_or_email))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": True, "remaining": max(0, 500 - count)}
    data = dict(row)
    aid = data["id"]
    limit = data.get("messages_limit", 500)
    used = data.get("messages_used", 0)
    if limit != -1 and (used + count) > limit:
        conn.close()
        return {
            "success": False,
            "error": "Has alcanzado el límite de 500 mensajes de prueba gratuitos. Actualiza tu plan para continuar.",
            "remaining": 0
        }
    new_used = used + count
    cursor.execute("UPDATE agencies SET messages_used = ? WHERE id = ?", (new_used, aid))
    conn.commit()
    conn.close()
    remaining = -1 if limit == -1 else max(0, limit - new_used)
    return {"success": True, "remaining": remaining, "messages_used": new_used}

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

def get_agency_by_phone(phone_or_jid: str) -> Optional[Dict[str, Any]]:
    if not phone_or_jid:
        return None
    digits = "".join([c for c in phone_or_jid if c.isdigit()])
    if len(digits) < 7:
        return None
    suffix = digits[-8:]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM agencies 
    WHERE admin_phone LIKE ? 
       OR admin_phone LIKE ?
       OR bot_phone LIKE ?
       OR bot_phone LIKE ?
    LIMIT 1
    """, (f"%{digits}%", f"%{suffix}", f"%{digits}%", f"%{suffix}"))
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

def backup_agency_to_supabase(agency_data: Dict[str, Any]):
    """Persists agency configuration to Supabase leads table so it survives Render dyno restarts."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        aid = agency_data.get("id")
        if not aid:
            return
        payload = {
            "id": f"agency_config_{aid}",
            "full_name": agency_data.get("name") or aid,
            "phone": agency_data.get("admin_phone") or agency_data.get("bot_phone") or "system",
            "lead_status": "SYSTEM_AGENCY",
            "campaign_name": "agency_configs",
            "comments": json.dumps(agency_data)
        }
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/leads",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            },
            data=json.dumps(payload).encode("utf-8")
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
    except Exception as e:
        print(f"[Supabase Agency Backup] Warning for {agency_data.get('id')}: {e}")

def hydrate_agencies_from_supabase():
    """Restores all agency configurations from Supabase on system startup."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/leads?id=like.agency_config_%&select=id,comments",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            if not rows:
                return
            conn = get_db_connection()
            cursor = conn.cursor()
            for r in rows:
                comments_raw = r.get("comments")
                if not comments_raw:
                    continue
                try:
                    cfg = json.loads(comments_raw)
                    aid = cfg.get("id")
                    if not aid:
                        continue
                    cursor.execute("SELECT id FROM agencies WHERE id = ?", (aid,))
                    if cursor.fetchone():
                        cursor.execute("""
                        UPDATE agencies
                        SET name = COALESCE(?, name),
                            email = COALESCE(?, email),
                            admin_phone = COALESCE(?, admin_phone),
                            bot_phone = COALESCE(?, bot_phone),
                            business_niche = COALESCE(?, business_niche),
                            ai_instructions = COALESCE(?, ai_instructions),
                            bot_name = COALESCE(?, bot_name)
                        WHERE id = ?
                        """, (
                            cfg.get("name"), cfg.get("email"), cfg.get("admin_phone"),
                            cfg.get("bot_phone"), cfg.get("business_niche"),
                            cfg.get("ai_instructions"), cfg.get("bot_name"), aid
                        ))
                    else:
                        cursor.execute("""
                        INSERT INTO agencies (id, name, email, plan, messages_limit, messages_used, whatsapp_mode, admin_phone, bot_phone, business_niche, ai_instructions, bot_name, created_at, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            aid, cfg.get("name", "New Agency"), cfg.get("email", ""),
                            cfg.get("plan", "free"), cfg.get("messages_limit", 500),
                            cfg.get("messages_used", 0), cfg.get("whatsapp_mode", "baileys"),
                            cfg.get("admin_phone", ""), cfg.get("bot_phone", ""),
                            cfg.get("business_niche", ""), cfg.get("ai_instructions", ""),
                            cfg.get("bot_name", "Jota"), cfg.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")), 1
                        ))
                except Exception:
                    continue
            conn.commit()
            conn.close()
            print(f"[Supabase Hydration] Restored/verified {len(rows)} agency configurations from cloud.")
    except Exception as e:
        print(f"[Supabase Hydration] Warning during agency restore: {e}")

def create_or_update_agency_db(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    raw_email = (payload.get("email") or "").strip().lower()
    raw_id = payload.get("id") or (f"agency_{raw_email.replace('@', '_').replace('.', '_')}" if raw_email else "")
    agency_id = "".join([c if c.isalnum() or c in ('_', '-') else '_' for c in raw_id]) if raw_id else ""
    
    existing = None
    if agency_id:
        cursor.execute("SELECT * FROM agencies WHERE id = ?", (agency_id,))
        existing = cursor.fetchone()
    if not existing and raw_email:
        cursor.execute("SELECT * FROM agencies WHERE email = ?", (raw_email,))
        existing = cursor.fetchone()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if existing:
        e = dict(existing)
        agency_id = e["id"]
        name = payload["name"] if "name" in payload and payload["name"] is not None else e.get("name")
        email = payload["email"] if "email" in payload and payload["email"] is not None else e.get("email")
        plan = payload["plan"] if "plan" in payload and payload["plan"] is not None else e.get("plan", "free")
        messages_limit = payload["messages_limit"] if "messages_limit" in payload and payload["messages_limit"] is not None else e.get("messages_limit", 500)
        admin_phone = payload["admin_phone"] if "admin_phone" in payload and payload["admin_phone"] is not None else e.get("admin_phone")
        bot_phone = payload["bot_phone"] if "bot_phone" in payload and payload["bot_phone"] is not None else e.get("bot_phone")
        whatsapp_mode = payload["whatsapp_mode"] if "whatsapp_mode" in payload and payload["whatsapp_mode"] is not None else e.get("whatsapp_mode", "baileys")
        business_niche = payload["business_niche"] if "business_niche" in payload and payload["business_niche"] is not None else e.get("business_niche")
        ai_instructions = payload["ai_instructions"] if "ai_instructions" in payload and payload["ai_instructions"] is not None else e.get("ai_instructions")
        bot_name = payload["bot_name"] if "bot_name" in payload and payload["bot_name"] is not None else e.get("bot_name", "Jota")

        cursor.execute("""
        UPDATE agencies
        SET name = ?, email = ?, plan = ?, messages_limit = ?, admin_phone = ?, bot_phone = ?,
            whatsapp_mode = ?, business_niche = ?, ai_instructions = ?, bot_name = ?
        WHERE id = ?
        """, (name, email, plan, messages_limit, admin_phone, bot_phone, whatsapp_mode, business_niche, ai_instructions, bot_name, agency_id))
    else:
        if not agency_id:
            agency_id = f"agency_{int(datetime.now().timestamp())}"
        name = payload.get("name") or "Nueva Empresa"
        email = raw_email
        plan = payload.get("plan") or "free"
        messages_limit = payload.get("messages_limit", 500)
        admin_phone = payload.get("admin_phone") or ""
        bot_phone = payload.get("bot_phone") or ""
        whatsapp_mode = payload.get("whatsapp_mode") or "baileys"
        business_niche = payload.get("business_niche") or ""
        ai_instructions = payload.get("ai_instructions") or ""
        bot_name = payload.get("bot_name") or "Jota"

        cursor.execute("""
        INSERT INTO agencies (
            id, name, email, plan, messages_limit, messages_used,
            whatsapp_mode, admin_phone, bot_phone, business_niche, ai_instructions, bot_name, created_at, is_active
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (agency_id, name, email, plan, messages_limit, whatsapp_mode, admin_phone, bot_phone, business_niche, ai_instructions, bot_name, now_str))

    conn.commit()
    cursor.execute("SELECT * FROM agencies WHERE id = ?", (agency_id,))
    row = cursor.fetchone()
    conn.close()
    
    agency_res = dict(row) if row else {}
    if agency_res:
        backup_agency_to_supabase(agency_res)
    return agency_res

# Initialize on import
init_crm_db()
