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

const app = express();
app.use(cors());
app.use(express.json());

const GATEWAY_PORT = process.env.WHATSAPP_PORT || 3001;
const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || 8000;
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth');

// ─── Supabase Session Persistence ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://jyrqzjctkmzdvmraqrcv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cnF6amN0a216ZHZtcmFxcmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI4MTU3NCwiZXhwIjoyMTAxODU3NTc0fQ.jpzy38i_JqhKiLZwNFXESJo62kk4vWvwCVPLpFIyLjc";
const AUTH_BACKUP_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function clearAuthFromSupabase() {
  if (!AUTH_BACKUP_ENABLED) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.whatsapp_auth_session`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      signal: AbortSignal.timeout(5000)
    });
    console.log(`[Session Backup] Deleted whatsapp_auth_session from Supabase (status: ${res.status})`);
  } catch (err) {
    console.error('[Session Backup] Error deleting Supabase session:', err.message);
  }
}

async function uploadAuthToSupabase() {
  if (!AUTH_BACKUP_ENABLED) return;
  try {
    const files = fs.readdirSync(AUTH_DIR);
    if (!files.length) return;

    // Bundle all auth files into one JSON payload for atomic persistence
    const bundle = {};
    for (const file of files) {
      const filePath = path.join(AUTH_DIR, file);
      bundle[file] = fs.readFileSync(filePath, 'utf-8');
    }

    // Save into Supabase leads table under the dedicated system record 'whatsapp_auth_session'
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'whatsapp_auth_session',
        full_name: 'WhatsApp Auth Session',
        phone: connectedNumber || '971501378020',
        lead_status: 'SYSTEM',
        campaign_name: 'system_auth',
        comments: JSON.stringify(bundle)
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      console.log(`[Session Backup] ✅ Auth session bundle backed up to Supabase (${files.length} keys)`);
    } else {
      console.log(`[Session Backup] Supabase backup status: ${res.status}`);
    }
  } catch (err) {
    console.error('[Session Backup] Backup error:', err.message);
  }
}

async function restoreAuthFromSupabase() {
  if (!AUTH_BACKUP_ENABLED) {
    console.log('[Session Restore] Supabase not configured - using local auth');
    return false;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.whatsapp_auth_session&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      console.log('[Session Restore] Failed to query Supabase for auth session');
      return false;
    }

    const rows = await res.json();
    if (!rows || !rows.length || !rows[0].comments) {
      console.log('[Session Restore] No previous session bundle found in Supabase');
      return false;
    }

    const bundle = JSON.parse(rows[0].comments);
    const fileKeys = Object.keys(bundle);
    for (const file of fileKeys) {
      fs.writeFileSync(path.join(AUTH_DIR, file), bundle[file], 'utf-8');
    }

    console.log(`[Session Restore] ✅ Restored ${fileKeys.length} session auth keys from Supabase`);
    return true;
  } catch (err) {
    console.error('[Session Restore] Restore failed:', err.message);
    return false;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

let sock = null;
let currentQR = null;
let isConnected = false;
let connectedNumber = null;
let lastActivityAt = Date.now();
let messagesSentToday = 0;
let lastResetDate = new Date().toDateString();

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    messagesSentToday = 0;
    lastResetDate = today;
  }
}

// ─── Self Keep-Alive Pulse ────────────────────────────────────────────────────
const SELF_URL = process.env.SELF_URL || "https://dubai-miami-radar.onrender.com";
if (SELF_URL) {
  setInterval(async () => {
    try {
      const pingUrl = `${SELF_URL}/api/whatsapp/qr`;
      await fetch(pingUrl, { headers: { 'User-Agent': 'WhatsApp-Gateway-Pulse/1.0' } });
      console.log(`[Keep-Alive] Gateway pulse delivered to ${pingUrl} (Preventing Sleep)`);
    } catch (e) {
      // Non-blocking log
    }
  }, 3 * 60 * 1000); // Every 3 minutes
}

// In-memory message store for Baileys retry resolution (resolves "Esperando mensaje / Waiting for message")
const messageStore = new Map();
function saveToMessageStore(id, message) {
  if (!id || !message) return;
  if (messageStore.size > 2000) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
  messageStore.set(id, message);
}

// Debounced auth backup to avoid hammering Supabase while continuously persisting session keys
let authBackupTimeout = null;
function scheduleAuthBackup(delayMs = 15000) {
  if (!AUTH_BACKUP_ENABLED) return;
  if (authBackupTimeout) clearTimeout(authBackupTimeout);
  authBackupTimeout = setTimeout(async () => {
    try {
      await uploadAuthToSupabase();
    } catch (e) {
      console.warn('[Session Backup] Debounced backup warning:', e.message);
    }
  }, delayMs);
}

// Periodic auth backup every 5 minutes when connected to safeguard Signal session ratchet files
setInterval(async () => {
  if (isConnected && AUTH_BACKUP_ENABLED) {
    try {
      await uploadAuthToSupabase();
    } catch (e) {
      // Non-blocking
    }
  }
}, 5 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────

async function startWhatsApp() {
  // Try to restore session from Supabase on startup
  await restoreAuthFromSupabase();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 5,
    getMessage: async (key) => {
      if (key && key.id && messageStore.has(key.id)) {
        return messageStore.get(key.id);
      }
      return undefined;
    }
  });

  sock.ev.on('creds.update', async (creds) => {
    saveCreds();
    // Backup to Supabase every time credentials update
    await uploadAuthToSupabase();
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await QRCode.toDataURL(qr, {
        width: 360,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      console.log('[WhatsApp] New QR code generated (360x360, margin 4, level M). Ready for scanning.');
    }

    if (connection === 'close') {
      isConnected = false;
      connectedNumber = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connection closed (code: ${code}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        const delay = code === 428 ? 10000 : 3000; // Back off on stream error
        setTimeout(startWhatsApp, delay);
      } else {
        // Logged out - clear Supabase backup & local auth
        console.log('[WhatsApp] Logged out - clearing session backup');
        await clearAuthFromSupabase();
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        }
        setTimeout(startWhatsApp, 2000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      connectedNumber = sock.user?.id?.split(':')[0] || 'Linked Phone';
      lastActivityAt = Date.now();
      console.log(`✅ [WhatsApp Gateway] Connected successfully as +${connectedNumber}`);
      // Backup immediately after connecting
      await uploadAuthToSupabase();
    }
  });

  // Helper: Extract clean phone number without device suffixes (:0, :1) or LID noise
  function extractPhoneNumber(jid, participant, remoteJidAlt) {
    const raw = participant || remoteJidAlt || jid || '';
    const userPart = raw.split('@')[0] || '';
    const cleanUser = userPart.split(':')[0] || '';
    return cleanUser.replace(/[^0-9]/g, '');
  }

  // Helper: Unwrap nested message structures (ephemeral, view-once, buttons, captions)
  function extractMessageData(rawMsg) {
    if (!rawMsg || !rawMsg.message) return { text: '', hasDocument: false, documentFileName: null, unwrappedMsg: null };

    let m = rawMsg.message;
    let depth = 0;
    while (m && depth < 5) {
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

  // Helper: Resilient webhook forwarding with fallback to internal and public URLs
  async function forwardToBackendWebhook(payload) {
    const candidateUrls = [
      `http://127.0.0.1:${BACKEND_PORT}/api/whatsapp/inbound-webhook`,
      `http://localhost:${BACKEND_PORT}/api/whatsapp/inbound-webhook`,
      `http://127.0.0.1:8000/api/whatsapp/inbound-webhook`,
      `https://dubai-miami-radar.onrender.com/api/whatsapp/inbound-webhook`
    ];

    for (const targetUrl of candidateUrls) {
      try {
        console.log(`[WhatsApp Gateway -> Webhook] Trying ${targetUrl} for ${payload.sender}...`);
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        const respText = await res.text();
        console.log(`✅ [WhatsApp Gateway -> Webhook] Delivered to ${targetUrl} (HTTP ${res.status}): ${respText.substring(0, 100)}`);
        if (res.ok) return true;
      } catch (err) {
        console.warn(`⚠️ [WhatsApp Gateway -> Webhook] Failed at ${targetUrl}: ${err.message}`);
      }
    }
    console.error(`❌ [WhatsApp Gateway -> Webhook] ALL candidate endpoints failed for sender ${payload.sender}`);
    return false;
  }

  // Listen to incoming messages for Super-Admin copilot & Prospect AI replies
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // Cache message in store to handle potential Baileys retry requests (Signal ratchet sync)
      if (msg.key && msg.key.id) {
        saveToMessageStore(msg.key.id, msg.message);
      }

      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us') || remoteJid.includes('@g.us');

      // STRICT FILTER: completely ignore all WhatsApp groups
      if (isGroup) {
        continue;
      }

      const senderNumber = extractPhoneNumber(remoteJid, msg.key.participant, msg.key.remoteJidAlt);
      const { text, hasDocument, documentFileName, unwrappedMsg } = extractMessageData(msg);

      let documentBase64 = null;
      if (hasDocument) {
        try {
          const buffer = await downloadMediaMessage(
            { key: msg.key, message: unwrappedMsg },
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
          );
          if (buffer) {
            documentBase64 = buffer.toString('base64');
            console.log(`[WhatsApp Inbound] Downloaded document (${buffer.length} bytes): ${documentFileName}`);
          }
        } catch (mediaErr) {
          console.error(`[WhatsApp Inbound] Error downloading document:`, mediaErr.message);
        }
      }

      if (!text && !hasDocument) continue;

      console.log(`[WhatsApp Inbound] 📩 Direct message received from ${senderNumber} (Push: ${msg.pushName || 'Anon'}): "${text.substring(0, 50)}"`);

      // Persist auth keys to Supabase
      scheduleAuthBackup();

      // Forward to Python backend asynchronously
      forwardToBackendWebhook({
        sender: senderNumber,
        jid: remoteJid,
        is_group: false,
        text: text,
        push_name: msg.pushName || '',
        has_document: hasDocument,
        document_file_name: documentFileName,
        document_base64: documentBase64,
        timestamp: msg.messageTimestamp
      }).catch(err => {
        console.error(`[WhatsApp Inbound] Error in forward webhook handler:`, err.message);
      });
    }
  });
}

startWhatsApp();

// ─── API Endpoints ────────────────────────────────────────────────────────────

// Health check + keep-alive target
app.get('/healthz', (req, res) => {
  lastActivityAt = Date.now();
  res.json({
    status: 'ok',
    whatsapp_connected: isConnected,
    phone: connectedNumber,
    messages_sent_today: messagesSentToday,
    session_backup: AUTH_BACKUP_ENABLED ? 'supabase' : 'local_only',
    uptime_seconds: Math.floor(process.uptime())
  });
});

app.get('/status', (req, res) => {
  lastActivityAt = Date.now();
  res.json({
    connected: isConnected,
    phone: connectedNumber,
    has_qr: !!currentQR
  });
});

app.get('/qr', (req, res) => {
  res.json({
    connected: isConnected,
    qr: currentQR,
    phone: connectedNumber
  });
});

app.post('/send', async (req, res) => {
  try {
    const { to, message, image_path, image_url } = req.body;

    if (!to || (!message && !image_path && !image_url)) {
      return res.status(400).json({ error: 'Missing recipient phone number or content' });
    }

    if (!isConnected || !sock) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not connected. Please scan QR code.',
        has_qr: !!currentQR
      });
    }

    const cleanNumber = to.replace(/[^0-9]/g, '');

    // Verify number exists on WhatsApp
    try {
      const checkResults = await sock.onWhatsApp(cleanNumber);
      const onWa = Array.isArray(checkResults) ? checkResults[0] : checkResults;

      if (!onWa || !onWa.exists) {
        console.log(`[WhatsApp] ${cleanNumber} is NOT registered on WhatsApp`);
        return res.json({ 
          success: false, 
          exists: false, 
          error: `The number ${to} is not registered on WhatsApp.` 
        });
      }

      const jid = onWa.jid || `${cleanNumber}@s.whatsapp.net`;

      const hasValidImage = image_path && fs.existsSync(image_path) && fs.statSync(image_path).size > 1000;
      let sentMsg = null;
      if (hasValidImage) {
        const imageBuffer = fs.readFileSync(image_path);
        sentMsg = await sock.sendMessage(jid, { image: imageBuffer, caption: message || '' });
      } else if (image_url) {
        sentMsg = await sock.sendMessage(jid, { image: { url: image_url }, caption: message || '' });
      } else {
        sentMsg = await sock.sendMessage(jid, { text: message });
      }

      // Store in memory for Baileys retry handlers so recipients never get stuck on "Waiting for this message"
      if (sentMsg?.key?.id && sentMsg?.message) {
        saveToMessageStore(sentMsg.key.id, sentMsg.message);
      }
      // Persist auth ratchet state
      scheduleAuthBackup();

      resetDailyCounterIfNeeded();
      messagesSentToday++;
      lastActivityAt = Date.now();
      console.log(`[WhatsApp] Message delivered to +${cleanNumber} (ID: ${sentMsg?.key?.id || 'n/a'})`);
      return res.json({ success: true, delivered_to: cleanNumber, jid, message_id: sentMsg?.key?.id, exists: true });

    } catch (sendErr) {
      console.error(`[WhatsApp] Send error for ${cleanNumber}:`, sendErr.message);
      return res.status(500).json({ success: false, error: sendErr.message });
    }

  } catch (err) {
    console.error('[WhatsApp] Internal error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify multiple numbers at once
app.post('/verify-numbers', async (req, res) => {
  try {
    const { numbers } = req.body;
    if (!isConnected || !sock) {
      return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    const results = [];
    for (const num of numbers) {
      const clean = num.replace(/[^0-9]/g, '');
      try {
        const checkResults = await sock.onWhatsApp(clean);
        const onWa = Array.isArray(checkResults) ? checkResults[0] : checkResults;
        results.push({ phone: num, clean, exists: !!onWa?.exists, jid: onWa?.jid || null });
      } catch (e) {
        results.push({ phone: num, clean, exists: false, error: e.message });
      }
    }
    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: Generate 8-digit Pairing Code for phone number (No camera / QR scan needed)
app.post('/pairing-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Falta el número de teléfono' });
    }
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      return res.status(400).json({ success: false, error: 'Número inválido. Incluye prefijo de país (ej. 971501378020 o 34600000000).' });
    }
    if (isConnected) {
      return res.json({ success: false, error: `Ya está conectado como +${connectedNumber}` });
    }
    if (!sock || typeof sock.requestPairingCode !== 'function') {
      return res.status(503).json({ success: false, error: 'El servicio WhatsApp se está iniciando. Espera unos segundos e intenta nuevamente.' });
    }
    const rawCode = await sock.requestPairingCode(cleanNumber);
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
    console.log(`[WhatsApp] Pairing code generated for +${cleanNumber}: ${formattedCode}`);
    return res.json({
      success: true,
      code: formattedCode,
      raw_code: rawCode,
      phone: cleanNumber
    });
  } catch (err) {
    console.error('[WhatsApp] Pairing code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/logout', async (req, res) => {
  try {
    if (sock) {
      try { await sock.logout(); } catch (e) { try { sock.end(undefined); } catch (_) {} }
    }
    await clearAuthFromSupabase();
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    isConnected = false;
    currentQR = null;
    connectedNumber = null;
    setTimeout(startWhatsApp, 1500);
    return res.json({ success: true, message: 'Logged out and restarted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Transparent Fallback: If any request (e.g. GET / or UI assets) hits this gateway directly, forward to Python FastAPI
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
    console.error(`[Gateway Proxy Fallback] Error forwarding to backend:`, err.message);
    return res.status(502).json({ error: 'Backend unreachable', details: err.message });
  }
});

app.listen(GATEWAY_PORT, '127.0.0.1', () => {
  console.log(`[WhatsApp Gateway] Running on 127.0.0.1:${GATEWAY_PORT}`);
  console.log(`[Session Backup] Supabase: ${AUTH_BACKUP_ENABLED ? 'ENABLED' : 'DISABLED (set SUPABASE_URL + SUPABASE_SERVICE_KEY)'}`);
  console.log(`[Keep-Alive] Self-ping: ${SELF_URL ? 'ENABLED' : 'DISABLED (set SELF_URL)'}`);
});
