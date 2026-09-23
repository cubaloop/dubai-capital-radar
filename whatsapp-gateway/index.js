import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  Browsers,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

// Prevent Node process from crashing on unhandled exceptions or socket rejections
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception in WhatsApp Gateway:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection in WhatsApp Gateway:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

const GATEWAY_PORT = process.env.WHATSAPP_PORT || 3001;
const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || 8000;
const AUTH_BASE_DIR = path.join(process.cwd(), 'whatsapp_auth');

if (!fs.existsSync(AUTH_BASE_DIR)) {
  fs.mkdirSync(AUTH_BASE_DIR, { recursive: true });
}

// ─── Supabase Session Persistence ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://jyrqzjctkmzdvmraqrcv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cnF6amN0a216ZHZtcmFxcmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI4MTU3NCwiZXhwIjoyMTAxODU3NTc0fQ.jpzy38i_JqhKiLZwNFXESJo62kk4vWvwCVPLpFIyLjc";
const AUTH_BACKUP_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

function sanitizeAgencyId(agencyId) {
  if (!agencyId) return 'agency_master';
  return String(agencyId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ─── Persistent message store for Baileys retry resolution ───────────────────
const messageStore = new Map();
const MESSAGE_STORE_FILE = path.join(AUTH_BASE_DIR, 'message_store.json');
let messageStoreDirty = false;

// Outbound message ID registry to prevent echo loops
const programmaticSentIds = new Set();
function recordProgrammaticSend(msgId) {
  if (!msgId) return;
  programmaticSentIds.add(msgId);
  if (programmaticSentIds.size > 1000) {
    const oldest = programmaticSentIds.values().next().value;
    programmaticSentIds.delete(oldest);
  }
}

async function restoreMessageStoreFromSupabase() {
  if (!AUTH_BACKUP_ENABLED) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.whatsapp_message_store&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (!rows || !rows.length || !rows[0].comments) return;
    const stored = JSON.parse(rows[0].comments);
    let count = 0;
    for (const [k, v] of Object.entries(stored)) {
      if (!messageStore.has(k)) {
        messageStore.set(k, v);
        count++;
      }
    }
    if (count > 0) console.log(`[Message Store] ✅ Restored ${count} messages from Supabase for retry handling`);
  } catch (e) {
    console.warn('[Message Store] Supabase restore warning:', e.message);
  }
}

async function flushMessageStoreToSupabase() {
  if (!AUTH_BACKUP_ENABLED || !messageStoreDirty) return;
  messageStoreDirty = false;
  try {
    const entries = [...messageStore.entries()];
    const trimmed = Object.fromEntries(entries.slice(-500));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'whatsapp_message_store',
        full_name: 'WhatsApp Message Store',
        phone: '971501378020',
        lead_status: 'SYSTEM',
        campaign_name: 'system_message_store',
        comments: JSON.stringify(trimmed)
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) console.log(`[Message Store] ✅ Flushed ${Object.keys(trimmed).length} messages to Supabase`);
  } catch (e) {
    console.warn('[Message Store] Supabase flush warning:', e.message);
    messageStoreDirty = true;
  }
}

try {
  if (fs.existsSync(MESSAGE_STORE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(MESSAGE_STORE_FILE, 'utf-8'));
    for (const [k, v] of Object.entries(raw)) {
      messageStore.set(k, v);
    }
    console.log(`[Message Store] Loaded ${messageStore.size} cached messages from disk`);
  }
} catch (e) {}

setInterval(flushMessageStoreToSupabase, 60 * 1000);

function saveToMessageStore(id, message) {
  if (!id || !message) return;
  if (messageStore.size > 2000) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
  messageStore.set(id, message);
  messageStoreDirty = true;
  try {
    const obj = Object.fromEntries(messageStore);
    fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(obj), 'utf-8');
  } catch (e) {}
}

// ─── Multi-Session Manager ────────────────────────────────────────────────────
// Map of agencyId -> Session
const sessions = new Map();

class AgencySession {
  constructor(agencyId) {
    this.agencyId = agencyId;
    this.authDir = path.join(AUTH_BASE_DIR, agencyId);
    this.sock = null;
    this.isConnected = false;
    this.connectedNumber = null;
    this.currentQR = null;
    this.lastActivityAt = Date.now();
    this.messagesSentToday = 0;
    this.lastResetDate = new Date().toDateString();
    this.isStarting = false;
    this.backupTimeout = null;

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  resetDailyCounterIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.messagesSentToday = 0;
      this.lastResetDate = today;
    }
  }

  scheduleBackup(delayMs = 10000) {
    if (!AUTH_BACKUP_ENABLED) return;
    if (this.backupTimeout) clearTimeout(this.backupTimeout);
    this.backupTimeout = setTimeout(async () => {
      try {
        await this.uploadAuthToSupabase();
      } catch (e) {
        console.error(`[Session Backup - ${this.agencyId}] Backup error:`, e.message);
      }
    }, delayMs);
  }

  async uploadAuthToSupabase() {
    if (!AUTH_BACKUP_ENABLED) return;
    try {
      const credsPath = path.join(this.authDir, 'creds.json');
      if (!fs.existsSync(credsPath)) return;
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        if (!creds.me || !creds.me.id) return;
      } catch (parseErr) {
        return;
      }

      const files = fs.readdirSync(this.authDir);
      if (!files.length) return;

      const bundle = {};
      for (const file of files) {
        if (file.startsWith('session-') || file === 'message_store.json') continue;
        const filePath = path.join(this.authDir, file);
        bundle[file] = fs.readFileSync(filePath, 'utf-8');
      }

      const recordId = `whatsapp_auth_${this.agencyId}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: recordId,
          full_name: `WhatsApp Auth - ${this.agencyId}`,
          phone: this.connectedNumber || 'unknown',
          lead_status: 'SYSTEM',
          campaign_name: `system_auth_${this.agencyId}`,
          comments: JSON.stringify(bundle)
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        console.log(`[Session Backup] ✅ Auth bundle for ${this.agencyId} backed up to Supabase (${Object.keys(bundle).length} keys)`);
      }
    } catch (err) {
      console.error(`[Session Backup - ${this.agencyId}] Backup error:`, err.message);
    }
  }

  async restoreAuthFromSupabase() {
    if (!AUTH_BACKUP_ENABLED) return false;

    // Try primary key for this agency, or fallback for Surprise Tourism legacy single session
    const candidateKeys = [`whatsapp_auth_${this.agencyId}`];
    if (this.agencyId === 'agency_bd_surprisetourism_com') {
      candidateKeys.push('whatsapp_auth_session');
    }

    for (const key of candidateKeys) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Session Restore - ${this.agencyId}] Querying Supabase for ${key} (attempt ${attempt}/3)...`);
          const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${key}&select=*`, {
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY
            },
            signal: AbortSignal.timeout(20000)
          });

          if (!res.ok) {
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            break;
          }

          const rows = await res.json();
          if (!rows || !rows.length || !rows[0].comments) {
            break; // No rows for this candidate, try next key
          }

          const bundle = JSON.parse(rows[0].comments);
          const fileKeys = Object.keys(bundle);
          if (!bundle['creds.json']) {
            break;
          }

          let restoredCount = 0;
          for (const file of fileKeys) {
            if (file.startsWith('session-') || file === 'message_store.json') continue;
            let content = bundle[file];
            if (file === 'creds.json') {
              try {
                const parsedCreds = JSON.parse(content);
                if (parsedCreds.me && !parsedCreds.registered) {
                  parsedCreds.registered = true;
                  content = JSON.stringify(parsedCreds, null, 2);
                }
              } catch (_) {}
            }
            fs.writeFileSync(path.join(this.authDir, file), content, 'utf-8');
            restoredCount++;
          }

          // Purge stale contact session files
          if (fs.existsSync(this.authDir)) {
            for (const f of fs.readdirSync(this.authDir)) {
              if (f.startsWith('session-')) {
                try { fs.unlinkSync(path.join(this.authDir, f)); } catch (_) {}
              }
            }
          }

          console.log(`[Session Restore - ${this.agencyId}] ✅ Restored ${restoredCount} identity files from Supabase (${key})`);
          return true;
        } catch (err) {
          console.error(`[Session Restore - ${this.agencyId}] Attempt ${attempt} failed:`, err.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    return false;
  }

  async clearAuthFromSupabase() {
    if (!AUTH_BACKUP_ENABLED) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.whatsapp_auth_${this.agencyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        signal: AbortSignal.timeout(5000)
      });
      console.log(`[Session Backup] Deleted whatsapp_auth_${this.agencyId} from Supabase`);
    } catch (err) {
      console.error(`[Session Backup] Error deleting auth from Supabase for ${this.agencyId}:`, err.message);
    }
  }
}

function getOrCreateSession(rawAgencyId) {
  const agencyId = sanitizeAgencyId(rawAgencyId);
  if (!sessions.has(agencyId)) {
    const s = new AgencySession(agencyId);
    sessions.set(agencyId, s);
  }
  return sessions.get(agencyId);
}

// ─── Helpers: Message extraction & webhook forwarding ─────────────────────────
function extractPhoneNumber(remoteJid, participant, remoteJidAlt) {
  const rawJid = participant || remoteJidAlt || remoteJid || '';
  const numPart = rawJid.split('@')[0] || '';
  return numPart.split(':')[0].replace(/[^0-9]/g, '');
}

function extractMessageData(m) {
  let depth = 0;
  while (depth < 6) {
    if (m.ephemeralMessage?.message) {
      m = m.ephemeralMessage.message;
    } else if (m.viewOnceMessage?.message) {
      m = m.viewOnceMessage.message;
    } else if (m.viewOnceMessageV2?.message) {
      m = m.viewOnceMessageV2.message;
    } else if (m.documentWithCaptionMessage?.message) {
      m = m.documentWithCaptionMessage.message;
    } else {
      break;
    }
    depth++;
  }

  const text = (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.documentMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.documentMessage?.fileName ||
    ''
  ).trim();

  const doc = m.documentMessage || null;
  return {
    text,
    hasDocument: !!doc,
    documentFileName: doc?.fileName || null,
    unwrappedMsg: m
  };
}

async function forwardToBackendWebhook(payload) {
  const candidateUrls = [
    `http://127.0.0.1:${BACKEND_PORT}/api/whatsapp/inbound-webhook`,
    `http://localhost:${BACKEND_PORT}/api/whatsapp/inbound-webhook`,
    `http://127.0.0.1:10000/api/whatsapp/inbound-webhook`,
    `https://dubai-capital-radar.onrender.com/api/whatsapp/inbound-webhook`
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        console.log(`✅ [Webhook -> Backend] Delivered to ${targetUrl} (Agency: ${payload.agency_id || 'n/a'}, Sender: ${payload.sender})`);
        return true;
      }
    } catch (err) {}
  }
  return false;
}

// ─── Socket Lifecycle per Session ─────────────────────────────────────────────
async function startSession(agencyId) {
  const session = getOrCreateSession(agencyId);
  if (session.isStarting) return;
  session.isStarting = true;

  try {
    const credsExist = fs.existsSync(path.join(session.authDir, 'creds.json'));
    if (!credsExist) {
      console.log(`[Startup - ${session.agencyId}] No local creds.json found. Checking Supabase...`);
      await session.restoreAuthFromSupabase();
    }

    const { state, saveCreds } = await useMultiFileAuthState(session.authDir);
    const { version } = await fetchLatestBaileysVersion();

    session.sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: Browsers.ubuntu(`Radar-${session.agencyId}`),
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 2000,
      maxMsgRetryCount: 5,
      getMessage: async (key) => {
        if (!key?.id) return undefined;
        if (messageStore.has(key.id)) return messageStore.get(key.id);
        await restoreMessageStoreFromSupabase();
        return messageStore.get(key.id);
      }
    });

    session.sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        session.scheduleBackup(2000);
      } catch (e) {
        console.error(`[creds.update - ${session.agencyId}] Error:`, e.message);
      }
    });

    session.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.currentQR = await QRCode.toDataURL(qr, {
          width: 360,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
        console.log(`[WhatsApp - ${session.agencyId}] New QR code generated. Ready for scanning.`);
      }

      if (connection === 'close') {
        session.isConnected = false;
        session.connectedNumber = null;
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp - ${session.agencyId}] Connection closed (code: ${code}). Reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          const delay = code === 428 ? 10000 : 3000;
          setTimeout(() => startSession(session.agencyId), delay);
        } else {
          console.log(`[WhatsApp - ${session.agencyId}] Logged out - clearing session`);
          await session.clearAuthFromSupabase();
          if (fs.existsSync(session.authDir)) {
            fs.rmSync(session.authDir, { recursive: true, force: true });
            fs.mkdirSync(session.authDir, { recursive: true });
          }
        }
      } else if (connection === 'open') {
        session.isConnected = true;
        session.currentQR = null;
        session.lastActivityAt = Date.now();
        const rawId = session.sock.user?.id || '';
        session.connectedNumber = rawId.split(':')[0] || rawId.split('@')[0];
        console.log(`🎉 [WhatsApp - ${session.agencyId}] Connected successfully as +${session.connectedNumber}`);
        session.scheduleBackup(1000);

        // Auto-sync connected WhatsApp number to agency profile
        try {
          fetch(`http://127.0.0.1:${BACKEND_PORT}/api/agencies/${session.agencyId}/sync-bot-phone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_phone: `+${session.connectedNumber}` })
          }).catch(() => {});
        } catch (_) {}
      }
    });

    session.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages) {
        if (!msg.message) continue;

        if (msg.key && msg.key.id) {
          saveToMessageStore(msg.key.id, msg.message);
        }

        const remoteJid = msg.key.remoteJid || '';
        const isGroup = remoteJid.endsWith('@g.us') || remoteJid.includes('@g.us');
        const isBroadcast = remoteJid === 'status@broadcast' || remoteJid.includes('broadcast');

        if (isGroup || isBroadcast) continue;

        if (msg.key?.id && programmaticSentIds.has(msg.key.id)) continue;

        const isChatWithSelf = session.connectedNumber && (remoteJid.includes(session.connectedNumber) || remoteJid.startsWith(session.connectedNumber));
        if (msg.key.fromMe && !isChatWithSelf) continue;

        const senderNumber = extractPhoneNumber(remoteJid, msg.key.participant, msg.key.remoteJidAlt);
        const { text, hasDocument, documentFileName, unwrappedMsg } = extractMessageData(msg);

        let documentBase64 = null;
        if (hasDocument) {
          try {
            const buffer = await downloadMediaMessage(
              { key: msg.key, message: unwrappedMsg },
              'buffer',
              {},
              { logger: pino({ level: 'silent' }), reuploadRequest: session.sock.updateMediaMessage }
            );
            if (buffer) {
              documentBase64 = buffer.toString('base64');
            }
          } catch (e) {}
        }

        if (!text && !hasDocument) continue;

        console.log(`[Inbound - ${session.agencyId}] Message from ${senderNumber}: "${text.substring(0, 50)}"`);
        session.scheduleBackup();

        forwardToBackendWebhook({
          agency_id: session.agencyId,
          sender: senderNumber,
          jid: remoteJid,
          is_group: false,
          text: text,
          push_name: msg.pushName || '',
          has_document: hasDocument,
          document_file_name: documentFileName,
          document_base64: documentBase64,
          timestamp: msg.messageTimestamp,
          bot_phone: session.connectedNumber || ''
        });
      }
    });

  } catch (err) {
    console.error(`[StartSession - ${session.agencyId}] Error:`, err.message);
    setTimeout(() => startSession(session.agencyId), 5000);
  } finally {
    session.isStarting = false;
  }
}

// ─── Bootstrap All Saved Sessions On Startup ──────────────────────────────────
async function bootstrapAllSessions() {
  await restoreMessageStoreFromSupabase();

  // 1. Check local subdirectories
  const localAgencyIds = new Set();
  if (fs.existsSync(AUTH_BASE_DIR)) {
    for (const f of fs.readdirSync(AUTH_BASE_DIR)) {
      const fullP = path.join(AUTH_BASE_DIR, f);
      if (fs.statSync(fullP).isDirectory() && f !== 'node_modules') {
        localAgencyIds.add(f);
      }
    }
  }

  // 2. Discover agencies in Supabase
  if (AUTH_BACKUP_ENABLED) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=like.whatsapp_auth_%25&select=id,phone`, {
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const rows = await res.json();
        for (const r of rows) {
          const rawId = r.id || '';
          if (rawId === 'whatsapp_auth_session') {
            // Legacy single-session record: map to agency_bd_surprisetourism_com
            localAgencyIds.add('agency_bd_surprisetourism_com');
          } else if (rawId.startsWith('whatsapp_auth_')) {
            const agId = rawId.replace('whatsapp_auth_', '');
            if (agId) localAgencyIds.add(agId);
          }
        }
      }
    } catch (e) {
      console.warn('[Bootstrap] Supabase query warning:', e.message);
    }
  }

  // 3. Always ensure primary agencies are registered
  localAgencyIds.add('agency_bd_surprisetourism_com');
  localAgencyIds.add('agency_master');

  console.log(`[Multi-Session Bootstrap] Initializing ${localAgencyIds.size} agencies:`, Array.from(localAgencyIds));

  // Initialize and spin up sockets
  for (const agId of localAgencyIds) {
    const s = getOrCreateSession(agId);
    startSession(s.agencyId);
  }
}

// ─── REST API Routes ──────────────────────────────────────────────────────────

function resolveTargetSession(req) {
  const reqAgency = req.query?.agency_id || req.body?.agency_id;
  if (reqAgency && reqAgency !== 'all') {
    return getOrCreateSession(reqAgency);
  }
  // If no agency provided, check if agency_master is connected
  const master = sessions.get('agency_master');
  if (master && master.isConnected) return master;

  // Otherwise, return first connected session (e.g. Surprise Tourism)
  for (const [_, s] of sessions.entries()) {
    if (s.isConnected && s.sock) return s;
  }
  return master || getOrCreateSession('agency_master');
}

app.get('/status', (req, res) => {
  const reqAgency = req.query?.agency_id;
  if (reqAgency === 'all') {
    const all = {};
    for (const [id, s] of sessions.entries()) {
      all[id] = {
        connected: s.isConnected,
        phone: s.connectedNumber,
        has_qr: !!s.currentQR,
        agency_id: id
      };
    }
    return res.json({ sessions: all, count: sessions.size });
  }

  const s = resolveTargetSession(req);
  s.lastActivityAt = Date.now();
  return res.json({
    agency_id: s.agencyId,
    connected: s.isConnected,
    phone: s.connectedNumber,
    has_qr: !!s.currentQR,
    gateway_online: true
  });
});

app.get('/qr', (req, res) => {
  const s = resolveTargetSession(req);
  return res.json({
    agency_id: s.agencyId,
    connected: s.isConnected,
    qr: s.currentQR,
    phone: s.connectedNumber
  });
});

app.post('/send', async (req, res) => {
  try {
    const { to, message, image_path, image_url, jid: directJid, agency_id } = req.body;

    if ((!to && !directJid) || (!message && !image_path && !image_url)) {
      return res.status(400).json({ error: 'Missing recipient phone number or content' });
    }

    const s = resolveTargetSession(req);
    if (!s || !s.isConnected || !s.sock) {
      return res.status(503).json({
        success: false,
        error: `WhatsApp no conectado para la agencia ${s ? s.agencyId : 'solicitada'}. Por favor escanea el código QR.`,
        has_qr: !!s?.currentQR,
        agency_id: s?.agencyId || null
      });
    }

    const cleanNumber = (to || '').replace(/[^0-9]/g, '');

    let jid = directJid;
    if (!jid) {
      if (!cleanNumber) {
        return res.status(400).json({ error: 'Missing target phone number or JID' });
      }
      jid = `${cleanNumber}@s.whatsapp.net`;

      try {
        let onWa = null;
        let checkResults = await s.sock.onWhatsApp(cleanNumber);
        if (Array.isArray(checkResults) && checkResults.length > 0) {
          onWa = checkResults[0];
        }

        // Special handling for Mexico numbers (+52 without 1): try fallback with 1
        if ((!onWa || !onWa.exists) && cleanNumber.startsWith('52') && !cleanNumber.startsWith('521') && cleanNumber.length === 12) {
          const mexNumWith1 = '521' + cleanNumber.slice(2);
          const mexCheck = await s.sock.onWhatsApp(mexNumWith1);
          if (Array.isArray(mexCheck) && mexCheck.length > 0 && mexCheck[0].exists) {
            onWa = mexCheck[0];
          }
        }

        if (onWa && onWa.exists && onWa.jid) {
          jid = onWa.jid;
        } else {
          console.log(`[WhatsApp - ${s.agencyId}] Number ${cleanNumber} does NOT exist on WhatsApp. Skipping send.`);
          return res.status(404).json({
            success: false,
            error: 'El número no tiene cuenta de WhatsApp registrada (o la línea telefónica está inactiva/apagada)',
            exists: false,
            phone: cleanNumber
          });
        }
      } catch (onWaErr) {
        console.warn(`[WhatsApp - ${s.agencyId}] onWhatsApp check warning for ${cleanNumber}:`, onWaErr.message);
      }
    }

    console.log(`[WhatsApp - ${s.agencyId}] Dispatching to JID: ${jid} (to: ${to || 'direct'})...`);

    try {
      const hasValidImage = image_path && fs.existsSync(image_path) && fs.statSync(image_path).size > 1000;
      let sentMsg = null;
      if (hasValidImage) {
        const imageBuffer = fs.readFileSync(image_path);
        sentMsg = await s.sock.sendMessage(jid, { image: imageBuffer, caption: message || '' });
      } else if (image_url) {
        sentMsg = await s.sock.sendMessage(jid, { image: { url: image_url }, caption: message || '' });
      } else {
        sentMsg = await s.sock.sendMessage(jid, { text: message });
      }

      if (sentMsg?.key?.id && sentMsg?.message) {
        saveToMessageStore(sentMsg.key.id, sentMsg.message);
        recordProgrammaticSend(sentMsg.key.id);
      }

      s.scheduleBackup();
      s.resetDailyCounterIfNeeded();
      s.messagesSentToday++;
      s.lastActivityAt = Date.now();

      return res.json({
        success: true,
        agency_id: s.agencyId,
        delivered_to: cleanNumber || jid,
        jid,
        message_id: sentMsg?.key?.id,
        exists: true
      });

    } catch (sendErr) {
      console.error(`[WhatsApp - ${s.agencyId}] Send error for ${jid}:`, sendErr.message);
      return res.status(500).json({ success: false, error: sendErr.message, agency_id: s.agencyId });
    }

  } catch (err) {
    console.error('[WhatsApp] Internal error in /send:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/verify-numbers', async (req, res) => {
  try {
    const { numbers } = req.body;
    const s = resolveTargetSession(req);
    if (!s || !s.isConnected || !s.sock) {
      return res.status(503).json({ error: 'WhatsApp not connected for verification' });
    }
    const results = [];
    for (const num of numbers) {
      const clean = num.replace(/[^0-9]/g, '');
      try {
        let checkResults = await s.sock.onWhatsApp(clean);
        let onWa = Array.isArray(checkResults) && checkResults.length > 0 ? checkResults[0] : null;

        // Try Mexico 521 fallback if needed
        if ((!onWa || !onWa.exists) && clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
          const mexNumWith1 = '521' + clean.slice(2);
          const mexCheck = await s.sock.onWhatsApp(mexNumWith1);
          if (Array.isArray(mexCheck) && mexCheck.length > 0 && mexCheck[0].exists) {
            onWa = mexCheck[0];
          }
        }

        results.push({ phone: num, clean, exists: !!(onWa && onWa.exists), jid: onWa?.jid || null });
      } catch (e) {
        results.push({ phone: num, clean, exists: false, error: e.message });
      }
    }
    return res.json({ results, agency_id: s.agencyId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/pairing-code', async (req, res) => {
  try {
    const s = resolveTargetSession(req);
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Falta el número de teléfono' });
    }
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      return res.status(400).json({ success: false, error: 'Número inválido. Incluye prefijo de país.' });
    }
    if (s.isConnected) {
      return res.json({ success: false, error: `Ya está conectado como +${s.connectedNumber} para ${s.agencyId}` });
    }
    if (!s.sock || typeof s.sock.requestPairingCode !== 'function') {
      return res.status(503).json({ success: false, error: 'El servicio WhatsApp se está iniciando. Espera unos segundos e intenta nuevamente.' });
    }
    const rawCode = await s.sock.requestPairingCode(cleanNumber);
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
    console.log(`[WhatsApp - ${s.agencyId}] Pairing code generated for +${cleanNumber}: ${formattedCode}`);
    return res.json({
      success: true,
      agency_id: s.agencyId,
      code: formattedCode,
      raw_code: rawCode,
      phone: cleanNumber
    });
  } catch (err) {
    console.error('[WhatsApp] Pairing code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/restore-session', async (req, res) => {
  try {
    const s = resolveTargetSession(req);
    if (s.sock) {
      try { s.sock.end(undefined); } catch (_) {}
    }
    const success = await s.restoreAuthFromSupabase();
    if (success) {
      s.isConnected = false;
      s.connectedNumber = null;
      s.currentQR = null;
      setTimeout(() => startSession(s.agencyId), 1500);
      return res.json({ success: true, message: `Sesión de ${s.agencyId} restaurada desde Supabase. Reconectando WhatsApp...` });
    } else {
      return res.status(500).json({ success: false, error: `No se pudo restaurar la sesión para ${s.agencyId}` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/logout', async (req, res) => {
  try {
    const s = resolveTargetSession(req);
    if (s.sock) {
      try { await s.sock.logout(); } catch (e) { try { s.sock.end(undefined); } catch (_) {} }
    }
    await s.clearAuthFromSupabase();
    if (fs.existsSync(s.authDir)) {
      fs.rmSync(s.authDir, { recursive: true, force: true });
      fs.mkdirSync(s.authDir, { recursive: true });
    }
    s.isConnected = false;
    s.currentQR = null;
    s.connectedNumber = null;
    setTimeout(() => startSession(s.agencyId), 1500);
    return res.json({ success: true, message: `Sesión de ${s.agencyId} cerrada y reiniciada.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/force-clear-restart', async (req, res) => {
  try {
    const s = resolveTargetSession(req);
    if (s.sock) {
      try { await s.sock.logout(); } catch (e) { try { s.sock.end(undefined); } catch (_) {} }
    }
    if (fs.existsSync(s.authDir)) {
      fs.rmSync(s.authDir, { recursive: true, force: true });
      fs.mkdirSync(s.authDir, { recursive: true });
    }
    await s.clearAuthFromSupabase();
    s.isConnected = false;
    s.currentQR = null;
    s.connectedNumber = null;
    setTimeout(() => startSession(s.agencyId), 2000);
    return res.json({ success: true, message: `Sesión de ${s.agencyId} reseteada y reiniciando...` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Transparent Fallback to FastAPI
app.use(async (req, res) => {
  try {
    const backendUrl = `http://127.0.0.1:${BACKEND_PORT}${req.originalUrl || req.url}`;
    const fHeaders = { ...req.headers };
    delete fHeaders['host'];
    delete fHeaders['content-length'];

    const fetchOptions = {
      method: req.method,
      headers: fHeaders
    };

    if (!['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers['content-type'] = 'application/json';
    }

    const bRes = await fetch(backendUrl, fetchOptions);
    res.status(bRes.status);
    bRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(k, v);
      }
    });
    const buf = await bRes.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (err) {
    return res.status(502).json({ error: 'Backend unreachable', details: err.message });
  }
});

app.listen(GATEWAY_PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Gateway Multi-Tenant] Running on port ${GATEWAY_PORT}`);
  console.log(`[Session Backup] Supabase: ${AUTH_BACKUP_ENABLED ? 'ENABLED' : 'DISABLED'}`);
  bootstrapAllSessions();
});
