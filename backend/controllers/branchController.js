const Branch = require('../models/branch');
const Gym = require('../models/gym');
const User = require('../models/user');
const Member = require('../models/member');

/**
 * Branch Management Controller
 * Handles CRUD operations for branches with RBAC support
 */

// Create a new branch
exports.createBranch = async (req, res) => {
  try {
    const {
      name,
      address,
      contactInfo,
      settings,
      facilities
    } = req.body;

    const { gymId } = req.params;

    if (!name) {
      return res.status(400).json({
        error: 'Branch name is required'
      });
    }

    // Verify gym exists and user has access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Check if gym is frozen
    if (gym.isFrozen) {
      return res.status(400).json({
        error: 'Gym frozen',
        message: 'Cannot create branches for a frozen gym'
      });
    }

    // Check if branch name already exists in this gym
    const existingBranch = await Branch.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      gymId 
    });
    if (existingBranch) {
      return res.status(400).json({
        error: 'Branch name already exists',
        message: 'A branch with this name already exists in this gym'
      });
    }

    // Create new branch
    const branch = new Branch({
      name,
      gymId,
      address: address || {},
      contactInfo: contactInfo || {},
      settings: settings || {},
      facilities: facilities || [],
      createdBy: req.user.id
    });

    await branch.save();

    // Attach branch to owner's branches array for branch ownership isolation
    const ownerId = req.user?.id || req.user?._id;
    const ownerRole = req.user?.role;
    if (ownerId && ownerRole === 'gym_owner') {
      await User.findByIdAndUpdate(ownerId, {
        $push: { branches: branch._id }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: {
        id: branch._id,
        name: branch.name,
        gymId: branch.gymId,
        gymName: gym.name,
        address: branch.address,
        status: branch.status,
        createdAt: branch.createdAt
      }
    });

  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      error: 'Server error while creating branch',
      message: error.message
    });
  }
};

// Get all branches for a gym
exports.getBranchesByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Verify gym exists and user has access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    let query = { gymId };

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const branches = await Branch.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Branch.countDocuments(query);

    // Get branch managers (multiple) and member counts for each branch
    const branchesWithDetails = await Promise.all(
      branches.map(async (branch) => {
        const branchManagers = await User.find({
          branchId: branch._id,
          role: 'manager',
          isActive: true
        }).select('firstName lastName email').lean();

        const memberCount = await Member.countDocuments({
          branchId: branch._id,
          isActive: true
        });

        return {
          ...branch.toObject(),
          branchManagers: branchManagers.map((m) => ({
            id: m._id,
            name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Manager',
            email: m.email
          })),
          memberCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        gym: {
          id: gym._id,
          name: gym.name
        },
        branches: branchesWithDetails,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get branches by gym error:', error);
    res.status(500).json({
      error: 'Server error while fetching branches',
      message: error.message
    });
  }
};

// Get branch by ID
exports.getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const user = req.currentUser;

    const branch = await Branch.findById(branchId)
      .populate('gymId', 'name status isFrozen')
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check access permissions
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this branch'
      });
    }

    const [userCount, memberCount, branchManagersList] = await Promise.all([
      User.countDocuments({ branchId, isActive: true }),
      Member.countDocuments({ branchId, isActive: true }),
      User.find({ branchId, role: 'manager', isActive: true }).select('firstName lastName email').lean()
    ]);

    const branchManagers = branchManagersList.map((m) => ({
      id: m._id,
      name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Manager',
      email: m.email
    }));

    res.json({
      success: true,
      data: {
        ...branch.toObject(),
        branchManagers,
        statistics: {
          userCount,
          memberCount
        }
      }
    });

  } catch (error) {
    console.error('Get branch by ID error:', error);
    res.status(500).json({
      error: 'Server error while fetching branch',
      message: error.message
    });
  }
};

// Update branch
exports.updateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const {
      name,
      address,
      contactInfo,
      settings,
      facilities
    } = req.body;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check permissions
    const user = req.currentUser;
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to update this branch'
      });
    }

    // Check if gym is frozen
    const isFrozen = await branch.isFrozen();
    if (isFrozen) {
      return res.status(400).json({
        error: 'Gym frozen',
        message: 'Cannot update branch in a frozen gym'
      });
    }

    // Update fields
    if (name) branch.name = name;
    if (address) branch.address = { ...branch.address, ...address };
    if (contactInfo) branch.contactInfo = { ...branch.contactInfo, ...contactInfo };
    if (settings) branch.settings = { ...branch.settings, ...settings };
    if (facilities) branch.facilities = facilities;
    
    branch.lastModifiedBy = req.user.id;
    await branch.save();

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: {
        id: branch._id,
        name: branch.name,
        address: branch.address,
        contactInfo: branch.contactInfo,
        settings: branch.settings,
        facilities: branch.facilities,
        updatedAt: branch.updatedAt
      }
    });

  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      error: 'Server error while updating branch',
      message: error.message
    });
  }
};

// Deactivate branch
exports.deactivateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check permissions
    const user = req.currentUser;
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to deactivate this branch'
      });
    }

    // Check if gym is frozen
    const isFrozen = await branch.isFrozen();
    if (isFrozen) {
      return res.status(400).json({
        error: 'Gym frozen',
        message: 'Cannot deactivate branch in a frozen gym'
      });
    }

    // Check if branch has active users or members
    const userCount = await User.countDocuments({ branchId, isActive: true });
    const memberCount = await Member.countDocuments({ branchId, isActive: true });

    if (userCount > 0 || memberCount > 0) {
      return res.status(400).json({
        error: 'Cannot deactivate branch',
        message: 'Branch has active users or members. Please transfer them first.',
        data: {
          userCount,
          memberCount
        }
      });
    }

    // Deactivate branch
    branch.isActive = false;
    branch.status = 'inactive';
    branch.lastModifiedBy = req.user.id;
    await branch.save();

    res.json({
      success: true,
      message: 'Branch deactivated successfully',
      data: {
        id: branch._id,
        name: branch.name,
        isActive: branch.isActive,
        status: branch.status
      }
    });

  } catch (error) {
    console.error('Deactivate branch error:', error);
    res.status(500).json({
      error: 'Server error while deactivating branch',
      message: error.message
    });
  }
};

// Reactivate branch
exports.reactivateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check permissions
    const user = req.currentUser;
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to reactivate this branch'
      });
    }

    // Check if gym is frozen
    const isFrozen = await branch.isFrozen();
    if (isFrozen) {
      return res.status(400).json({
        error: 'Gym frozen',
        message: 'Cannot reactivate branch in a frozen gym'
      });
    }

    // Reactivate branch
    branch.isActive = true;
    branch.status = 'active';
    branch.lastModifiedBy = req.user.id;
    await branch.save();

    res.json({
      success: true,
      message: 'Branch reactivated successfully',
      data: {
        id: branch._id,
        name: branch.name,
        isActive: branch.isActive,
        status: branch.status
      }
    });

  } catch (error) {
    console.error('Reactivate branch error:', error);
    res.status(500).json({
      error: 'Server error while reactivating branch',
      message: error.message
    });
  }
};

// Delete branch
exports.deleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check permissions
    const user = req.currentUser;
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to delete this branch'
      });
    }

    // Check if branch has any users or members
    const userCount = await User.countDocuments({ branchId });
    const memberCount = await Member.countDocuments({ branchId });

    if (userCount > 0 || memberCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete branch',
        message: 'Branch has users or members. Please remove them first.',
        data: {
          userCount,
          memberCount
        }
      });
    }

    await Branch.findByIdAndDelete(branchId);

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });

  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      error: 'Server error while deleting branch',
      message: error.message
    });
  }
};

// Get branch statistics
exports.getBranchStatistics = async (req, res) => {
  try {
    const { branchId } = req.params;
    const user = req.currentUser;

    const branch = await Branch.findById(branchId)
      .populate('gymId', 'name status isFrozen');

    if (!branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    // Check access permissions
    if (user.gymId && user.gymId.toString() !== branch.gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this branch statistics'
      });
    }

    // Get statistics
    const [
      totalUsers,
      activeUsers,
      totalMembers,
      activeMembers,
      managers
    ] = await Promise.all([
      User.countDocuments({ branchId }),
      User.countDocuments({ branchId, isActive: true }),
      Member.countDocuments({ branchId }),
      Member.countDocuments({ branchId, isActive: true }),
      User.countDocuments({ branchId, role: 'manager', isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        branch: {
          id: branch._id,
          name: branch.name,
          gymId: branch.gymId._id,
          gymName: branch.gymId.name,
          status: branch.status,
          isActive: branch.isActive
        },
        statistics: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            managers
          },
          members: {
            total: totalMembers,
            active: activeMembers,
            inactive: totalMembers - activeMembers
          }
        }
      }
    });

  } catch (error) {
    console.error('Get branch statistics error:', error);
    res.status(500).json({
      error: 'Server error while fetching branch statistics',
      message: error.message
    });
  }
};
