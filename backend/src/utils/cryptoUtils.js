const crypto = require('crypto');

const FINGERPRINT_SECRET = process.env.PASSWORD_FINGERPRINT_SECRET || 'canteen_super_secret_hmac_key_2026_deterministic';

/**
 * Generates a deterministic, keyed cryptographic HMAC-SHA256 fingerprint for password uniqueness.
 * Does not expose the plaintext password or the hash.
 * @param {string} password 
 * @returns {string|null}
 */
function generatePasswordFingerprint(password) {
  if (!password) return null;
  const clean = String(password).trim();
  if (!clean) return null;
  return crypto.createHmac('sha256', FINGERPRINT_SECRET).update(clean).digest('hex');
}

module.exports = {
  generatePasswordFingerprint,
  FINGERPRINT_SECRET
};
