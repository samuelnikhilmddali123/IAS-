const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'whatsapp_config.json');
const OUTBOX_FILE = path.join(DATA_DIR, 'whatsapp_outbox.json');
const AUTH_DIR = path.join(DATA_DIR, 'baileys_auth_info');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_CONFIG = {
  adminWhatsAppNumber: '+91 91212 66269',
  provider: 'whatsapp_web',
  meta: {
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
  },
  twilio: {
    accountSid: '',
    authToken: '',
    fromNumber: 'whatsapp:+14155238886',
  },
  connectionStatus: 'Disconnected (Scan pairing QR on Admin Portal)',
  updatedAt: new Date().toISOString(),
  lastTestedAt: null,
};

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error reading whatsapp_config.json:', err);
  }
  return DEFAULT_CONFIG;
}

function writeConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving whatsapp_config.json:', err);
  }
}

function readOutbox() {
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      return JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
    }
  } catch {
    return [];
  }
  return [];
}

function writeOutbox(msgs) {
  try {
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(msgs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing whatsapp_outbox.json:', err);
  }
}

// -------------------------------------------------------------
// Baileys WhatsApp Web Client Management
// -------------------------------------------------------------
let waSocket = null;
let currentPairingQr = null; // DataURL representation of pairing QR
let connectionStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'PAIRING' | 'CONNECTED'
let connectedNumber = null;
let isInitializing = false;

function formatWhatsAppJid(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return `${digits}@s.whatsapp.net`;
}

async function initWhatsAppWebClient() {
  if (waSocket || isInitializing) return;
  isInitializing = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
    }));

    waSocket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Canteen Services Admin', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    waSocket.ev.on('creds.update', saveCreds);

    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'PAIRING';
        try {
          currentPairingQr = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          console.log('[WhatsApp Web] New pairing QR generated. Scan at http://localhost:5001/admin/');
        } catch (e) {
          console.error('[WhatsApp Web] Error creating pairing QR data URL:', e);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'CONNECTED';
        currentPairingQr = null;
        const rawId = waSocket.user?.id || '';
        connectedNumber = rawId.split(':')[0] || rawId.split('@')[0] || '9121266269';
        console.log(`[WhatsApp Web] Successfully connected as +${connectedNumber}! Auto QR dispatch is live.`);
        const cfg = readConfig();
        cfg.connectionStatus = `Connected (+${connectedNumber})`;
        cfg.adminWhatsAppNumber = `+${connectedNumber}`;
        writeConfig(cfg);
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'DISCONNECTED';
        console.log(`[WhatsApp Web] Connection closed (statusCode: ${statusCode}, shouldReconnect: ${shouldReconnect})`);
        waSocket = null;
        if (shouldReconnect) {
          setTimeout(initWhatsAppWebClient, 3500);
        } else {
          currentPairingQr = null;
          connectedNumber = null;
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          setTimeout(initWhatsAppWebClient, 1500);
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Web] Init error:', err);
    connectionStatus = 'DISCONNECTED';
    waSocket = null;
  } finally {
    isInitializing = false;
  }
}

async function disconnectWhatsAppWebClient() {
  try {
    if (waSocket) {
      await waSocket.logout().catch(() => {});
      waSocket.end?.();
      waSocket = null;
    }
  } catch {}
  currentPairingQr = null;
  connectedNumber = null;
  connectionStatus = 'DISCONNECTED';
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  console.log('[WhatsApp Web] Device unlinked by Admin.');
  setTimeout(initWhatsAppWebClient, 1000);
  return { success: true, message: 'Admin WhatsApp unlinked. Fresh QR generated.' };
}

function getWhatsAppWebStatus() {
  const cfg = readConfig();
  return {
    isConnected: connectionStatus === 'CONNECTED',
    status: connectionStatus,
    pairingQr: currentPairingQr,
    adminWhatsAppNumber: connectedNumber ? `+${connectedNumber}` : cfg.adminWhatsAppNumber,
    configuredNumber: cfg.adminWhatsAppNumber,
  };
}

// -------------------------------------------------------------
// Core Messaging Functions
// -------------------------------------------------------------
async function sendQrMessage({ to, userName, qrImage, qrDataUrl, qrPayload, expiresAt, qrId }) {
  const cfg = readConfig();
  const fromNumber = cfg.adminWhatsAppNumber || '+91 91212 66269';
  const cleanTo = (to || '').trim();
  const recipientJid = formatWhatsAppJid(cleanTo);

  const messageText = [
    `*Canteen Services Login QR*`,
    ``,
    `Dear Officer *${userName || 'IAS Officer'}*,`,
    ``,
    `Your Canteen Services account has been registered successfully.`,
    ``,
    `Please use the attached Login QR Code with the Canteen Services App to securely authenticate.`,
    ``,
    `Do not share this QR code with anyone.`,
    ``,
    `— Canteen Services Admin Desk`
  ].join('\n');

  const dispatchRecord = {
    id: `msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    from: fromNumber,
    to: cleanTo,
    userName: userName || 'IAS Officer',
    qrId,
    qrImage,
    qrDataUrl,
    qrPayload,
    messageText,
    provider: 'whatsapp_web',
    status: 'QUEUED',
    expiresAt,
    timestamp: new Date().toISOString(),
  };

  // 1. Dispatch via Baileys if linked!
  if (waSocket && connectionStatus === 'CONNECTED') {
    try {
      let imageBuffer = null;
      
      // Attempt to load the beautiful generated card from disk
      if (qrImage) {
        // qrImage is e.g. "/uploads/qr/qr_123.png", so we resolve it from backend root
        const fullPath = path.join(__dirname, '../..', qrImage);
        if (fs.existsSync(fullPath)) {
          imageBuffer = fs.readFileSync(fullPath);
        }
      }
      
      // Fallback to raw QR code Data URL
      if (!imageBuffer && qrDataUrl) {
        const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      }

      if (imageBuffer) {
        await waSocket.sendMessage(recipientJid, {
          image: imageBuffer,
          caption: messageText,
          mimetype: 'image/png',
        });
      } else {
        await waSocket.sendMessage(recipientJid, {
          text: messageText,
        });
      }

      dispatchRecord.status = 'DELIVERED';
      dispatchRecord.providerStatus = 'SENT_VIA_WHATSAPP_WEB_LIVE';
      console.log(`[WhatsApp Web] REAL QR image sent directly from ${fromNumber} -> ${cleanTo} (${recipientJid})!`);
    } catch (err) {
      console.error('[WhatsApp Web] Error sending message to WhatsApp:', err);
      dispatchRecord.status = 'PENDING';
      dispatchRecord.providerStatus = `ERROR: ${err.message}`;
    }
  } else {
    dispatchRecord.status = 'PENDING_PAIRING';
    dispatchRecord.providerStatus = 'WAITING_FOR_ADMIN_WHATSAPP_PAIRING (Scan QR on Admin Dashboard http://localhost:5001/admin/)';
    console.warn(`[WhatsApp Web] WhatsApp not linked yet. Pair at http://localhost:5001/admin/ to deliver to ${cleanTo}`);
  }

  const outbox = readOutbox();
  outbox.unshift(dispatchRecord);
  if (outbox.length > 200) outbox.length = 200;
  writeOutbox(outbox);

  return {
    success: true,
    messageId: dispatchRecord.id,
    from: fromNumber,
    to: cleanTo,
    status: dispatchRecord.status,
    providerStatus: dispatchRecord.providerStatus,
    qrId,
    timestamp: dispatchRecord.timestamp,
  };
}

async function sendTestMessage({ to, message }) {
  const cfg = readConfig();
  const fromNumber = cfg.adminWhatsAppNumber || '+91 91212 66269';
  const cleanTo = (to || '').trim();
  const recipientJid = formatWhatsAppJid(cleanTo);

  const text =
    message ||
    `🏛️ *Central Canteen Services* test message from admin WhatsApp ${fromNumber} to ${cleanTo}. System online and authenticated.`;

  let deliveryStatus = 'PENDING_PAIRING';
  let providerStatus = 'Device not paired yet. Open http://localhost:5001/admin/ to scan pairing QR.';

  if (waSocket && connectionStatus === 'CONNECTED') {
    try {
      await waSocket.sendMessage(recipientJid, { text });
      deliveryStatus = 'DELIVERED';
      providerStatus = 'SENT_VIA_WHATSAPP_WEB_LIVE';
    } catch (err) {
      deliveryStatus = 'FAILED';
      providerStatus = err.message;
    }
  }

  const record = {
    id: `test_${Date.now()}`,
    from: fromNumber,
    to: cleanTo,
    userName: 'Test Recipient',
    messageText: text,
    provider: 'whatsapp_web',
    status: deliveryStatus,
    providerStatus,
    timestamp: new Date().toISOString(),
    isTest: true,
  };

  const outbox = readOutbox();
  outbox.unshift(record);
  writeOutbox(outbox);

  cfg.lastTestedAt = new Date().toISOString();
  writeConfig(cfg);

  return {
    success: deliveryStatus === 'DELIVERED',
    message:
      deliveryStatus === 'DELIVERED'
        ? `Real WhatsApp message sent from ${fromNumber} to ${cleanTo}`
        : `Message queued: ${providerStatus}`,
    from: fromNumber,
    to: cleanTo,
    status: deliveryStatus,
    timestamp: record.timestamp,
  };
}

function getConfig(sanitize = true) {
  const cfg = readConfig();
  return {
    adminWhatsAppNumber: connectedNumber ? `+${connectedNumber}` : cfg.adminWhatsAppNumber,
    provider: 'whatsapp_web',
    connectionStatus: connectionStatus === 'CONNECTED' ? `Connected (${connectedNumber || cfg.adminWhatsAppNumber})` : 'Awaiting QR scan on Admin Portal',
    updatedAt: cfg.updatedAt,
    lastTestedAt: cfg.lastTestedAt,
  };
}

function saveConfig(incoming) {
  const current = readConfig();
  const updated = {
    ...current,
    adminWhatsAppNumber: incoming.adminWhatsAppNumber || current.adminWhatsAppNumber,
    updatedAt: new Date().toISOString(),
  };
  writeConfig(updated);
  return getConfig(true);
}

function getOutbox(limit = 50) {
  const outbox = readOutbox();
  return outbox.slice(0, limit);
}

// Start WhatsApp Web Client automatically on module load
initWhatsAppWebClient();

function sendBillMessage({ to, billText, qrDataUrl }) {
  const cfg = readConfig();
  const fromNumber = cfg.adminWhatsAppNumber || '+91 91212 66269';
  const cleanTo = (to || '').trim();

  // Validate registered mobile number
  if (!cleanTo || cleanTo.replace(/\D/g, '').length < 10) {
    return {
      success: false,
      status: 'FAILED',
      error: 'Invalid or missing registered mobile number. A 10-digit number is required.',
      from: fromNumber,
      to: cleanTo,
      timestamp: new Date().toISOString()
    };
  }

  const recipientJid = formatWhatsAppJid(cleanTo);

  const dispatchRecord = {
    id: `msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    from: fromNumber,
    to: cleanTo,
    billText: billText || '',
    qrDataUrl: qrDataUrl || null,
    messageText: billText,
    provider: 'whatsapp_web',
    status: 'QUEUED',
    timestamp: new Date().toISOString(),
  };

  if (waSocket && connectionStatus === 'CONNECTED') {
    try {
      let imageBuffer = null;
      if (qrDataUrl) {
        const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
      if (imageBuffer) {
        waSocket.sendMessage(recipientJid, { image: imageBuffer, caption: billText, mimetype: 'image/png' });
      } else {
        waSocket.sendMessage(recipientJid, { text: billText });
      }
      dispatchRecord.status = 'DELIVERED';
      dispatchRecord.providerStatus = 'SENT_VIA_WHATSAPP_WEB_LIVE';
    } catch (err) {
      console.error('[WhatsApp Web] Error sending bill message:', err);
      dispatchRecord.status = 'FAILED';
      dispatchRecord.providerStatus = `ERROR: ${err.message}`;
    }
  } else {
    dispatchRecord.status = 'PENDING_PAIRING';
    dispatchRecord.providerStatus = 'WAITING_FOR_ADMIN_WHATSAPP_PAIRING (Scan QR on Admin Dashboard http://localhost:5001/admin/)';
    console.warn(`[WhatsApp Web] WhatsApp not linked yet. Pair at http://localhost:5001/admin/ to deliver to ${cleanTo}`);
  }

  const outbox = readOutbox();
  outbox.unshift(dispatchRecord);
  if (outbox.length > 200) outbox.length = 200;
  writeOutbox(outbox);

  return {
    success: dispatchRecord.status === 'DELIVERED' || dispatchRecord.status === 'PENDING_PAIRING',
    messageId: dispatchRecord.id,
    from: fromNumber,
    to: cleanTo,
    status: dispatchRecord.status,
    providerStatus: dispatchRecord.providerStatus,
    timestamp: dispatchRecord.timestamp,
  };
}

async function sendPaidInvoicePdf({ to, userName, billData, pdfBuffer }) {
  const cfg = readConfig();
  const fromNumber = cfg.adminWhatsAppNumber || '+91 91212 66269';
  const cleanTo = (to || '').trim();

  if (!cleanTo || cleanTo.replace(/\D/g, '').length < 10) {
    return { success: false, status: 'FAILED', error: 'Invalid 10-digit mobile number.' };
  }

  const recipientJid = formatWhatsAppJid(cleanTo);
  const invoicePdfService = require('./invoicePdfService');

  let finalPdfBuffer = pdfBuffer;
  if (!finalPdfBuffer) {
    try {
      finalPdfBuffer = await invoicePdfService.generateInvoicePdf(billData);
    } catch (e) {
      console.error('[WhatsApp PDF] Error generating invoice PDF:', e);
    }
  }

  const invoiceNo = billData.invoiceNo || `INV-${Date.now().toString().slice(-6)}`;
  const totalAmount = billData.totalAmount || 0;
  const officerName = userName || billData.userName || 'IAS Officer';

  const caption = `🏛️ *GOVERNMENT OF INDIA • CANTEEN SERVICES*\n\n` +
    `*OFFICIAL FOOD INVOICE (PAID)*\n` +
    `Dear *${officerName}*,\n` +
    `Your dining bill payment of *₹${totalAmount}* has been verified and settled.\n\n` +
    `📄 *Invoice No:* ${invoiceNo}\n` +
    `📅 *Date:* ${billData.date || new Date().toLocaleDateString('en-IN')}, ${billData.time || new Date().toLocaleTimeString('en-IN')}\n` +
    `💳 *Status:* PAID (Online UPI)\n\n` +
    `Your official Tax Invoice PDF is attached above.\n` +
    `Thank you for dining with Canteen Services!`;

  const dispatchRecord = {
    id: `inv_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    from: fromNumber,
    to: cleanTo,
    userName: officerName,
    invoiceNo,
    totalAmount,
    messageText: caption,
    provider: 'whatsapp_web',
    status: 'QUEUED',
    timestamp: new Date().toISOString()
  };

  if (waSocket && connectionStatus === 'CONNECTED') {
    try {
      if (finalPdfBuffer) {
        await waSocket.sendMessage(recipientJid, {
          document: finalPdfBuffer,
          mimetype: 'application/pdf',
          fileName: 'bill.pdf',
          caption
        });
      } else {
        await waSocket.sendMessage(recipientJid, { text: caption });
      }
      dispatchRecord.status = 'DELIVERED';
      dispatchRecord.providerStatus = 'SENT_VIA_WHATSAPP_WEB_LIVE';
      console.log(`[WhatsApp Web] Official PDF invoice sent to ${cleanTo}!`);
    } catch (err) {
      console.error('[WhatsApp Web] Error sending PDF invoice:', err);
      dispatchRecord.status = 'FAILED';
      dispatchRecord.providerStatus = `ERROR: ${err.message}`;
    }
  } else {
    dispatchRecord.status = 'PENDING_PAIRING';
    dispatchRecord.providerStatus = 'WAITING_FOR_ADMIN_WHATSAPP_PAIRING (Scan QR on Admin Dashboard)';
    console.warn(`[WhatsApp Web] WhatsApp not linked yet. Pair at http://localhost:5001/admin/ to deliver to ${cleanTo}`);
  }

  const outbox = readOutbox();
  outbox.unshift(dispatchRecord);
  if (outbox.length > 200) outbox.length = 200;
  writeOutbox(outbox);

  return {
    success: dispatchRecord.status === 'DELIVERED' || dispatchRecord.status === 'PENDING_PAIRING',
    status: dispatchRecord.status,
    invoiceNo
  };
}

async function sendMessage(to, text) {
  return sendBillMessage({ to, billText: text });
}

module.exports = {
  getConfig,
  saveConfig,
  sendQrMessage,
  sendTestMessage,
  sendBillMessage,
  sendPaidInvoicePdf,
  sendMessage,
  getOutbox,
  initWhatsAppWebClient,
  disconnectWhatsAppWebClient,
  getWhatsAppWebStatus,
};

