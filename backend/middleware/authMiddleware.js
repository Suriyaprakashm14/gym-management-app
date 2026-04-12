const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');
const blacklist = require('./tokenBlacklist');

const JWTSECRET = getJwtSecret();

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    if (await blacklist.has(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
  } catch (err) {
    return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
  }

  try {
    const decoded = jwt.verify(token, JWTSECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
