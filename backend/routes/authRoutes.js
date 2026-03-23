const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const blacklist = require('../middleware/tokenBlacklist');
const { gymOwnerOrAdmin, managerOrAbove } = require('../middleware/rbacMiddleware');
const { ok, fail } = require('../utils/apiResponse');
const webauthnAuthRoutes = require('./webauthnAuthRoutes');

// Authentication
router.post('/login', authController.login);
router.post('/signup', authController.signup);

// Forgot Password Routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

// Debug endpoints (remove in production)
router.get('/debug', authController.debugLogin);
router.get('/debug-email/:email', authController.debugEmail);
router.post('/test-login', authController.testLogin);

// ========= WebAuthn (Windows Hello) =========
// IMPORTANT: must be mounted before `router.use(authMiddleware)` so that
// `/login-options` can remain public while `/register-*` remains protected.
router.use('/webauthn', webauthnAuthRoutes);

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

router.post('/create-manager', gymOwnerOrAdmin, authController.createManager);
router.put('/reset-user-password/:userId', gymOwnerOrAdmin, authController.resetUserPassword);

const verifyResetToken = require('../middleware/verifyResetToken');

router.post(
  '/reset-password',
  verifyResetToken,
  authController.resetPassword
);


module.exports = router;
