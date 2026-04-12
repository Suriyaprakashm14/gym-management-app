const crypto = require('crypto');

const memorySet = new Set();

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** No-op at startup; blacklist is in-process only. */
async function init() {
  /* in-memory Set — single instance; cleared on restart */
}

async function add(token) {
  if (!token) return;
  memorySet.add(hashToken(token));
}

async function has(token) {
  if (!token) return false;
  return memorySet.has(hashToken(token));
}

module.exports = { init, add, has };
