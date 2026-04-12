/**
 * MongoDB / Mongoose write error helpers (duplicate keys, etc.).
 */

function isDuplicateKeyError(err) {
  return Boolean(err && (err.code === 11000 || err.code === '11000'));
}

/**
 * Duplicate key on a unique index that includes `email` (typical User collection).
 */
function isUserEmailDuplicateKey(err) {
  if (!isDuplicateKeyError(err)) return false;
  const kp = err.keyPattern;
  if (kp && Object.prototype.hasOwnProperty.call(kp, 'email')) return true;
  const kv = err.keyValue;
  if (kv && Object.prototype.hasOwnProperty.call(kv, 'email')) return true;
  const msg = String(err.message || '');
  return /E11000/i.test(msg) && /email/i.test(msg);
}

function isUserPhoneDuplicateKey(err) {
  if (!isDuplicateKeyError(err)) return false;
  const kp = err.keyPattern;
  if (kp && Object.prototype.hasOwnProperty.call(kp, 'phone')) return true;
  const kv = err.keyValue;
  if (kv && Object.prototype.hasOwnProperty.call(kv, 'phone')) return true;
  const msg = String(err.message || '');
  return /E11000/i.test(msg) && /phone/i.test(msg);
}

module.exports = {
  isDuplicateKeyError,
  isUserEmailDuplicateKey,
  isUserPhoneDuplicateKey,
};
