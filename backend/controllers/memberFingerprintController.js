const memberFingerprintWebAuthnService = require('../services/memberFingerprintWebAuthnService');

function toErrorResponse(res, statusCode, message, code) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: code || 'REQUEST_FAILED',
      message,
      details: null,
    },
    message,
  });
}

function mapErrorToStatus(err) {
  const c = String(err?.code || '');
  if (c === 'MEMBER_NOT_FOUND') return 404;
  if (c === 'BAD_CHALLENGE') return 400;
  if (c === 'FORBIDDEN_MEMBER_SCOPE') return 403;
  if (c === 'AUTH_FAILED' || c === 'CREDENTIAL_NOT_FOUND') return 401;
  return 500;
}

exports.registerFingerprint = async (req, res) => {
  try {
    const { memberId, registrationResponse, pendingUser } = req.body || {};

    const normalizedMemberId = memberId != null ? String(memberId) : null;

    // Mode A: no memberId + no registrationResponse => return pending registration options
    if (!registrationResponse && !normalizedMemberId) {
      const options = await memberFingerprintWebAuthnService.getRegisterOptions({
        req,
        memberId: null,
        pendingUser: pendingUser || null,
      });
      return res.json({ success: true, data: options });
    }

    // Mode B: memberId provided + no registrationResponse => attach pending credential to member
    if (!registrationResponse && normalizedMemberId) {
      try {
        const result = await memberFingerprintWebAuthnService.attachPendingFingerprintToMember({
          req,
          memberId: normalizedMemberId,
        });
        return res.json({ success: true, data: result });
      } catch (err) {
        // If there's no pending credential in session, fall back to generating member-specific options.
        if (String(err?.code) === 'NO_PENDING_FINGERPRINT') {
          const options = await memberFingerprintWebAuthnService.getRegisterOptions({
            req,
            memberId: normalizedMemberId,
          });
          return res.json({ success: true, data: options });
        }
        throw err;
      }
    }

    // Mode C: registrationResponse provided + no memberId => verify and store as pending in session
    if (registrationResponse && !normalizedMemberId) {
      const result = await memberFingerprintWebAuthnService.verifyAndStoreRegistration({
        req,
        memberId: null,
        registrationResponse,
      });
      return res.json({ success: true, data: result });
    }

    // Mode D: registrationResponse provided + memberId => verify and store directly
    if (registrationResponse && normalizedMemberId) {
      const result = await memberFingerprintWebAuthnService.verifyAndStoreRegistration({
        req,
        memberId: normalizedMemberId,
        registrationResponse,
      });
      return res.json({ success: true, data: result });
    }

    return toErrorResponse(res, 400, 'Invalid request', 'INVALID_REQUEST');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[memberFingerprintController.registerFingerprint] error', err);
    const status = mapErrorToStatus(err);
    return toErrorResponse(
      res,
      status,
      err?.message || 'Registration failed',
      err?.code || 'REGISTRATION_FAILED'
    );
  }
};

exports.verifyFingerprint = async (req, res) => {
  try {
    const { authenticationResponse } = req.body || {};

    if (!authenticationResponse) {
      const options = await memberFingerprintWebAuthnService.getAuthenticationOptions({ req });
      return res.json({ success: true, data: options });
    }

    const result = await memberFingerprintWebAuthnService.verifyAndMarkAttendance({
      req,
      authenticationResponse,
    });

    // Subscription issues are returned as an "error status" but still HTTP 200 so the UI can show a toast.
    return res.json({ success: true, data: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[memberFingerprintController.verifyFingerprint] error', err);
    const status = mapErrorToStatus(err);
    return toErrorResponse(
      res,
      status,
      'Authentication Failed or Subscription Issue',
      err?.code || 'AUTH_FAILED'
    );
  }
};

