const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const blacklist = require('../middleware/tokenBlacklist');
const { adminOnly, gymOwnerOrAdmin, managerOrAbove } = require('../middleware/rbacMiddleware');
const { ok, fail } = require('../utils/apiResponse');

// Authentication
router.post('/login', authController.login);
router.post('/create-first-admin', authController.createFirstAdmin);

// Forgot Password Routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

// Debug endpoints (remove in production)
router.get('/debug', authController.debugLogin);
router.get('/debug-email/:email', authController.debugEmail);
router.post('/test-login', authController.testLogin);

// Legacy bootstrap endpoint (debug-only use)
router.post('/debug/create-admin-legacy', authController.createAdminUser);

// ========== PROTECTED ROUTES (Authentication required) ==========
router.use(authMiddleware);

// User profile routes
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
// Logout with token blacklisting
router.post('/logout', (req, res) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    blacklist.add(token);
    return ok(res, { revoked: true }, 'Logout successful, token revoked');
  }
  return fail(res, 400, 'No token provided', null, 'MISSING_TOKEN');
});

// ========== RBAC USER MANAGEMENT ROUTES ==========

// Admin only routes
router.post('/create-admin', adminOnly, authController.createAdmin);
router.post('/create-gym-owner', adminOnly, authController.createGymOwner);

// Gym owner and admin routes
router.post('/create-manager', gymOwnerOrAdmin, authController.createManager);

module.exports = router;
