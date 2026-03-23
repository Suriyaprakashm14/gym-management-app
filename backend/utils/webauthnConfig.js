const DEFAULT_ORIGIN = 'http://localhost:3000';

function getWebAuthnOrigin() {
  return (process.env.WEBAUTHN_ORIGIN || DEFAULT_ORIGIN).trim();
}

function getWebAuthnRpId() {
  // For localhost origins, rpID must be "localhost"
  const envRpId = process.env.WEBAUTHN_RP_ID && process.env.WEBAUTHN_RP_ID.trim();
  if (envRpId) return envRpId;

  try {
    const origin = getWebAuthnOrigin();
    const u = new URL(origin);
    return u.hostname;
  } catch {
    return 'localhost';
  }
}

function getWebAuthnRpName() {
  return (process.env.WEBAUTHN_RP_NAME || 'FitForge').trim();
}

module.exports = {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  getWebAuthnRpName,
};

