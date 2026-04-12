const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');

const JWTSECRET = getJwtSecret();

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWTSECRET);

    if (decoded.purpose !== 'password_reset') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // ✅ attach email to request
    req.resetEmail = decoded.email;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
