/**
 * Central environment helpers and production startup validation.
 */

const PLACEHOLDER_JWT_SECRETS = new Set([
  'your_jwt_secret_key_here',
  'dev-only-jwt-secret-min-32-chars!!',
]);

const DEV_SESSION_FALLBACK = 'dev-session-secret-change-me';

function isProduction() {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * Call once at process startup (after dotenv). Throws if production config is unsafe.
 */
function assertProductionConfig() {
  if (!isProduction()) {
    return;
  }

  const jwt = (process.env.JWTSECRET || '').trim();
  if (!jwt || jwt.length < 32) {
    throw new Error(
      'Production requires JWTSECRET (set a strong secret, at least 32 characters).'
    );
  }
  if (PLACEHOLDER_JWT_SECRETS.has(jwt)) {
    throw new Error('Production requires a unique JWTSECRET (not a placeholder).');
  }

  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      'Production requires SESSION_SECRET (at least 32 characters; use a random value).'
    );
  }
  if (sessionSecret === DEV_SESSION_FALLBACK) {
    throw new Error('Production cannot use the default dev SESSION_SECRET.');
  }

  const mongo = (process.env.MONGODB_URI || '').trim();
  if (!mongo) {
    throw new Error('Production requires MONGODB_URI.');
  }
}

function getJwtSecret() {
  if (isProduction()) {
    return process.env.JWTSECRET.trim();
  }
  const fromEnv = (process.env.JWTSECRET || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  return 'dev-only-jwt-secret-min-32-chars!!';
}

function getSessionSecret() {
  if (isProduction()) {
    return process.env.SESSION_SECRET.trim();
  }
  return (process.env.SESSION_SECRET || '').trim() || DEV_SESSION_FALLBACK;
}

function sessionCookieSecure() {
  if (process.env.SESSION_COOKIE_SECURE === 'true') {
    return true;
  }
  if (process.env.SESSION_COOKIE_SECURE === 'false') {
    return false;
  }
  return isProduction();
}

function getMongoUri() {
  if (isProduction()) {
    return process.env.MONGODB_URI.trim();
  }
  return (process.env.MONGODB_URI || 'mongodb://localhost:27017/').trim();
}

module.exports = {
  isProduction,
  assertProductionConfig,
  getJwtSecret,
  getSessionSecret,
  sessionCookieSecure,
  getMongoUri,
};
