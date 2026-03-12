const express = require('express');
const router = express.Router();

const fingerprintController = require('../controllers/fingerprintController');
const authMiddleware = require('../middleware/authMiddleware');
const branchManagerAccess = require('../middleware/branchManagerAccess');

// Test ZKFinger device connection
router.get('/test-connection', authMiddleware, fingerprintController.testConnection);

// Simulate fingerprint enrollment (no memberId). For add-member flow before member is created.
router.post('/simulate-enroll', authMiddleware, fingerprintController.simulateEnroll);

// Enroll member fingerprint
router.post('/enroll', authMiddleware, branchManagerAccess, fingerprintController.enrollFingerprint);

// Verify fingerprint for attendance
router.post('/verify', authMiddleware, fingerprintController.verifyFingerprint);

// Get member fingerprint status
router.get('/status/:memberId', authMiddleware, fingerprintController.getFingerprintStatus);

// Delete member fingerprint
router.delete('/:memberId', authMiddleware, branchManagerAccess, fingerprintController.deleteFingerprint);

// Get all members with fingerprint status
router.get('/members', authMiddleware, branchManagerAccess, fingerprintController.getMembersWithFingerprint);

module.exports = router;

