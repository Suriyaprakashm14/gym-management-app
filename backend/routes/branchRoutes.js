const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  adminOnly, 
  gymOwnerOrAdmin, 
  managerOrAbove,
  requireGymAccess,
  requireBranchAccess,
  requireActiveGym 
} = require('../middleware/rbacMiddleware');
const branchController = require('../controllers/branchController');

// All routes require authentication
router.use(authMiddleware);

// Admin and gym owner routes
router.post('/:gymId/branches', gymOwnerOrAdmin, requireGymAccess('gymId'), requireActiveGym, branchController.createBranch);
router.get('/:gymId/branches', gymOwnerOrAdmin, requireGymAccess('gymId'), branchController.getBranchesByGym);

// All authenticated users can view branch details (with access control)
router.get('/branches/:branchId', managerOrAbove, requireBranchAccess('branchId'), branchController.getBranchById);
router.get('/branches/:branchId/statistics', managerOrAbove, requireBranchAccess('branchId'), branchController.getBranchStatistics);

// Gym owner and admin routes for branch management
router.put('/branches/:branchId', gymOwnerOrAdmin, requireBranchAccess('branchId'), requireActiveGym, branchController.updateBranch);
router.put('/branches/:branchId/deactivate', gymOwnerOrAdmin, requireBranchAccess('branchId'), requireActiveGym, branchController.deactivateBranch);
router.put('/branches/:branchId/reactivate', gymOwnerOrAdmin, requireBranchAccess('branchId'), requireActiveGym, branchController.reactivateBranch);

// Gym owner and admin can delete branches
router.delete('/branches/:branchId', gymOwnerOrAdmin, requireBranchAccess('branchId'), branchController.deleteBranch);

module.exports = router;