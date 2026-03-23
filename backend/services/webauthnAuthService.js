const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const RP_ID = 'localhost';
const EXPECTED_ORIGIN = 'http://localhost:3000';
const RP_NAME = 'FitForge';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const SESSION_KEY = 'webauthnAuth';

function ensureStore(req) {
  if (!req.session) return {};
  if (!req.session[SESSION_KEY]) req.session[SESSION_KEY] = {};
  return req.session[SESSION_KEY];
}

function isExpired(expiresAt) {
  return typeof expiresAt === 'number' && Date.now() > expiresAt;
}

function setChallenge(req, type, { challenge, userId }) {
  const store = ensureStore(req);
  store[type] = {
    challenge,
    userId: userId != null ? String(userId) : null,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
}

function consumeChallenge(req, type) {
  if (!req.session || !req.session[SESSION_KEY] || !req.session[SESSION_KEY][type]) return null;
  const entry = req.session[SESSION_KEY][type];
  delete req.session[SESSION_KEY][type];
  if (!entry || !entry.challenge || !entry.userId) return null;
  if (isExpired(entry.expiresAt)) return null;
  return entry;
}

async function makeRegistrationOptions({ user }) {
  const excludeCredentials =
    user.webauthn?.credentialID && Buffer.isBuffer(user.webauthn.credentialID)
      ? [
          {
            id: user.webauthn.credentialID,
            type: 'public-key',
          },
        ]
      : [];

  // simplewebauthn@13+ expects userID as bytes (Buffer/Uint8Array), not a string.
  const userIDBuffer = Buffer.from(String(user._id), 'utf8');

  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userIDBuffer,
    userName: user.email,
    userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 60000,
    ...(excludeCredentials.length > 0 ? { excludeCredentials } : {}),
  });
}

async function makeAuthenticationOptions({ user }) {
  if (!user.webauthn?.credentialID) {
    const err = new Error('No WebAuthn credential enrolled');
    err.code = 'NO_CREDENTIAL';
    throw err;
  }

  // simplewebauthn@13 expects allowCredentials.id to be a base64url string.
  const credentialIDBase64Url = Buffer.isBuffer(user.webauthn.credentialID)
    ? user.webauthn.credentialID.toString('base64url')
    : String(user.webauthn.credentialID);

  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    timeout: 60000,
    allowCredentials: [
      {
        id: credentialIDBase64Url,
        type: 'public-key',
      },
    ],
  });
}

async function verifyRegister({ req, response, userId }) {
  if (!req.session) {
    const err = new Error('Session not available');
    err.code = 'NO_SESSION';
    throw err;
  }

  const entry = consumeChallenge(req, 'registration');
  if (!entry || entry.userId !== String(userId)) {
    const err = new Error('Invalid or expired registration challenge');
    err.code = 'BAD_CHALLENGE';
    throw err;
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: entry.challenge,
    expectedOrigin: EXPECTED_ORIGIN,
    expectedRPID: RP_ID,
  });

  return verification;
}

async function verifyLogin({ req, response, user }) {
  if (!req.session) {
    const err = new Error('Session not available');
    err.code = 'NO_SESSION';
    throw err;
  }

  const entry = consumeChallenge(req, 'authentication');
  if (!entry || entry.userId !== String(user._id)) {
    const err = new Error('Invalid or expired authentication challenge');
    err.code = 'BAD_CHALLENGE';
    throw err;
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: entry.challenge,
    expectedOrigin: EXPECTED_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: Buffer.isBuffer(user.webauthn.credentialID)
        ? user.webauthn.credentialID.toString('base64url')
        : String(user.webauthn.credentialID),
      publicKey: Buffer.isBuffer(user.webauthn.publicKey)
        ? new Uint8Array(user.webauthn.publicKey)
        : user.webauthn.publicKey,
      counter: user.webauthn.counter || 0,
      transports: Array.isArray(user.webauthn?.transports) ? user.webauthn.transports : undefined,
    },
  });

  return verification;
}

module.exports = {
  RP_ID,
  EXPECTED_ORIGIN,
  makeRegistrationOptions,
  makeAuthenticationOptions,
  setChallenge,
  verifyRegister,
  verifyLogin,
};

