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
 * Generates a permanent, cryptographically secure LIFETIME QR login credential for a registered user.
 * The QR code does not expire and can be used for repeated logins until explicitly revoked or regenerated.
 */
async function createQrLoginToken(user) {
  const tokens = readTokens();
  const now = new Date();
  const userId = String(user.id || user._id || user.officerId || user.userId || '');
  const userPhone = user.phone || user.mobile || user.userPhone || '';
  const userName = (user.name || user.userName || 'IAS Officer').trim();
  const userDesignation = (user.designation || 'Special Duty Officer').trim();
  const userLocation = (user.location || user.department || '').trim();
  const userAvatar = user.avatar || user.photoUrl || user.image || '';

  // Revoke any previous active QR for this user when generating a fresh one
  tokens.forEach((t) => {
    if (t.userId === userId || (userPhone && t.userPhone === userPhone)) {
      t.revoked = true;
      t.revokedAt = now.toISOString();
      t.invalidatedByNewQr = true;
    }
  });

  const qrId = `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const randomToken = crypto.randomBytes(32).toString('hex');
  const signature = computeSignature(qrId, randomToken);

  // App-Only Opaque payload: APPQR:v1:qr_...
  const qrPayload = `APPQR:v1:${qrId}.${randomToken}.${signature}`;

  // Generate QR Image file on disk and Data URL
  const qrFilePath = path.join(UPLOADS_QR_DIR, `${qrId}.png`);
  
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#064e3b',
      light: '#ffffff',
    },
  });
  
  try {
    const nodeHtmlToImage = require('node-html-to-image');
    const generateQrCardHtml = require('../templates/qrCardTemplate');
    
    const htmlString = generateQrCardHtml({
      name: userName,
      userName: userName,
      designation: userDesignation,
      location: userLocation,
      phone: userPhone,
      email: user.email || '',
      qrDataUrl: qrDataUrl,
      photoUrl: userAvatar,
      isLifetime: true,
      category: user.category || 'IAS OFFICER'
    });
    
    await nodeHtmlToImage({
      output: qrFilePath,
      html: htmlString,
      puppeteerArgs: { 
        defaultViewport: { width: 1024, height: 1536 },
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      }
    });
  } catch (err) {
    console.error('Error generating HTML QR card:', err);
    // Fallback: save raw QR code
    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 10,
      color: { dark: '#064e3b', light: '#ffffff' }
    });
    fs.writeFileSync(qrFilePath, qrBuffer);
  }

  const tokenRecord = {
    id: qrId,
    userId,
    userPhone,
    userName: userName,
    tokenHash: hashToken(randomToken),
    signature,
    qrPayload,
    qrImage: `/uploads/qr/${qrId}.png`,
    qrDataUrl,
    createdAt: now.toISOString(),
    isLifetime: true,
    expiresAt: null, // Lifetime validity: No automatic expiry
    revoked: false,
    revokedAt: null,
    lastUsedAt: null,
    useCount: 0
  };

  tokens.unshift(tokenRecord);
  // Keep up to 500 records in memory cache
  if (tokens.length > 500) tokens.length = 500;
  writeTokens(tokens);

  return {
    qrId,
    qrPayload,
    qrImage: tokenRecord.qrImage,
    qrDataUrl,
    tokenHash: tokenRecord.tokenHash,
    isLifetime: true,
    expiresAt: null,
  };
}

/**
 * Validates a scanned QR payload, checking cryptographic signature and revocation status.
 * Allows repeated authentication with the same lifetime QR code.
 */
function validateAndConsumeQr(qrPayload) {
  if (!qrPayload || typeof qrPayload !== 'string') {
    return { valid: false, reason: 'Invalid QR code' };
  }

  const trimmed = qrPayload.trim();
  if (!trimmed.startsWith('APPQR:v1:')) {
    return { valid: false, reason: 'Invalid QR code format' };
  }

  const content = trimmed.slice('APPQR:v1:'.length);
  const parts = content.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Invalid QR code structure' };
  }

  const [qrId, randomToken, signature] = parts;

  // 1. Check cryptographic signature integrity
  const expectedSig = computeSignature(qrId, randomToken);
  if (signature !== expectedSig) {
    return { valid: false, reason: 'QR code signature mismatch / security verification failed' };
  }

  const tokens = readTokens();
  const tokenRecord = tokens.find((t) => t.id === qrId);

  if (!tokenRecord) {
    return { valid: false, reason: 'QR code not recognized by central security database' };
  }

  // 2. Check revocation status
  if (tokenRecord.revoked) {
    return { valid: false, reason: 'This QR code has been revoked. Please request a new QR from the admin desk.' };
  }

  // 3. Verify token hash against stored hash
  if (hashToken(randomToken) !== tokenRecord.tokenHash) {
    return { valid: false, reason: 'QR code token hash verification failed' };
  }

  // 4. Update usage stats (without invalidating the lifetime token)
  const now = new Date();
  tokenRecord.lastUsedAt = now.toISOString();
  tokenRecord.useCount = (tokenRecord.useCount || 0) + 1;
  writeTokens(tokens);

  return {
    valid: true,
    userId: tokenRecord.userId,
    userPhone: tokenRecord.userPhone,
    userName: tokenRecord.userName,
    lastUsedAt: tokenRecord.lastUsedAt,
    isLifetime: true
  };
}

/**
 * Revokes a user's lifetime QR access token by userId or qrId.
 */
function revokeQr(identifier) {
  if (!identifier) return false;
  const tokens = readTokens();
  const now = new Date().toISOString();
  let found = false;

  tokens.forEach((t) => {
    if (t.id === identifier || t.userId === String(identifier) || t.userPhone === String(identifier)) {
      t.revoked = true;
      t.revokedAt = now;
      found = true;
    }
  });

  if (found) {
    writeTokens(tokens);
  }
  return found;
}

/**
 * Regenerates a fresh lifetime QR code for a user, revoking previous ones.
 */
async function regenerateQr(user) {
  const userId = String(user.id || user._id || user.officerId);
  revokeQr(userId);
  return await createQrLoginToken(user);
}

function getTokens(limit = 50) {
  const tokens = readTokens();
  return tokens.slice(0, limit);
}

module.exports = {
  createQrLoginToken,
  generateLifetimeQr: createQrLoginToken,
  validateAndConsumeQr,
  verifyLifetimeQr: validateAndConsumeQr,
  revokeQr,
  regenerateQr,
  getTokens,
};
