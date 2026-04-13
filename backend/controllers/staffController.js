const User = require('../models/user');
const Branch = require('../models/branch');

/**
 * Staff Management Controller
 * Owner: staff where gymId = owner.gymId; can create for any branch in owner.branches
 * Manager: staff where branchId = manager.branchId; can create only for their branch
 * Staff: no access
 */

function getStaffFilter(req) {
  const user = req.currentUser || req.user;
  if (!user) return null;
  if (user.role === 'gym_owner') {
    return { gymId: user.gymId?._id || user.gymId, role: { $in: ['manager', 'staff'] } };
  }
  if (user.role === 'manager') {
    return { branchId: user.branchId, role: 'staff' };
  }
  return null; // staff role or other -> no access
}

function canAssignBranch(req, branchId) {
  const user = req.currentUser || req.user;
  if (!user) return false;
  if (user.role === 'gym_owner') {
    if (user.branches && user.branches.length > 0) {
      return user.branches.some(b => b && b.toString() === branchId.toString());
    }
    return true; // legacy: any branch in gym
  }
  if (user.role === 'manager') {
    return user.branchId && user.branchId.toString() === branchId.toString();
  }
  return false;
}

function toId(value) {
  return value == null ? null : String(value);
}

function getAssignableBranches(req) {
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

/**
 * GET /api/staffs
 * List staff with data isolation. Response includes assignableBranches for create form.
 */
exports.getStaffs = async (req, res) => {
  try {
    const filter = getStaffFilter(req);
    if (filter === null) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view staff'
      });
    }

    const user = req.currentUser || req.user;
    const staffList = await User.find(filter)
      .select('firstName lastName email role gymId branchId status isActive createdAt createdBy')
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const assignableBranches = await getAssignableBranches(req);

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
    console.error('Get staffs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * POST /api/staffs
 * Create staff. Owner: any branch in owner.branches; Manager: only their branch.
 */
exports.createStaff = async (req, res) => {
  try {
    const user = req.currentUser || req.user;
    if (user.role === 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Staff cannot create other staff'
      });
    }
    if (user.role !== 'gym_owner' && user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to create staff'
      });
    }

    const { firstName, lastName, email, password, branchId } = req.body;
    if (!firstName || !lastName || !email || !password || !branchId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'firstName, lastName, email, password, and branchId are required'
      });
    }

    if (!canAssignBranch(req, branchId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You cannot assign staff to this branch'
      });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    const gymId = branch.gymId;
    if (toId(gymId) !== toId(user.gymId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You cannot assign staff to a branch outside your gym',
      });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }

    const staff = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'staff',
      gymId,
      branchId,
      status: 'active',
      isActive: true,
      createdBy: user.id || user._id
    });

    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: {
        _id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        branchId: staff.branchId,
        branchName: branch.name,
        status: staff.status,
        isActive: staff.isActive,
        createdAt: staff.createdAt
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/staffs/:id
 * Update staff (e.g. name, status, branch). Branch change must pass canAssignBranch.
 */
exports.updateStaff = async (req, res) => {
  try {
    const filter = getStaffFilter(req);
    if (filter === null) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to update staff'
      });
    }

    const { id } = req.params;
    const staff = await User.findOne({ _id: id, ...filter });
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'The specified staff member does not exist or you do not have access'
      });
    }

    const { firstName, lastName, status, isActive, branchId } = req.body;
    const updates = {};

    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (status !== undefined) updates.status = status;
    if (isActive !== undefined) updates.isActive = isActive;

    if (branchId !== undefined) {
      if (!canAssignBranch(req, branchId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You cannot assign this staff to the selected branch'
        });
        }
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({
            success: false,
            error: 'Branch not found',
            message: 'The specified branch does not exist'
          });
        }
        if (toId(branch.gymId) !== toId((req.currentUser || req.user)?.gymId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You cannot assign this staff to a branch outside your gym',
          });
        }
        updates.branchId = branchId;
        updates.gymId = branch.gymId;
      }

    updates.lastModifiedBy = (req.currentUser || req.user)?.id || (req.currentUser || req.user)?._id;

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select('firstName lastName email role gymId branchId status isActive createdAt updatedAt')
      .populate('branchId', 'name')
      .lean();

    res.json({
      success: true,
      message: 'Staff updated successfully',
      data: {
        _id: updated._id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        role: updated.role,
        branchId: updated.branchId?._id || updated.branchId,
        branchName: updated.branchId?.name,
        status: updated.status,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * DELETE /api/staffs/:id
 * Delete (or soft-deactivate) staff.
 */
exports.deleteStaff = async (req, res) => {
  try {
    const filter = getStaffFilter(req);
    if (filter === null) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to delete staff'
      });
    }

    const { id } = req.params;
    const staff = await User.findOne({ _id: id, ...filter });
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'The specified staff member does not exist or you do not have access'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Staff deleted successfully'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
};
