const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const memberFingerprintController = require('../controllers/memberFingerprintController');

// POST /api/members/register-fingerprint
// - First call: { memberId } -> returns registration options
// - Second call: { memberId, registrationResponse } -> verifies & stores credential
router.post('/register-fingerprint', authMiddleware, memberFingerprintController.registerFingerprint);

// POST /api/members/verify-fingerprint
// - First call: {} -> returns authentication options
// - Second call: { authenticationResponse } -> verifies credential, validates subscription window, marks attendance
router.post('/verify-fingerprint', authMiddleware, memberFingerprintController.verifyFingerprint);

module.exports = router;

