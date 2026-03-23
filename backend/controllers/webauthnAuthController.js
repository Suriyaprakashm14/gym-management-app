const jwt = require('jsonwebtoken');
const User = require('../models/user');

const webauthnAuthService = require('../services/webauthnAuthService');

const JWTSECRET = process.env.JWTSECRET || 'your_jwt_secret_key_here';
const JWTEXPIRESIN = '8h';

function requireUserIdFromReq(req) {
  const id = req.user?.id || req.user?._id || req.user;
  return id ? String(id) : null;
}

async function buildAuthResponseForUser({ user }) {
  const populated = await User.findById(user._id)
    .populate('gymId', 'name status isFrozen logoUrl')
    .populate('branchId', 'name status')
    .lean();

  if (!populated) return null;

  const tokenPayload = {
    id: populated._id,
    role: populated.role,
    gymId: populated.gymId?._id || populated.gymId,
    branchId: populated.branchId?._id || populated.branchId,
    email: populated.email,
    firstName: populated.firstName,
    lastName: populated.lastName,
    isLegacy: false,
  };

  const token = jwt.sign(tokenPayload, JWTSECRET, { expiresIn: JWTEXPIRESIN });

  return {
    token,
    user: {
      id: populated._id,
      firstName: populated.firstName,
      lastName: populated.lastName,
      email: populated.email,
      role: populated.role,
      gymId: populated.gymId?._id || populated.gymId,
      gymName: populated.gymId?.name,
      gymLogo: populated.gymId?.logoUrl || null,
      branchId: populated.branchId?._id || populated.branchId,
      branchName: populated.branchId?.name,
      permissions: populated.permissions || [],
      lastLogin: populated.lastLogin,
      isLegacy: false,
    },
  };
}

async function assertUserUsable({ user }) {
  if (!user) {
    const err = new Error('User not found');
    err.code = 'NO_USER';
    throw err;
  }

  if (user.isActive === false) {
    const err = new Error('Account deactivated');
    err.code = 'DEACTIVATED';
    throw err;
  }

  // Keep behavior consistent with email/password login.
  if (user.isLocked) {
    const devEmails = ['owner@gympro.com', 'manager@gympro.com'];
    const skipLock = process.env.NODE_ENV === 'development' && devEmails.includes(String(user.email).toLowerCase());
    if (!skipLock) {
      const err = new Error('Account is temporarily locked due to multiple failed login attempts.');
      err.code = 'LOCKED';
      throw err;
    }
  }

  if (user.isFrozen) {
    const frozen = await user.isFrozen();
    if (frozen) {
      const err = new Error('Your account is frozen. Please contact your gym owner or manager.');
      err.code = 'FROZEN';
      throw err;
    }
  }
}

function mapWebAuthnErrorToStatus(code) {
  if (!code) return 500;
  const normalized = String(code);
  if (normalized === 'BAD_CHALLENGE') return 400;
  if (normalized === 'NO_CREDENTIAL') return 400;
  if (normalized === 'NO_USER') return 404;
  if (normalized === 'DEACTIVATED') return 403;
  if (normalized === 'FROZEN') return 403;
  if (normalized === 'LOCKED') return 423;
  if (normalized === 'NO_SESSION') return 500;
  return 500;
}

exports.registerOptions = async (req, res) => {
  try {
    const userId = requireUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    await assertUserUsable({ user });

    const options = await webauthnAuthService.makeRegistrationOptions({ user });

    // Save challenge in session for the subsequent verify call.
    webauthnAuthService.setChallenge(req, 'registration', {
      challenge: options.challenge,
      userId,
    });

    return res.json({ success: true, options });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthnAuth.registerOptions] error', err);
    const status = mapWebAuthnErrorToStatus(err?.code);
    return res.status(status).json({
      success: false,
      message: err?.message || 'WebAuthn register options failed',
    });
  }
};

exports.registerVerify = async (req, res) => {
  try {
    const userId = requireUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { response } = req.body || {};
    if (!response) {
      return res.status(400).json({ success: false, message: 'Missing WebAuthn response' });
    }

    const user = await User.findById(userId);
    await assertUserUsable({ user });

    const verification = await webauthnAuthService.verifyRegister({
      req,
      response,
      userId,
    });

    if (!verification?.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: 'Registration verification failed' });
    }

    const regInfo = verification.registrationInfo;
    // @simplewebauthn/server v13:
    // registrationInfo.credential: { id: base64url string, publicKey: Uint8Array, counter: number }
    const credential = regInfo?.credential;
    const credentialIDValue = credential?.id;
    const credentialPublicKeyValue = credential?.publicKey;
    const counter = regInfo?.counter ?? credential?.counter;

    function decodePossiblyEncodedStringToBuffer(value, fallbackBase = 'base64') {
      if (typeof value !== 'string') return null;
      // base64url vs base64 heuristic
      const looksLikeBase64Url = value.includes('-') || value.includes('_') || (!value.includes('+') && !value.includes('/'));
      const enc = looksLikeBase64Url ? 'base64url' : fallbackBase;
      return Buffer.from(value, enc);
    }

    function toBuffer(value, opts) {
      if (value == null) return null;
      if (Buffer.isBuffer(value)) return value;
      if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
      if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      if (typeof value === 'string') {
        if (opts?.encoding === 'base64url') return decodePossiblyEncodedStringToBuffer(value, 'base64');
        if (opts?.encoding === 'base64') return Buffer.from(value, 'base64');
        return decodePossiblyEncodedStringToBuffer(value, 'base64');
      }
      // Uint8Array / other array-like
      try {
        return Buffer.from(value);
      } catch {
        return null;
      }
    }

    const credentialIDBuf = toBuffer(credentialIDValue, { encoding: 'base64url' });
    const publicKeyBuf = toBuffer(credentialPublicKeyValue);

    if (!credentialIDBuf || !publicKeyBuf) {
      return res.status(400).json({
        success: false,
        message: 'Registration info missing credentialID or publicKey',
      });
    }

    user.webauthn = {
      credentialID: credentialIDBuf,
      publicKey: publicKeyBuf,
      counter: typeof counter === 'number' ? counter : 0,
    };
    user.hasFingerprint = true;
    user.fingerprintEnrolled = new Date();
    user.authMethods = user.authMethods || {};
    user.authMethods.fingerprint = true;

    await user.save();

    return res.json({ success: true, verified: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthnAuth.registerVerify] error', err);
    const status = mapWebAuthnErrorToStatus(err?.code);
    return res.status(status).json({
      success: false,
      message: err?.message || 'WebAuthn register verify failed',
    });
  }
};

exports.loginOptions = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await assertUserUsable({ user });

    if (!user.webauthn?.credentialID) {
      return res.status(400).json({
        success: false,
        message: 'No fingerprint credential enrolled for this account',
      });
    }

    const options = await webauthnAuthService.makeAuthenticationOptions({ user });

    // Save challenge in session for the subsequent verify call.
    webauthnAuthService.setChallenge(req, 'authentication', {
      challenge: options.challenge,
      userId: user._id,
    });

    return res.json({ success: true, options });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthnAuth.loginOptions] error', err);
    const status = mapWebAuthnErrorToStatus(err?.code);
    return res.status(status).json({
      success: false,
      message: err?.message || 'WebAuthn login options failed',
    });
  }
};

exports.loginVerify = async (req, res) => {
  try {
    const { response } = req.body || {};
    if (!response) {
      return res.status(400).json({ success: false, message: 'Missing WebAuthn response' });
    }

    // Challenge is tied to a userId stored in session.
    const entry = req.session?.webauthnAuth?.authentication;
    if (!entry?.challenge || !entry?.userId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired authentication challenge' });
    }

    const user = await User.findById(entry.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await assertUserUsable({ user });

    const verification = await webauthnAuthService.verifyLogin({
      req,
      response,
      user,
    });

    if (!verification?.verified) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }

    const newCounter = verification.authenticationInfo?.newCounter;
    if (typeof newCounter === 'number') {
      user.webauthn.counter = newCounter;
      await user.save();
    }

    // Clear lock info after successful auth (same semantics as password login reset).
    if (user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    user.lastLogin = new Date();
    await user.save();

    const auth = await buildAuthResponseForUser({ user });
    if (!auth) {
      return res.status(500).json({ success: false, message: 'Failed to build auth response' });
    }

    return res.json({
      success: true,
      message: 'Fingerprint login successful',
      ...auth,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webauthnAuth.loginVerify] error', err);
    const status = mapWebAuthnErrorToStatus(err?.code);
    return res.status(status).json({
      success: false,
      message: err?.message || 'WebAuthn login verify failed',
    });
  }
};

