const express = require('express');
const router = express.Router();

const webauthnController = require('../controllers/webauthnController');

// Fingerprint-based WebAuthn (Windows Hello) endpoints
router.post('/register/start', webauthnController.registerStart);
router.post('/register/verify', webauthnController.registerVerify);
router.post('/login/start', webauthnController.loginStart);
router.post('/login/verify', webauthnController.loginVerify);

module.exports = router;

