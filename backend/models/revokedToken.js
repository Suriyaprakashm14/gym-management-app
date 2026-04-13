const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-remove expired revoked tokens.
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'revokedTokenExpiresAtTTL' });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
