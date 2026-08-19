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

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let currentQR = null;
let isConnected = false;
let connectedNumber = null;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await QRCode.toDataURL(qr);
      console.log('⚡ [WhatsApp Gateway] New QR code generated. Ready for scanning.');
    }

    if (connection === 'close') {
      isConnected = false;
      connectedNumber = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ [WhatsApp Gateway] Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      connectedNumber = sock.user?.id?.split(':')[0] || 'Linked Phone';
      console.log(`✅ [WhatsApp Gateway] Connected successfully as ${connectedNumber}`);
    }
  });
}

startWhatsApp();

// API Endpoints
app.get('/status', (req, res) => {
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
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing recipient phone number or message' });
    }

    if (!isConnected || !sock) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp gateway not linked. Please scan the QR code first.',
        simulated: true
      });
    }

    // Format phone number to WhatsApp JID (clean +, spaces, dashes)
    const cleanNumber = to.replace(/[^0-9]/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: message });

    console.log(`📨 [WhatsApp Gateway] Message delivered to ${cleanNumber}`);
    return res.json({ success: true, delivered_to: cleanNumber });
  } catch (err) {
    console.error('❌ [WhatsApp Gateway] Error sending message:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    isConnected = false;
    currentQR = null;
    connectedNumber = null;
    startWhatsApp();
    return res.json({ success: true, message: 'Logged out. New QR code ready.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [WhatsApp Gateway] Running on port ${PORT}`);
});
