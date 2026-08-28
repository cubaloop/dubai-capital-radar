import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
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
const SUPABASE_BUCKET = 'whatsapp-auth';
const AUTH_BACKUP_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function uploadAuthToSupabase() {
  if (!AUTH_BACKUP_ENABLED) return;
  try {
    const files = fs.readdirSync(AUTH_DIR);
    for (const file of files) {
      const filePath = path.join(AUTH_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const base64 = Buffer.from(content).toString('base64');
      
      await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${file}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: base64
      });
    }
    console.log(`[Session Backup] Auth files backed up to Supabase (${files.length} files)`);
  } catch (err) {
    console.error('[Session Backup] Failed to backup auth:', err.message);
  }
}

async function restoreAuthFromSupabase() {
  if (!AUTH_BACKUP_ENABLED) {
    console.log('[Session Restore] Supabase not configured - using local auth only');
    return false;
  }
  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 100 })
    });
    
    if (!listRes.ok) {
      console.log('[Session Restore] No backup found in Supabase - fresh start');
      return false;
    }
    
    const files = await listRes.json();
    if (!files || files.length === 0) {
      console.log('[Session Restore] No auth files in Supabase - fresh start');
      return false;
    }
    
    for (const file of files) {
      const downloadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${file.name}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (downloadRes.ok) {
        const base64 = await downloadRes.text();
        const content = Buffer.from(base64, 'base64').toString('utf-8');
        fs.writeFileSync(path.join(AUTH_DIR, file.name), content, 'utf-8');
      }
    }
    console.log(`[Session Restore] Restored ${files.length} auth files from Supabase`);
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
    printQRInTerminal: true,
    auth: state,
    generateHighQualityLinkPreview: true,
    // Reconnect options for stability
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
      currentQR = await QRCode.toDataURL(qr);
      console.log('[WhatsApp] New QR code generated. Ready for scanning.');
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
        // Logged out - clear Supabase backup
        console.log('[WhatsApp] Logged out - clearing session backup');
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        }
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      connectedNumber = sock.user?.id?.split(':')[0] || 'Linked Phone';
      lastActivityAt = Date.now();
      console.log(`[WhatsApp] Connected as +${connectedNumber}`);
      // Backup immediately after connecting
      await uploadAuthToSupabase();
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
    if (sock) await sock.logout();
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    isConnected = false;
    currentQR = null;
    connectedNumber = null;
    startWhatsApp();
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
