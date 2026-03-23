const express = require('express');
const router = express.Router();

const biometricAttendanceController = require('../controllers/biometricAttendanceController');

// Mark attendance after successful WebAuthn verification
router.post('/mark', biometricAttendanceController.markAttendance);

module.exports = router;

