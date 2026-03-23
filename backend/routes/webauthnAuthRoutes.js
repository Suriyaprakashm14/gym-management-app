const express = require('express');
const router = express.Router();

const authController = require('../controllers/webauthnAuthController');
const authMiddleware = require('../middleware/authMiddleware');

// User WebAuthn (Windows Hello / FIDO2) endpoints
// Mounted at: /api/auth/webauthn/*

router.post('/register-options', authMiddleware, authController.registerOptions);
router.post('/register-verify', authMiddleware, authController.registerVerify);

router.post('/login-options', authController.loginOptions);
router.post('/login-verify', authController.loginVerify);

module.exports = router;

