const User = require('../models/user');
const Branch = require('../models/branch');

/**
 * GET /api/users/staff
 * List managers and staff for owner; list only staff (same branch) for manager.
 * Owner: role in [manager, staff], same gymId. Optional req.query.branchId scopes to that branch when valid for owner's gym.
 * Manager: role = staff, same branchId (manager does NOT see themselves).
 */
function getStaffListFilter(req) {
  const user = req.currentUser || req.user;
  if (!user) return null;
  if (user.role === 'gym_owner') {
    const gymId = user.gymId?._id || user.gymId;
    if (!gymId) return null;
    const filter = { gymId, role: { $in: ['manager', 'staff'] } };
    const queryBranchId = req.query && req.query.branchId ? String(req.query.branchId).trim() : null;
    if (queryBranchId) {
      if (user.branches && user.branches.length > 0) {
        const allowed = user.branches.some(b => b && String(b._id || b) === queryBranchId);
        if (allowed) filter.branchId = queryBranchId;
      } else {
        filter.branchId = queryBranchId;
      }
    }
    return filter;
  }
  if (user.role === 'manager') {
    const branchId = user.branchId?._id || user.branchId;
    return branchId ? { branchId, role: 'staff' } : null;
  }
  return null;
}

function getAssignableBranchesForStaff(req) {
  const user = req.currentUser || req.user;
  if (!user) return [];
  if (user.role === 'gym_owner') {
    if (user.branches && user.branches.length > 0) {
      return Branch.find({ _id: { $in: user.branches }, isActive: true }).select('_id name').lean();
    }
    return Branch.find({ gymId: user.gymId, isActive: true }).select('_id name').lean();
  }
  if (user.role === 'manager' && user.branchId) {
    return Branch.find({ _id: user.branchId, isActive: true }).select('_id name').lean();
  }
  return [];
}

exports.getStaff = async (req, res) => {
  try {
    let filter = getStaffListFilter(req);
    if (filter === null) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view staff.'
      });
    }

    const user = req.currentUser || req.user;
    if (user && user.role === 'gym_owner' && filter.branchId) {
      const gymId = user.gymId?._id || user.gymId;
      const hasAllowedBranches = user.branches && user.branches.length > 0;
      if (!hasAllowedBranches && gymId) {
        const branch = await Branch.findById(filter.branchId).lean();
        if (!branch || String(branch.gymId) !== String(gymId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to view staff for this branch.'
          });
        }
      }
    }

    const staffList = await User.find(filter)
      .select('firstName lastName email role gymId branchId status isActive createdAt createdBy')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const assignableBranches = await getAssignableBranchesForStaff(req);

    res.json({
      success: true,
      data: {
        staffs: staffList.map(s => ({
          _id: s._id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          role: s.role,
          branchId: s.branchId?._id || s.branchId,
          branchName: s.branchId?.name,
          status: s.status,
          isActive: s.isActive,
          createdAt: s.createdAt,
          createdBy: s.createdBy ? `${s.createdBy.firstName || ''} ${s.createdBy.lastName || ''}`.trim() : null
        })),
        assignableBranches: assignableBranches.map(b => ({ _id: b._id, name: b.name }))
      }
    });
  } catch (error) {
    console.error('Get staff list error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/users/:userId/status
 * Activate or deactivate a user (manager or staff). Owner only.
 * Does not delete the record; only isActive is updated so login is blocked when false.
 */
exports.updateStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const currentUser = req.currentUser || req.user;

    if (!['gym_owner', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the owner or manager can activate or deactivate users.'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'isActive must be a boolean'
      });
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The specified user does not exist.'
      });
    }

    const currentUserId = (currentUser.id || currentUser._id || '').toString();
    if (targetUser._id.toString() === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'You cannot deactivate your own account.'
      });
    }

    if (currentUser.role === 'manager') {
      if (targetUser.role !== 'staff') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Managers can only deactivate staff in their branch, not other managers.'
        });
      }
      const managerBranchId = (currentUser.branchId?._id || currentUser.branchId || '').toString();
      const targetBranchId = (targetUser.branchId?._id || targetUser.branchId || '').toString();
      if (managerBranchId !== targetBranchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only change status for staff in your branch.'
        });
      }
    } else {
      const ownerGymId = (currentUser.gymId?._id || currentUser.gymId || '').toString();
      const targetGymId = (targetUser.gymId?._id || targetUser.gymId || '').toString();
      if (ownerGymId !== targetGymId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only change status for users in your gym.'
        });
      }
      if (!['manager', 'staff'].includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only activate or deactivate managers and staff.'
        });
      }
    }

    await User.findByIdAndUpdate(userId, { $set: { isActive } });

    res.json({
      success: true,
      message: isActive ? 'User activated successfully' : 'User deactivated successfully',
      data: { userId, isActive }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};
