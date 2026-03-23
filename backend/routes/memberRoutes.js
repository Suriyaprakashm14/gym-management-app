const express = require('express');
const { markAttendanceWithFace } = require('../controllers/attendanceController');
const router = express.Router();

const memberController = require('../controllers/memberController');
const authMiddleware = require('../middleware/authMiddleware');
const memberFingerprintRoutes = require('./memberFingerprintRoutes');
const { 
  gymOwnerOrAdmin, 
  managerOrAbove,
  requireActiveGym
} = require('../middleware/rbacMiddleware');

// Gym owner and branch manager can create members
router.post('/', authMiddleware, memberController.uploadMiddleware, memberController.create);

// Gym owner and branch manager can get members
router.get('/', authMiddleware, memberController.getAll);
router.get('/:id', authMiddleware, memberController.getOne);

// Gym owner and branch manager can update members
router.put('/:id', authMiddleware, memberController.update);

// Patch method for partial updates
router.patch('/:id', authMiddleware, memberController.patch);

// Update profile image only (multipart)
router.patch('/:id/profile-image', authMiddleware, memberController.uploadMiddleware, memberController.updateProfileImage);

// Renew membership (gym owner and manager)
router.post('/:id/renew', authMiddleware, memberController.renew);

// Only gym owner can delete members (managers cannot delete)
router.delete('/:id', authMiddleware, memberController.remove);

// Attendance marking (separate functionality)
router.post('/attendance', markAttendanceWithFace);

// ========= Member fingerprint enrollment + check-in (WebAuthn) =========
router.use(memberFingerprintRoutes);

// Test Luxand connectivity (for debugging)
router.get('/test-luxand', authMiddleware, memberController.testLuxand);

// Check expired memberships
router.post('/check-expired-memberships', authMiddleware, memberController.checkExpiredMemberships);

module.exports = router;
