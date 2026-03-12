const express = require('express');
const router = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { validateMembership } = require('../middleware/membershipValidation');

// POST route to mark attendance via face recognition (requires member ID)
router.post('/', attendanceController.uploadMiddleware, validateMembership, attendanceController.markAttendanceWithFace);

// POST route to mark attendance with photo only (no member ID required)
router.post('/photo-only', attendanceController.uploadMiddleware, attendanceController.markAttendanceWithPhotoOnly);

// POST route to mark attendance via dual authentication (face + fingerprint)
router.post('/dual-auth', attendanceController.uploadMiddleware, validateMembership, attendanceController.markAttendanceDualAuth);

// POST create Luxand person only (no member). Returns personId for add-member flow.
router.post('/enroll-face-pre', attendanceController.uploadMiddleware, attendanceController.enrollFacePre);
// POST route to enroll/register a member's face for recognition
router.post('/enroll-face', attendanceController.uploadMiddleware, attendanceController.enrollMemberFace);

// GET route to check if member has reference image
router.get('/check-reference/:memberId', attendanceController.checkMemberReference);

// GET route to check membership status for a member
router.get('/check-membership/:memberId', attendanceController.checkMembershipStatus);

// GET route to get attendance report with present/absent members and counts
router.get('/report', attendanceController.getAttendanceReport);

// GET route to get weekly attendance report
router.get('/report/weekly', attendanceController.getWeeklyAttendanceReport);

// GET route to list all members (for debugging ID issues)
router.get('/members', attendanceController.listAllMembers);

module.exports = router;
