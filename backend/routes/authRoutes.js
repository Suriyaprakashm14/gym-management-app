const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const blacklist = require('../middleware/tokenBlacklist');
const { gymOwnerOrAdmin, managerOrAbove } = require('../middleware/rbacMiddleware');
const { ok, fail } = require('../utils/apiResponse');
const webauthnAuthRoutes = require('./webauthnAuthRoutes');
const { isProduction } = require('../config/env');

// Authentication
router.post('/login', authController.login);

const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'SIGNUP_RATE_LIMITED',
    message: 'Too many signup attempts from this IP. Please try again later.',
  },
});

router.post('/signup', signupRateLimit, authController.signup);

// Forgot Password Routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

// Debug endpoints (non-production only)
if (!isProduction()) {
  router.get('/debug', authController.debugLogin);
  router.get('/debug-email/:email', authController.debugEmail);
  router.post('/test-login', authController.testLogin);
}

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
router.post('/logout', async (req, res) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      await blacklist.add(token);
      return ok(res, { revoked: true }, 'Logout successful, token revoked');
    } catch (err) {
      return fail(res, 503, 'Could not revoke token', null, 'BLACKLIST_UNAVAILABLE');
    }
  }
  return fail(res, 400, 'No token provided', null, 'MISSING_TOKEN');
});

// ========== RBAC USER MANAGEMENT ROUTES ==========

router.post('/create-manager', gymOwnerOrAdmin, authController.createManager);
router.put('/reset-user-password/:userId', gymOwnerOrAdmin, authController.resetUserPassword);
router.post('/reset-user-password/:userId', gymOwnerOrAdmin, authController.resetUserPassword);

const verifyResetToken = require('../middleware/verifyResetToken');

router.post(
  '/reset-password',
  verifyResetToken,
  authController.resetPassword
);


module.exports = router;
