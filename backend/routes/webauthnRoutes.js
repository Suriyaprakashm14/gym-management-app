const express = require('express');
const router = express.Router();

const webauthnController = require('../controllers/webauthnController');
const authMiddleware = require('../middleware/authMiddleware');
const { managerOrAbove, requireActiveGym } = require('../middleware/rbacMiddleware');

// Fingerprint-based WebAuthn (Windows Hello) endpoints
router.post('/register/start', authMiddleware, managerOrAbove, requireActiveGym, webauthnController.registerStart);
router.post('/register/verify', authMiddleware, managerOrAbove, requireActiveGym, webauthnController.registerVerify);
router.post('/login/start', webauthnController.loginStart);
router.post('/login/verify', webauthnController.loginVerify);

module.exports = router;

