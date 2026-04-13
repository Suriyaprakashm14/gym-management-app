const express = require('express');
const router = express.Router();
const { isProduction } = require('../config/env');
const authMiddleware = require('../middleware/authMiddleware');
const { managerOrAbove, requireActiveGym } = require('../middleware/rbacMiddleware');

const attendanceController = require('../controllers/attendanceController');
const { validateMembership } = require('../middleware/membershipValidation');

// POST route to mark attendance via face recognition (requires member ID)
router.post('/', authMiddleware, managerOrAbove, requireActiveGym, attendanceController.uploadMiddleware, validateMembership, attendanceController.markAttendanceWithFace);

// POST route to mark attendance with photo only (no member ID required)
router.post('/photo-only', authMiddleware, managerOrAbove, requireActiveGym, attendanceController.uploadMiddleware, attendanceController.markAttendanceWithPhotoOnly);

// POST route to mark attendance via dual authentication (face + fingerprint)
router.post('/dual-auth', authMiddleware, managerOrAbove, requireActiveGym, attendanceController.uploadMiddleware, validateMembership, attendanceController.markAttendanceDualAuth);

// POST create Luxand person only (no member). Returns personId for add-member flow.
router.post('/enroll-face-pre', authMiddleware, managerOrAbove, requireActiveGym, attendanceController.uploadMiddleware, attendanceController.enrollFacePre);
// POST route to enroll/register a member's face for recognition
router.post('/enroll-face', authMiddleware, managerOrAbove, requireActiveGym, attendanceController.uploadMiddleware, attendanceController.enrollMemberFace);

// GET route to check if member has reference image
router.get('/check-reference/:memberId', authMiddleware, managerOrAbove, attendanceController.checkMemberReference);

// GET route to check membership status for a member
router.get('/check-membership/:memberId', authMiddleware, managerOrAbove, attendanceController.checkMembershipStatus);

// GET route to get attendance report with present/absent members and counts
router.get('/report', authMiddleware, managerOrAbove, attendanceController.getAttendanceReport);

// GET route to get weekly attendance report
router.get('/report/weekly', authMiddleware, managerOrAbove, attendanceController.getWeeklyAttendanceReport);

// GET route to list members (debug only; disabled in production)
if (!isProduction()) {
  router.get('/members', authMiddleware, managerOrAbove, attendanceController.listAllMembers);
}

module.exports = router;
