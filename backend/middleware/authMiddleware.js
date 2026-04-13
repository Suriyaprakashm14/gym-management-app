const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');
const blacklist = require('./tokenBlacklist');
const User = require('../models/user');
const Member = require('../models/member');

const JWTSECRET = getJwtSecret();

function toId(value) {
  return value == null ? null : String(value);
}

async function resolvePrincipal(decoded) {
  const userId = toId(decoded?.id || decoded?._id);
  if (!userId) return null;

  const dbUser = await User.findById(userId)
    .select('_id role gymId branchId branches isActive status')
    .lean();
  if (dbUser) {
    return {
      id: toId(dbUser._id),
      role: String(dbUser.role || ''),
      gymId: toId(dbUser.gymId),
      branchId: toId(dbUser.branchId),
      branches: Array.isArray(dbUser.branches) ? dbUser.branches.map((b) => toId(b)).filter(Boolean) : [],
      isActive: dbUser.isActive !== false,
      status: String(dbUser.status || ''),
      source: 'user',
    };
  }

  // Legacy fallback
  const member = await Member.findById(userId).select('_id role gymId branchId isActive status').lean();
  if (member) {
    return {
      id: toId(member._id),
      role: String(member.role || ''),
      gymId: toId(member.gymId),
      branchId: toId(member.branchId),
      branches: [],
      isActive: member.isActive !== false,
      status: String(member.status || ''),
      source: 'member',
    };
  }
  return null;
}

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
    const principal = await resolvePrincipal(decoded);
    if (!principal) {
      return res.status(401).json({ error: 'User not found for token' });
    }

    // Hard tenant guards: every authenticated operator must carry valid scope.
    if (principal.role === 'gym_owner' && !principal.gymId) {
      return res.status(403).json({ error: 'Invalid account scope: missing gymId' });
    }
    if ((principal.role === 'manager' || principal.role === 'staff') && (!principal.gymId || !principal.branchId)) {
      return res.status(403).json({ error: 'Invalid account scope: missing gymId/branchId' });
    }

    req.user = {
      ...decoded,
      id: principal.id,
      role: principal.role,
      gymId: principal.gymId,
      branchId: principal.branchId,
      branches: principal.branches,
      isActive: principal.isActive,
      status: principal.status,
      principalSource: principal.source,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
