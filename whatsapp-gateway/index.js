import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.WHATSAPP_PORT || 3001;
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth');

// ─── Supabase Session Persistence ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || null;
const AUTH_BACKUP_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
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

    // Save to Supabase REST endpoint (whatsapp_sessions table)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'active_session',
        value: JSON.stringify(bundle),
        phone: connectedNumber || 'unknown'
      })
    });

    if (res.ok) {
      console.log(`[Session Backup] ✅ Auth session bundle backed up to Supabase (${files.length} keys)`);
    } else {
      console.log(`[Session Backup] Notice: Table whatsapp_sessions status ${res.status}`);
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_sessions?key=eq.active_session&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });

    if (!res.ok) {
      console.log('[Session Restore] No session table found in Supabase - starting fresh');
      return false;
    }

    const rows = await res.json();
    if (!rows || !rows.length || !rows[0].value) {
      console.log('[Session Restore] No previous session bundle in Supabase - starting fresh');
      return false;
    }

    const bundle = JSON.parse(rows[0].value);
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
let qrGeneratedAt = null;
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
    printQRInTerminal: true,
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
        margin: 3,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      qrGeneratedAt = Date.now();
      console.log('[WhatsApp] New fresh QR code generated. Ready for scanning.');
    }

    if (connection === 'close') {
      isConnected = false;
      connectedNumber = null;
      currentQR = null;
      qrGeneratedAt = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connection closed (code: ${code}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        const delay = code === 428 ? 8000 : 3000; // Back off on stream error
        setTimeout(startWhatsApp, delay);
      } else {
        // Logged out - clear Supabase backup & local auth, then restart fresh
        console.log('[WhatsApp] Logged out - clearing session backup and restarting fresh socket');
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        }
        setTimeout(startWhatsApp, 2000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      qrGeneratedAt = null;
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

      const hasDocument = !!msg.message.documentMessage;
      const documentFileName = msg.message.documentMessage?.fileName || null;

      if (!textContent && !hasDocument) continue;

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
  const isQrValid = currentQR && qrGeneratedAt && (Date.now() - qrGeneratedAt < 25000);
  res.json({
    connected: isConnected,
    phone: connectedNumber,
    has_qr: !!isQrValid
  });
});

app.get('/qr', (req, res) => {
  const isQrValid = currentQR && qrGeneratedAt && (Date.now() - qrGeneratedAt < 25000);
  const expiresIn = (currentQR && qrGeneratedAt) ? Math.max(0, Math.floor((25000 - (Date.now() - qrGeneratedAt)) / 1000)) : 0;
  
  // If QR is expired and not connected, restart socket to generate fresh pairing QR
  if (!isQrValid && !isConnected && currentQR) {
    currentQR = null;
    qrGeneratedAt = null;
    console.log('[WhatsApp] Stale QR detected, restarting socket for fresh pairing QR...');
    try { if (sock) sock.end(undefined); } catch (e) {}
    setTimeout(startWhatsApp, 1000);
  }

  res.json({
    connected: isConnected,
    qr: isQrValid ? currentQR : null,
    expires_in_seconds: isQrValid ? expiresIn : 0,
    phone: connectedNumber
  });
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
      return res.status(400).json({ success: false, error: 'Número de teléfono inválido. Incluye prefijo de país (ej. 34 para España, 971 para UAE).' });
    }
    if (isConnected) {
      return res.json({ success: false, error: `Ya está conectado como +${connectedNumber}` });
    }
    if (!sock || typeof sock.requestPairingCode !== 'function') {
      await startWhatsApp();
      await new Promise(r => setTimeout(r, 2000));
    }
    const rawCode = await sock.requestPairingCode(cleanNumber);
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
    console.log(`[WhatsApp] Pairing code generated for +${cleanNumber}: ${formattedCode}`);
    return res.json({
      success: true,
      code: formattedCode,
      raw_code: rawCode,
      phone: cleanNumber,
      expires_in_seconds: 60
    });
  } catch (err) {
    console.error('[WhatsApp] Pairing code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Force restart socket and clear auth for clean QR
app.post('/restart', async (req, res) => {
  try {
    console.log('[WhatsApp] Manual restart requested');
    if (sock) {
      try { sock.end(undefined); } catch (e) {}
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    isConnected = false;
    currentQR = null;
    qrGeneratedAt = null;
    connectedNumber = null;
    startWhatsApp();
    return res.json({ success: true, message: 'Socket reiniciado. Generando nuevo QR limpio.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
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

      if (image_path && fs.existsSync(image_path)) {
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

app.post('/logout', async (req, res) => {
  try {
    if (sock) {
      try { await sock.logout(); } catch (e) { try { sock.end(undefined); } catch (_) {} }
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    isConnected = false;
    currentQR = null;
    qrGeneratedAt = null;
    connectedNumber = null;
    setTimeout(startWhatsApp, 1500);
    return res.json({ success: true, message: 'Logged out and restarted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[WhatsApp Gateway] Running on port ${PORT}`);
  console.log(`[Session Backup] Supabase: ${AUTH_BACKUP_ENABLED ? 'ENABLED' : 'DISABLED (set SUPABASE_URL + SUPABASE_SERVICE_KEY)'}`);
  console.log(`[Keep-Alive] Self-ping: ${SELF_URL ? 'ENABLED' : 'DISABLED (set SELF_URL)'}`);
});
