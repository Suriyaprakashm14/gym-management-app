// const jwt = require('jsonwebtoken');
// // Fix environment variable name to match what your project uses
// const JWT_SECRET = process.env.JWTSECRET || 'your_jwt_secret_key_here';
// const blacklist = require('./tokenBlacklist');

// module.exports = function authMiddleware(req, res, next) {
//   const authHeader = req.header('Authorization');
//   console.log('Authorization Header:', authHeader);  // Debug log

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'No token provided' });
//   }
  
//   const token = authHeader.substring(7);
//   console.log('Token extracted:', token);  // Debug log

//   // Check if blacklisted
//   if (blacklist.has(token)) {
//     return res.status(401).json({ error: 'Token has been revoked' });
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.log('JWT verification error:', err.message);  // Debug log
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

const jwt = require('jsonwebtoken');
const JWTSECRET = process.env.JWTSECRET || 'your_jwt_secret_key_here';
const blacklist = require('./tokenBlacklist');

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');
  console.log('Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  console.log('Token extracted:', token);

  if (blacklist.has(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, JWTSECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT verification error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
