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
const paymentController = require('../controllers/paymentController');

// All routes require authentication
router.use(authMiddleware);

// Specific routes (must come before parameterized routes)
router.get('/pending', managerOrAbove, paymentController.getMembersWithPendingPayments);
router.get('/branch/overdue', managerOrAbove, paymentController.getBranchOverduePayments);
router.get('/debug/branch-manager', managerOrAbove, paymentController.debugBranchManagerData);

// Analytics routes
router.get('/analytics/gym-owner', managerOrAbove, paymentController.getGymOwnerAnalytics);
router.get('/analytics/branch-manager', managerOrAbove, paymentController.getBranchManagerAnalytics);

// Overdue Analytics routes
router.get('/analytics/overdue/gym-owner', gymOwnerOrAdmin, paymentController.getGymOwnerOverdueAnalytics);
router.get('/analytics/overdue/branch-manager', managerOrAbove, paymentController.getBranchManagerOverdueAnalytics);

// Admin and gym owner routes
router.get('/gym/:gymId', gymOwnerOrAdmin, requireGymAccess('gymId'), paymentController.getAll);
router.get('/gym/:gymId/stats', gymOwnerOrAdmin, requireGymAccess('gymId'), paymentController.getAll);

// All authenticated users can process payments and view member history
router.put('/:paymentId/process', managerOrAbove, paymentController.update);
router.get('/members/:memberId', managerOrAbove, paymentController.getMemberPaymentSummary);

// Payment creation routes (parameterized routes come last)
router.post('/:branchId', managerOrAbove, requireBranchAccess('branchId'), requireActiveGym, paymentController.create);
router.get('/:branchId', managerOrAbove, requireBranchAccess('branchId'), paymentController.getAll);

module.exports = router;