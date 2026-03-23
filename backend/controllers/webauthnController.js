const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const Member = require('../models/member');
const MemberWebAuthnCredential = require('../models/MemberWebAuthnCredential');
const {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  getWebAuthnRpName,
} = require('../utils/webauthnConfig');

// In-memory, short-lived store. No sessions added; keeps feature isolated.
const CHALLENGES = new Map(); // challengeId -> { challenge, expiresAt, memberId? }
const ATTENDANCE_TOKENS = new Map(); // token -> { memberId, expiresAt }

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const ATTENDANCE_TOKEN_TTL_MS = 60 * 1000;

function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function putChallenge({ memberId, challenge }) {
  const challengeId = randomId(16);
  CHALLENGES.set(challengeId, {
    memberId: memberId || null,
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return challengeId;
}

function consumeChallenge(challengeId) {
  const entry = CHALLENGES.get(challengeId);
  CHALLENGES.delete(challengeId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

function issueAttendanceToken(memberId) {
  const token = randomId(24);
  ATTENDANCE_TOKENS.set(token, {
    memberId,
    expiresAt: Date.now() + ATTENDANCE_TOKEN_TTL_MS,
  });
  return token;
}

function consumeAttendanceToken(token) {
  const entry = ATTENDANCE_TOKENS.get(token);
  ATTENDANCE_TOKENS.delete(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

async function registerStart(req, res) {
  try {
    const { memberId } = req.body || {};
    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required' });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const existingCreds = await MemberWebAuthnCredential.find({ memberId: member._id });
    const options = await generateRegistrationOptions({
      rpName: getWebAuthnRpName(),
      rpID: getWebAuthnRpId(),
      userID: String(member._id),
      userName: member.email || member.profile?.phone || String(member._id),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: 60000,
      excludeCredentials: existingCreds.map((c) => ({
        id: Buffer.from(c.credentialId, 'base64url'),
        type: 'public-key',
        transports: Array.isArray(c.transports) ? c.transports : undefined,
      })),
    });

    const challengeId = putChallenge({ memberId: member._id, challenge: options.challenge });
    return res.json({ success: true, challengeId, options });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthn.registerStart] error', err);
    return res.status(500).json({ success: false, message: 'WebAuthn register start failed' });
  }
}

async function registerVerify(req, res) {
  try {
    const { memberId, challengeId, response } = req.body || {};
    if (!memberId || !challengeId || !response) {
      return res.status(400).json({ success: false, message: 'memberId, challengeId, and response are required' });
    }

    const ch = consumeChallenge(challengeId);
    if (!ch || ch.memberId !== memberId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired challenge' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: getWebAuthnOrigin(),
      expectedRPID: getWebAuthnRpId(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: 'Registration verification failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
    const credentialId = Buffer.from(credentialID).toString('base64url');
    const publicKey = Buffer.from(credentialPublicKey).toString('base64');

    await MemberWebAuthnCredential.findOneAndUpdate(
      { credentialId },
      {
        memberId,
        credentialId,
        publicKey,
        counter: typeof counter === 'number' ? counter : 0,
        transports: Array.isArray(response?.transports) ? response.transports : undefined,
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, verified: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthn.registerVerify] error', err);
    return res.status(500).json({ success: false, message: 'WebAuthn register verify failed' });
  }
}

async function loginStart(req, res) {
  try {
    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpId(),
      userVerification: 'required',
      timeout: 60000,
      // Discoverable credentials: do NOT set allowCredentials.
    });
    const challengeId = putChallenge({ memberId: null, challenge: options.challenge });
    return res.json({ success: true, challengeId, options });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthn.loginStart] error', err);
    return res.status(500).json({ success: false, message: 'WebAuthn login start failed' });
  }
}

async function loginVerify(req, res) {
  try {
    const { challengeId, response } = req.body || {};
    if (!challengeId || !response) {
      return res.status(400).json({ success: false, message: 'challengeId and response are required' });
    }

    const ch = consumeChallenge(challengeId);
    if (!ch) {
      return res.status(400).json({ success: false, message: 'Invalid or expired challenge' });
    }

    const credentialId = String(response.id || '');
    if (!credentialId) {
      return res.status(400).json({ success: false, message: 'Missing credential id' });
    }

    const cred = await MemberWebAuthnCredential.findOne({ credentialId });
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: getWebAuthnOrigin(),
      expectedRPID: getWebAuthnRpId(),
      authenticator: {
        credentialID: Buffer.from(cred.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(cred.publicKey, 'base64'),
        counter: cred.counter || 0,
        transports: Array.isArray(cred.transports) ? cred.transports : undefined,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }

    const newCounter = verification.authenticationInfo?.newCounter;
    if (typeof newCounter === 'number') {
      cred.counter = newCounter;
      await cred.save();
    }

    const attendanceToken = issueAttendanceToken(cred.memberId);
    return res.json({ success: true, verified: true, memberId: cred.memberId, attendanceToken });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthn.loginVerify] error', err);
    return res.status(500).json({ success: false, message: 'WebAuthn login verify failed' });
  }
}

module.exports = {
  registerStart,
  registerVerify,
  loginStart,
  loginVerify,
  // exported for attendance controller use (token validation stays isolated)
  consumeAttendanceToken,
};

