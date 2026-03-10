const Gym = require('../models/gym');
const Branch = require('../models/branch');
const User = require('../models/user');
const Member = require('../models/member');

/**
 * Gym Management Controller
 * Handles CRUD operations for gyms with RBAC support
 */

// Create a new gym (Admin only)
exports.createGym = async (req, res) => {
  try {
    const {
      name,
      description,
      contactInfo,
      settings
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Gym name is required'
      });
    }

    // Check if gym name already exists
    const existingGym = await Gym.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingGym) {
      return res.status(400).json({
        error: 'Gym name already exists',
        message: 'A gym with this name already exists'
      });
    }

    // Create new gym
    const gym = new Gym({
      name,
      description,
      contactInfo: contactInfo || {},
      settings: settings || {},
      createdBy: req.user.id
    });

    await gym.save();

    res.status(201).json({
      success: true,
      message: 'Gym created successfully',
      data: {
        id: gym._id,
        name: gym.name,
        description: gym.description,
        status: gym.status,
        isFrozen: gym.isFrozen,
        createdAt: gym.createdAt
      }
    });

  } catch (error) {
    console.error('Create gym error:', error);
    res.status(500).json({
      error: 'Server error while creating gym',
      message: error.message
    });
  }
};

// Get all gyms (Admin sees all, Gym Owner sees only their gym)
exports.getAllGyms = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    let user = req.currentUser;

    // Filter by user's gym (owner / gym_owner only)
    if (user.gymId) {
      if (user.role === 'gym_owner') {
        query._id = user.gymId;
      } else {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view gym list'
        });
      }
    }

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const gyms = await Gym.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Gym.countDocuments(query);

    res.json({
      success: true,
      data: {
        gyms,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all gyms error:', error);
    res.status(500).json({
      error: 'Server error while fetching gyms',
      message: error.message
    });
  }
};

// Get gym by ID
exports.getGymById = async (req, res) => {
  try {
    const { gymId } = req.params;
    const user = req.currentUser;

    const gym = await Gym.findById(gymId)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Check access permissions
    if (user.gymId && user.gymId.toString() !== gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this gym'
      });
    }

    // Get additional statistics
    const branchCount = await Branch.countDocuments({ gymId, isActive: true });
    const userCount = await User.countDocuments({ gymId, isActive: true });
    const memberCount = await Member.countDocuments({ gymId, isActive: true });

    res.json({
      success: true,
      data: {
        ...gym.toObject(),
        statistics: {
          branchCount,
          userCount,
          memberCount
        }
      }
    });

  } catch (error) {
    console.error('Get gym by ID error:', error);
    res.status(500).json({
      error: 'Server error while fetching gym',
      message: error.message
    });
  }
};

// Update gym
exports.updateGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const {
      name,
      description,
      contactInfo,
      settings,
      logoUrl
    } = req.body;

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Check permissions (only gym owner can update gym name/logo)
    const user = req.currentUser || req.user;
    if (user.gymId && user.gymId.toString() !== gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to update this gym'
      });
    }

    // Update fields
    if (name) gym.name = name;
    if (description !== undefined) gym.description = description;
    if (contactInfo) gym.contactInfo = { ...gym.contactInfo, ...contactInfo };
    if (settings) gym.settings = { ...gym.settings, ...settings };
    if (logoUrl !== undefined) gym.logoUrl = logoUrl || null;

    gym.lastModifiedBy = req.user.id;
    await gym.save();

    res.json({
      success: true,
      message: 'Gym updated successfully',
      data: {
        id: gym._id,
        name: gym.name,
        description: gym.description,
        contactInfo: gym.contactInfo,
        settings: gym.settings,
        logoUrl: gym.logoUrl,
        updatedAt: gym.updatedAt
      }
    });

  } catch (error) {
    console.error('Update gym error:', error);
    res.status(500).json({
      error: 'Server error while updating gym',
      message: error.message
    });
  }
};

// Freeze gym (Admin only)
exports.freezeGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { reason } = req.body;

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    if (gym.isFrozen) {
      return res.status(400).json({
        error: 'Gym already frozen',
        message: 'This gym is already frozen'
      });
    }

    // Freeze the gym
    await gym.freeze(req.user.id, reason);

    res.json({
      success: true,
      message: 'Gym frozen successfully',
      data: {
        id: gym._id,
        name: gym.name,
        isFrozen: gym.isFrozen,
        frozenAt: gym.frozenAt,
        frozenBy: gym.frozenBy,
        frozenReason: gym.frozenReason
      }
    });

  } catch (error) {
    console.error('Freeze gym error:', error);
    res.status(500).json({
      error: 'Server error while freezing gym',
      message: error.message
    });
  }
};

// Unfreeze gym (owner only)
exports.unfreezeGym = async (req, res) => {
  try {
    const { gymId } = req.params;

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    if (!gym.isFrozen) {
      return res.status(400).json({
        error: 'Gym not frozen',
        message: 'This gym is not frozen'
      });
    }

    // Unfreeze the gym
    await gym.unfreeze();

    res.json({
      success: true,
      message: 'Gym unfrozen successfully',
      data: {
        id: gym._id,
        name: gym.name,
        isFrozen: gym.isFrozen,
        status: gym.status
      }
    });

  } catch (error) {
    console.error('Unfreeze gym error:', error);
    res.status(500).json({
      error: 'Server error while unfreezing gym',
      message: error.message
    });
  }
};

// Delete gym (Admin only)
exports.deleteGym = async (req, res) => {
  try {
    const { gymId } = req.params;

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Check if gym has any active branches or users
    const branchCount = await Branch.countDocuments({ gymId, isActive: true });
    const userCount = await User.countDocuments({ gymId, isActive: true });
    const memberCount = await Member.countDocuments({ gymId, isActive: true });

    if (branchCount > 0 || userCount > 0 || memberCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete gym',
        message: 'Gym has active branches, users, or members. Please remove them first.',
        data: {
          branchCount,
          userCount,
          memberCount
        }
      });
    }

    await Gym.findByIdAndDelete(gymId);

    res.json({
      success: true,
      message: 'Gym deleted successfully'
    });

  } catch (error) {
    console.error('Delete gym error:', error);
    res.status(500).json({
      error: 'Server error while deleting gym',
      message: error.message
    });
  }
};

// Get gym statistics
exports.getGymStatistics = async (req, res) => {
  try {
    const { gymId } = req.params;
    const user = req.currentUser;

    // Check access permissions
    if (user.gymId && user.gymId.toString() !== gymId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this gym statistics'
      });
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Get statistics
    const [
      totalBranches,
      activeBranches,
      totalUsers,
      activeUsers,
      totalMembers,
      activeMembers,
      gymOwners,
      managers
    ] = await Promise.all([
      Branch.countDocuments({ gymId }),
      Branch.countDocuments({ gymId, isActive: true }),
      User.countDocuments({ gymId }),
      User.countDocuments({ gymId, isActive: true }),
      Member.countDocuments({ gymId }),
      Member.countDocuments({ gymId, isActive: true }),
      User.countDocuments({ gymId, role: 'gym_owner', isActive: true }),
      User.countDocuments({ gymId, role: 'manager', isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        gym: {
          id: gym._id,
          name: gym.name,
          status: gym.status,
          isFrozen: gym.isFrozen
        },
        statistics: {
          branches: {
            total: totalBranches,
            active: activeBranches,
            inactive: totalBranches - activeBranches
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            gymOwners,
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
    console.error('Get gym statistics error:', error);
    res.status(500).json({
      error: 'Server error while fetching gym statistics',
      message: error.message
    });
  }
};
