const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const crypto = require('crypto');
const Member = require('../models/member');
const Attendance = require('../models/attendance');

const RP_ID = 'localhost';
const EXPECTED_ORIGIN = 'http://localhost:3000';
const RP_NAME = 'FitForge';

const SESSION_KEY = 'memberFingerprintWebAuthn';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function ensureStore(req) {
  if (!req.session) return {};
  if (!req.session[SESSION_KEY]) req.session[SESSION_KEY] = {};
  return req.session[SESSION_KEY];
}

function isExpired(expiresAt) {
  return typeof expiresAt === 'number' && Date.now() > expiresAt;
}

function setChallenge(req, type, { challenge, memberId }) {
  const store = ensureStore(req);
  store[type] = {
    challenge,
    memberId: memberId != null ? String(memberId) : null,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
}

function consumeChallenge(req, type) {
  if (!req.session || !req.session[SESSION_KEY] || !req.session[SESSION_KEY][type]) return null;
  const entry = req.session[SESSION_KEY][type];
  delete req.session[SESSION_KEY][type];
  if (!entry || !entry.challenge) return null;
  if (isExpired(entry.expiresAt)) return null;
  return entry;
}

function stripTime(d) {
  const x = d instanceof Date ? new Date(d) : new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bufferToUint8Array(maybeBuffer) {
  if (!maybeBuffer) return null;
  if (Buffer.isBuffer(maybeBuffer)) return new Uint8Array(maybeBuffer);
  if (maybeBuffer instanceof Uint8Array) return maybeBuffer;
  try {
    return new Uint8Array(Buffer.from(String(maybeBuffer), 'base64'));
  } catch {
    return null;
  }
}

async function getRegisterOptions({ req, memberId, pendingUser }) {
  // Allow two modes:
  // - memberId provided: generate options for that member + exclude existing credential
  // - memberId omitted/null: generate options for "pending" enrollment stored in session
  let excludeCredentials = [];
  let userID;
  let userName = pendingUser?.userName || 'Final-user';
  let userDisplayName = pendingUser?.displayName || 'Pending fingerprint';

  if (memberId != null) {
    const member = await Member.findById(memberId);
    if (!member) {
      const err = new Error('Member not found');
      err.code = 'MEMBER_NOT_FOUND';
      throw err;
    }

    excludeCredentials = member.fingerprintId
      ? [
          {
            id: member.fingerprintId, // base64url string
            type: 'public-key',
          },
        ]
      : [];

    userID = Buffer.from(String(member._id), 'utf8');
    userName = member.email || member.firstName || 'user';
    userDisplayName =
      `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'user';
  } else {
    // simplewebauthn@13 expects userID as bytes.
    userID = crypto.randomBytes(32);
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID,
    userName,
    userDisplayName,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 60000,
    excludeCredentials,
  });

  setChallenge(req, 'registration', { challenge: options.challenge, memberId: memberId != null ? memberId : null });

  return options;
}

async function verifyAndStoreRegistration({ req, memberId, registrationResponse }) {
  const targetMemberId = memberId != null ? String(memberId) : null;
  const ch = consumeChallenge(req, 'registration');
  if (!ch || ch.memberId !== targetMemberId) {
    const err = new Error('Invalid or expired registration challenge');
    err.code = 'BAD_CHALLENGE';
    throw err;
  }

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: ch.challenge,
    expectedOrigin: EXPECTED_ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification?.verified || !verification.registrationInfo?.credential) {
    const err = new Error('Registration verification failed');
    err.code = 'REGISTRATION_FAILED';
    throw err;
  }

  const { credential } = verification.registrationInfo;

  // If memberId is not provided, store credential as "pending" in the session.
  if (memberId == null) {
    const store = ensureStore(req);
    store.pendingFingerprint = {
      fingerprintId: credential.id, // base64url string
      publicKeyBase64: Buffer.from(credential.publicKey).toString('base64'),
      counter: typeof credential.counter === 'number' ? credential.counter : 0,
    };
    return { status: 'success', message: 'Fingerprint enrolled (pending)' };
  }

  const member = await Member.findById(memberId);
  if (!member) {
    const err = new Error('Member not found');
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  member.fingerprintId = credential.id; // base64url string
  member.publicKey = Buffer.from(credential.publicKey); // raw bytes
  member.counter = typeof credential.counter === 'number' ? credential.counter : 0;
  member.hasFingerprint = true;
  member.fingerprintEnrolled = new Date();
  member.authMethods = member.authMethods || {};
  member.authMethods.fingerprint = true;

  // Avoid unrelated schema validation failures (e.g. membership enum)
  // when we're only persisting fingerprint fields.
  await member.save({ validateBeforeSave: false });

  return { status: 'success', message: 'Fingerprint enrolled' };
}

async function attachPendingFingerprintToMember({ req, memberId }) {
  const store = ensureStore(req);
  const pending = store.pendingFingerprint;

  if (!pending?.fingerprintId || !pending?.publicKeyBase64) {
    const err = new Error('No pending fingerprint enrollment found');
    err.code = 'NO_PENDING_FINGERPRINT';
    throw err;
  }

  const member = await Member.findById(memberId);
  if (!member) {
    const err = new Error('Member not found');
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  member.fingerprintId = pending.fingerprintId;
  member.publicKey = Buffer.from(pending.publicKeyBase64, 'base64');
  member.counter = typeof pending.counter === 'number' ? pending.counter : 0;
  member.hasFingerprint = true;
  member.fingerprintEnrolled = new Date();
  member.authMethods = member.authMethods || {};
  member.authMethods.fingerprint = true;

  // Avoid unrelated schema validation failures (e.g. membership enum)
  // when we're only attaching fingerprint fields.
  await member.save({ validateBeforeSave: false });

  delete store.pendingFingerprint;

  return { status: 'success', message: 'Fingerprint attached to member' };
}

async function getAuthenticationOptions({ req }) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    timeout: 60000,
    // Discoverable credentials: we intentionally omit allowCredentials.
  });

  setChallenge(req, 'authentication', { challenge: options.challenge, memberId: null });

  return options;
}

async function verifyAndMarkAttendance({ req, authenticationResponse }) {
  const ch = consumeChallenge(req, 'authentication');
  if (!ch) {
    const err = new Error('Invalid or expired authentication challenge');
    err.code = 'BAD_CHALLENGE';
    throw err;
  }

  const credentialId = String(authenticationResponse?.id || '');
  if (!credentialId) {
    const err = new Error('Missing credential id');
    err.code = 'MISSING_CREDENTIAL_ID';
    throw err;
  }

  // Identify member by credential ID
  const member = await Member.findOne({ fingerprintId: credentialId });
  if (!member) {
    const err = new Error('Credential not recognized');
    err.code = 'CREDENTIAL_NOT_FOUND';
    throw err;
  }

  const publicKeyUint8 = bufferToUint8Array(member.publicKey);
  if (!publicKeyUint8) {
    const err = new Error('Member public key missing');
    err.code = 'MISSING_PUBLIC_KEY';
    throw err;
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: ch.challenge,
    expectedOrigin: EXPECTED_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credentialId, // base64url string
      publicKey: publicKeyUint8,
      counter: member.counter || 0,
    },
  });

  if (!verification?.verified) {
    const err = new Error('Authentication failed');
    err.code = 'AUTH_FAILED';
    throw err;
  }

  const newCounter = verification.authenticationInfo?.newCounter;
  if (typeof newCounter === 'number') {
    member.counter = newCounter;
    // Avoid unrelated schema validation failures when updating counter.
    await member.save({ validateBeforeSave: false });
  }

  // Subscription / membership date window check
  const now = new Date();
  const today = stripTime(now);

  const startDate = member.membership?.startDate ? stripTime(member.membership.startDate) : null;
  const endDate = member.membership?.endDate ? stripTime(member.membership.endDate) : null;

  if (startDate && today < startDate) {
    return {
      status: 'error',
      message: 'Authentication Failed or Subscription Issue',
      subscriptionStatus: 'NOT_STARTED',
      subscriptionMessage: 'Subscription Not Started',
    };
  }

  if (endDate && today > endDate) {
    return {
      status: 'error',
      message: 'Authentication Failed or Subscription Issue',
      subscriptionStatus: 'EXPIRED',
      subscriptionMessage: 'Subscription Expired',
    };
  }

  // Mark attendance as fingerprint-based check-in.
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await Attendance.findOne({
    gymId: member.gymId,
    memberId: member._id,
    attendanceDate: { $gte: today, $lt: tomorrow },
    status: 'Present',
    authMethod: 'fingerprint',
  });

  if (!existingAttendance) {
    await Attendance.create({
      gymId: member.gymId,
      memberId: member._id,
      attendanceDate: new Date(),
      status: 'Present',
      authMethod: 'fingerprint',
      authData: {
        deviceInfo: {
          deviceIP: req.ip || 'unknown',
          deviceModel: 'Windows Hello (WebAuthn)',
          deviceType: 'fingerprint_webauthn',
        },
      },
      location: {
        branchId: member.branchId,
        deviceId: 'fingerprint_webauthn_terminal',
      },
      checkInTime: new Date(),
    });
  }

  return { status: 'success', message: 'Attendance marked', subscriptionStatus: 'PRESENT' };
}

module.exports = {
  getRegisterOptions,
  verifyAndStoreRegistration,
  attachPendingFingerprintToMember,
  getAuthenticationOptions,
  verifyAndMarkAttendance,
  RP_ID,
  EXPECTED_ORIGIN,
};

