const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const QR_SECRET = process.env.QR_SECRET_KEY || 'canteen_ias_secure_qr_secret_2026_goi_northblock';
const DATA_DIR = path.join(__dirname, '../../data');
const UPLOADS_QR_DIR = path.join(__dirname, '../../uploads/qr');
const QR_FILE = path.join(DATA_DIR, 'qr_tokens.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_QR_DIR)) {
  fs.mkdirSync(UPLOADS_QR_DIR, { recursive: true });
}
if (!fs.existsSync(QR_FILE)) {
  fs.writeFileSync(QR_FILE, '[]', 'utf8');
}

function readTokens() {
  try {
    const raw = fs.readFileSync(QR_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTokens(tokens) {
  try {
    fs.writeFileSync(QR_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing QR tokens:', err);
  }
}

function computeSignature(qrId, randomToken) {
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(`${qrId}:${randomToken}`)
    .digest('hex')
    .slice(0, 32);
}

function hashToken(randomToken) {
  return crypto.createHash('sha256').update(randomToken).digest('hex');
}

/**
 * Generates a one-time, cryptographically secure QR login token for a registered user.
 * Invalidates any existing unused QR tokens for this user.
 */
async function createQrLoginToken(user) {
  const tokens = readTokens();
  const now = new Date();
  const userId = user.id || user._id || user.officerId;
  const userPhone = user.phone || user.mobile;

  // Invalidate any previous unused QR for this user
  tokens.forEach((t) => {
    if ((t.userId === userId || t.userPhone === userPhone) && !t.used) {
      t.used = true;
      t.usedAt = now.toISOString();
      t.invalidatedByNewQr = true;
    }
  });

  const qrId = `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const randomToken = crypto.randomBytes(32).toString('hex');
  const signature = computeSignature(qrId, randomToken);

  // App-Only Opaque payload. Contains NO URL, NO PIN, NO JWT, NO plaintext personal info.
  // Google Lens or Chrome scanner sees only: APPQR:v1:qr_...
  const qrPayload = `APPQR:v1:${qrId}.${randomToken}.${signature}`;

  // Expiration: 5 minutes from generation
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  // Generate QR Image file on disk and Data URL
  const qrFilePath = path.join(UPLOADS_QR_DIR, `${qrId}.png`);
  await QRCode.toFile(qrFilePath, qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0a3d31', // Government Forest Green
      light: '#ffffff',
    },
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0a3d31',
      light: '#ffffff',
    },
  });

  const tokenRecord = {
    id: qrId,
    userId,
    userPhone,
    userName: user.name || 'IAS Officer',
    tokenHash: hashToken(randomToken),
    signature,
    qrPayload,
    qrImage: `/uploads/qr/${qrId}.png`,
    qrDataUrl,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false,
    usedAt: null,
  };

  tokens.unshift(tokenRecord);
  if (tokens.length > 200) tokens.length = 200;
  writeTokens(tokens);

  return {
    qrId,
    qrPayload,
    qrImage: tokenRecord.qrImage,
    qrDataUrl,
    expiresAt: tokenRecord.expiresAt,
  };
}

/**
 * Validates a scanned QR payload, checks signature, expiry, and one-time use.
 * Returns validation result and consumes the token if valid.
 */
function validateAndConsumeQr(qrPayload) {
  if (!qrPayload || typeof qrPayload !== 'string') {
    return { valid: false, reason: 'Invalid QR code' };
  }

  const trimmed = qrPayload.trim();
  if (!trimmed.startsWith('APPQR:v1:')) {
    return { valid: false, reason: 'Invalid QR code' };
  }

  const content = trimmed.slice('APPQR:v1:'.length);
  const parts = content.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Invalid QR code' };
  }

  const [qrId, randomToken, signature] = parts;

  // 1. Check signature integrity
  const expectedSig = computeSignature(qrId, randomToken);
  if (signature !== expectedSig) {
    return { valid: false, reason: 'Invalid QR code' };
  }

  const tokens = readTokens();
  const tokenRecord = tokens.find((t) => t.id === qrId);

  if (!tokenRecord) {
    return { valid: false, reason: 'Invalid QR code' };
  }

  // 2. Check if already used
  if (tokenRecord.used) {
    return { valid: false, reason: 'QR code already used' };
  }

  // 3. Check expiration (5 minutes)
  const now = new Date();
  if (new Date(tokenRecord.expiresAt) < now) {
    return { valid: false, reason: 'QR code expired' };
  }

  // 4. Verify token hash against stored hash
  if (hashToken(randomToken) !== tokenRecord.tokenHash) {
    return { valid: false, reason: 'Invalid QR code' };
  }

  // 5. Consume token (One-time use)
  tokenRecord.used = true;
  tokenRecord.usedAt = now.toISOString();
  writeTokens(tokens);

  return {
    valid: true,
    userId: tokenRecord.userId,
    userPhone: tokenRecord.userPhone,
    userName: tokenRecord.userName,
    consumedAt: tokenRecord.usedAt,
  };
}

function getTokens(limit = 50) {
  const tokens = readTokens();
  return tokens.slice(0, limit);
}

module.exports = {
  createQrLoginToken,
  validateAndConsumeQr,
  getTokens,
};
