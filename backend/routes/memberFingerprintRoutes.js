const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { managerOrAbove, requireActiveGym } = require('../middleware/rbacMiddleware');
const memberFingerprintController = require('../controllers/memberFingerprintController');

// POST /api/members/register-fingerprint
// - First call: { memberId } -> returns registration options
// - Second call: { memberId, registrationResponse } -> verifies & stores credential
router.post('/register-fingerprint', authMiddleware, managerOrAbove, requireActiveGym, memberFingerprintController.registerFingerprint);

// POST /api/members/verify-fingerprint
// - First call: {} -> returns authentication options
// - Second call: { authenticationResponse } -> verifies credential, validates subscription window, marks attendance
router.post('/verify-fingerprint', authMiddleware, managerOrAbove, requireActiveGym, memberFingerprintController.verifyFingerprint);

module.exports = router;

