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

const PORT = process.env.WHATSAPP_PORT || 3001;
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
const SELF_URL = process.env.SELF_URL || null;
if (SELF_URL) {
  setInterval(async () => {
    try {
      await fetch(`${SELF_URL}/healthz`);
      console.log('[Keep-Alive] Pulse sent to keep container awake');
    } catch (e) {
      // Silent fail - external ping
    }
  }, 4 * 60 * 1000); // Every 4 minutes
}
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
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 5,
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

  // Listen to incoming messages for Developer Launch auto-ingestion & Prospect AI replies
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');
      const senderNumber = remoteJid.replace(/[^0-9]/g, '');

      // Extract text content from various message structures
      const textContent = msg.message.conversation ||
                          msg.message.extendedTextMessage?.text ||
                          msg.message.imageMessage?.caption ||
                          msg.message.documentMessage?.caption ||
                          msg.message.documentMessage?.fileName || '';

      let documentBase64 = null;
      if (hasDocument) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
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

      console.log(`[WhatsApp Inbound] Message received from ${senderNumber} (${isGroup ? 'Group' : 'Direct'})`);

      // Forward asynchronously to Python backend webhook
      try {
        fetch('http://127.0.0.1:8000/api/whatsapp/inbound-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: senderNumber,
            jid: remoteJid,
            is_group: isGroup,
            text: textContent,
            has_document: hasDocument,
            document_file_name: documentFileName,
            document_base64: documentBase64,
            timestamp: msg.messageTimestamp
          })
        }).catch(err => {
          // Non-blocking log
        });
      } catch (err) {
        // Silent catch
      }
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
      if (hasValidImage) {
        const imageBuffer = fs.readFileSync(image_path);
        await sock.sendMessage(jid, { image: imageBuffer, caption: message || '' });
      } else if (image_url) {
        await sock.sendMessage(jid, { image: { url: image_url }, caption: message || '' });
      } else {
        await sock.sendMessage(jid, { text: message });
      }

      resetDailyCounterIfNeeded();
      messagesSentToday++;
      lastActivityAt = Date.now();
      console.log(`[WhatsApp] Message delivered to +${cleanNumber}`);
      return res.json({ success: true, delivered_to: cleanNumber, jid, exists: true });

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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[WhatsApp Gateway] Running on 127.0.0.1:${PORT}`);
  console.log(`[Session Backup] Supabase: ${AUTH_BACKUP_ENABLED ? 'ENABLED' : 'DISABLED (set SUPABASE_URL + SUPABASE_SERVICE_KEY)'}`);
  console.log(`[Keep-Alive] Self-ping: ${SELF_URL ? 'ENABLED' : 'DISABLED (set SELF_URL)'}`);
});
