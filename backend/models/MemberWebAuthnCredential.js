const mongoose = require('mongoose');

// Separate collection so we do not modify existing Member schema.
const memberWebAuthnCredentialSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      ref: 'Member',
      required: true,
      index: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      default: 0,
    },
    transports: {
      type: [String],
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'MemberWebAuthnCredential',
  memberWebAuthnCredentialSchema
);

