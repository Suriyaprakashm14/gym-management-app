module.exports = function branchManagerAccess(req, res, next) {
  const user = req.user; // from authMiddleware
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return res.status(403).json({ error: 'Access denied. Admins or Managers only' });
  }
  if (user.role === 'admin') {
    return next(); // unrestricted access
  }

  // Manager access: check branchId
  const branchIdInRequest = req.body.branchId || req.query.branchId;
  if (!branchIdInRequest) {
    return res.status(400).json({ error: 'branchId is required for branch-level access' });
  }
  if (branchIdInRequest.toString() !== user.branchId.toString()) {
    return res.status(403).json({ error: 'Access denied. Not authorized for this branch' });
  }
  next();
};
