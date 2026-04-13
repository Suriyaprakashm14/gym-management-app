const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const RevokedToken = require('../models/revokedToken');

const memorySet = new Set();

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/** No-op at startup; blacklist is in-process only. */
async function init() {
  // Ensure indexes exist when DB is available.
  if (!isMongoConnected()) return;

  const collection = RevokedToken.collection;
  const indexes = await collection.indexes();
  const legacyExpiresIndex = indexes.find((idx) => idx.name === 'expiresAt_1');
  // Legacy non-TTL index on expiresAt conflicts with TTL index creation.
  if (legacyExpiresIndex && legacyExpiresIndex.expireAfterSeconds == null) {
    await collection.dropIndex('expiresAt_1');
  }

  await RevokedToken.syncIndexes();
}

async function add(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  memorySet.add(tokenHash);
  if (!isMongoConnected()) return;

  let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // fallback 24h
  try {
    const decoded = jwt.decode(String(token));
    if (decoded && decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000);
    }
  } catch (_) {
    // keep fallback expiration
  }

  await RevokedToken.updateOne(
    { tokenHash },
    { $set: { tokenHash, expiresAt } },
    { upsert: true }
  );
}

async function has(token) {
  if (!token) return false;
  const tokenHash = hashToken(token);
  if (memorySet.has(tokenHash)) return true;
  if (!isMongoConnected()) return false;
  const row = await RevokedToken.findOne({ tokenHash }).select('_id').lean();
  return !!row;
}

module.exports = { init, add, has };
