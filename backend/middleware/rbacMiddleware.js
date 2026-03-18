const User = require('../models/user');
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const bcrypt = require('bcrypt');

/**
 * RBAC Middleware for Role-Based Access Control
 * Handles authorization based on user roles and organization structure
 */

// Check if user has required role
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please login to access this resource'
        });
      }

      // First try to find user in the new RBAC system
      let user = await User.findById(req.user.id);
      let isLegacyUser = false;
      
      // If not found in User model, check legacy Member model
      if (!user) {
        const Member = require('../models/member');
        const member = await Member.findById(req.user.id);
        
        if (member) {
          // Only allow manager role from legacy system
          const allowedLegacyRoles = ['manager'];
          if (!allowedLegacyRoles.includes(member.role)) {
            return res.status(403).json({ 
              error: 'Access denied',
              message: 'Legacy users with this role cannot access this resource' 
            });
          }

          // Convert member to user-like object for consistent response
          user = {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            role: member.role,
            branchId: member.branchId,
            gymId: member.gymId,
            password: member.password,
            isActive: true,
            status: 'active',
            comparePassword: async function(candidatePassword) {
              return bcrypt.compare(candidatePassword, this.password);
            },
            resetLoginAttempts: async function() {
              return Promise.resolve();
            },
            incrementLoginAttempts: async function() {
              return Promise.resolve();
            },
            isFrozen: async function() {
              return false; // Legacy members don't have frozen status
            }
          };
          isLegacyUser = true;
        }
      }

      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      // Check if user is frozen (RBAC users only)
      if (!isLegacyUser) {
        const isFrozen = await user.isFrozen();
        if (isFrozen) {
          return res.status(403).json({ 
            error: 'Account frozen',
            message: 'Your account is frozen. Please contact your gym owner or manager.'
          });
        }
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
      }

      // Attach user object to request for further use
      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

// Check if user can access specific gym
const requireGymAccess = (gymIdParam = 'gymId') => {
  return async (req, res, next) => {
    try {
      const gymId = req.params[gymIdParam] || req.body.gymId || req.query.gymId;
      
      if (!gymId) {
        return res.status(400).json({ 
          error: 'Gym ID required',
          message: 'Gym ID must be provided'
        });
      }

      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      // Check if user can access this gym
      if (!user.canAccessGym(gymId)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to access this gym'
        });
      }

      // Check if gym is frozen
      const gym = await Gym.findById(gymId);
      if (gym && gym.isFrozen) {
        return res.status(403).json({ 
          error: 'Gym frozen',
          message: 'This gym is currently frozen. Please contact your gym owner or manager.'
        });
      }

      req.currentGym = gym;
      next();
    } catch (error) {
      console.error('Gym access check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while checking gym access'
      });
    }
  };
};

// Check if user can access specific branch
const requireBranchAccess = (branchIdParam = 'branchId') => {
  return async (req, res, next) => {
    try {
      const branchId = req.params[branchIdParam] || req.body.branchId || req.query.branchId;
      
      if (!branchId) {
        return res.status(400).json({ 
          error: 'Branch ID required',
          message: 'Branch ID must be provided'
        });
      }

      // First try to find user in the new RBAC system
      let user = req.currentUser || await User.findById(req.user.id);
      let isLegacyUser = false;
      
      // If not found in User model, check legacy Member model
      if (!user) {
        const Member = require('../models/member');
        const member = await Member.findById(req.user.id);
        
        if (member) {
          // Only allow manager role from legacy system
          const allowedLegacyRoles = ['manager'];
          if (!allowedLegacyRoles.includes(member.role)) {
            return res.status(403).json({ 
              error: 'Access denied',
              message: 'Legacy users with this role cannot access this resource' 
            });
          }

          // Convert member to user-like object for consistent response
          user = {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            role: member.role,
            branchId: member.branchId,
            gymId: member.gymId,
            password: member.password,
            isActive: true,
            status: 'active',
            isLegacyUser: true,
            comparePassword: async function(candidatePassword) {
              return bcrypt.compare(candidatePassword, this.password);
            },
            resetLoginAttempts: async function() {
              return Promise.resolve();
            },
            incrementLoginAttempts: async function() {
              return Promise.resolve();
            },
            isFrozen: async function() {
              return false; // Legacy members don't have frozen status
            }
          };
          isLegacyUser = true;
        }
      }

      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      // Gym owner: allow if branch is in user.branches, or if branch belongs to their gym (user.branches may be empty/out of sync)
      if (user.role === 'gym_owner') {
        const gymId = user.gymId?._id || user.gymId;
        let allowed = user.branches && user.branches.length > 0
          ? user.branches.some(b => b && b.toString() === branchId.toString())
          : false;
        if (!allowed) {
          const branch = await Branch.findOne({ _id: branchId, gymId });
          allowed = !!branch;
        }
        if (!allowed) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to access this branch'
          });
        }
        req.currentUser = user;
        const branch = await Branch.findById(branchId);
        if (!isLegacyUser && branch) {
          const isFrozen = await branch.isFrozen();
          if (isFrozen) {
            return res.status(403).json({
              error: 'Branch frozen',
              message: 'This branch is currently frozen. Please contact your gym owner or manager.'
            });
          }
        }
        req.currentBranch = branch;
        return next();
      }

      // For legacy users (managers), check if they can access the branch
      if (isLegacyUser) {
        // Manager can only access their own branch
        if (user.role === 'manager' && user.branchId.toString() !== branchId.toString()) {
          return res.status(403).json({ 
            error: 'Access denied',
            message: 'You do not have permission to access this branch'
          });
        }
        // Gym owner from legacy system can access branches in their gym
        if (user.role === 'gym_owner') {
          const branch = await Branch.findById(branchId);
          if (branch && branch.gymId.toString() !== user.gymId.toString()) {
            return res.status(403).json({ 
              error: 'Access denied',
              message: 'You do not have permission to access this branch'
            });
          }
        }
      } else {
        // For RBAC users, use the canAccessBranch method
        if (!user.canAccessBranch(branchId)) {
          return res.status(403).json({ 
            error: 'Access denied',
            message: 'You do not have permission to access this branch'
          });
        }
      }

      // Get branch for further use
      const branch = await Branch.findById(branchId);

      // Check if branch is frozen (through gym) - only for RBAC users
      if (!isLegacyUser && branch) {
        const isFrozen = await branch.isFrozen();
        if (isFrozen) {
          return res.status(403).json({ 
            error: 'Branch frozen',
            message: 'This branch is currently frozen. Please contact your gym owner or manager.'
          });
        }
      }

      req.currentUser = user;
      req.currentBranch = branch;
      next();
    } catch (error) {
      console.error('Branch access check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while checking branch access'
      });
    }
  };
};

// Check if user has specific permission
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      // Check specific permission
      if (!user.hasPermission(resource, action)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `You do not have permission to ${action} ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

// Data isolation middleware - ensures users only see data from their organization
const enforceDataIsolation = (modelName, gymIdField = 'gymId', branchIdField = 'branchId') => {
  return async (req, res, next) => {
    try {
      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      // Add data isolation filters to query
      const originalQuery = req.query || {};
      
      if (user.role === 'gym_owner') {
        // Gym owner can only see data from their gym
        req.query = {
          ...originalQuery,
          [gymIdField]: user.gymId
        };
      } else if (['manager', 'staff'].includes(user.role)) {
        // Manager can only see data from their branch
        req.query = {
          ...originalQuery,
          [gymIdField]: user.gymId,
          [branchIdField]: user.branchId
        };
      }

      next();
    } catch (error) {
      console.error('Data isolation error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while enforcing data isolation'
      });
    }
  };
};

// Middleware to check if gym is not frozen
const requireActiveGym = async (req, res, next) => {
  try {
    // Use the user from req.currentUser if available (set by requireRole middleware)
    let user = req.currentUser;
    
    if (!user) {
      // First try to find user in the new RBAC system
      user = await User.findById(req.user.id);
      let isLegacyUser = false;
      
      // If not found in User model, check legacy Member model
      if (!user) {
        const Member = require('../models/member');
        const member = await Member.findById(req.user.id);
        
        if (member) {
          // Only allow manager role from legacy system
          const allowedLegacyRoles = ['manager'];
          if (!allowedLegacyRoles.includes(member.role)) {
            return res.status(403).json({ 
              error: 'Access denied',
              message: 'Legacy users with this role cannot access this resource' 
            });
          }

          // Convert member to user-like object for consistent response
          user = {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            role: member.role,
            branchId: member.branchId,
            gymId: member.gymId,
            password: member.password,
            isActive: true,
            status: 'active',
            isLegacyUser: true,
            comparePassword: async function(candidatePassword) {
              return bcrypt.compare(candidatePassword, this.password);
            },
            resetLoginAttempts: async function() {
              return Promise.resolve();
            },
            incrementLoginAttempts: async function() {
              return Promise.resolve();
            },
            isFrozen: async function() {
              return false; // Legacy members don't have frozen status
            }
          };
          isLegacyUser = true;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User account does not exist'
        });
    }

    // For legacy users, skip gym freezing check
    if (user.isLegacyUser) {
      return next();
    }

    // Check if user's gym is frozen (RBAC users only)
    const isFrozen = await user.isFrozen();
    if (isFrozen) {
      return res.status(403).json({ 
        error: 'Gym frozen',
        message: 'Your gym is currently frozen. Please contact your gym owner or manager.'
      });
    }

    next();
  } catch (error) {
    console.error('Active gym check error:', error);
    res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred while checking gym status'
    });
  }
};

// Combined middleware for common use cases
const gymOwnerOrAdmin = requireRole('gym_owner');
const managerOrAbove = requireRole('manager', 'staff', 'gym_owner');
const staffManagerOrAbove = requireRole('gym_owner', 'manager');
const allRoles = requireRole('gym_owner', 'manager', 'staff');

module.exports = {
  requireRole,
  requireGymAccess,
  requireBranchAccess,
  requirePermission,
  enforceDataIsolation,
  requireActiveGym,
  gymOwnerOrAdmin,
  managerOrAbove,
  staffManagerOrAbove,
  allRoles
};
