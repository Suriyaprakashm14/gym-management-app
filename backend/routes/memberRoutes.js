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
router.post('/', authMiddleware, managerOrAbove, requireActiveGym, memberController.uploadMiddleware, memberController.create);

// Gym owner and branch manager can get members
router.get('/', authMiddleware, managerOrAbove, memberController.getAll);
router.get('/:id', authMiddleware, managerOrAbove, memberController.getOne);

// Gym owner and branch manager can update members
router.put('/:id', authMiddleware, managerOrAbove, requireActiveGym, memberController.update);

// Patch method for partial updates
router.patch('/:id', authMiddleware, managerOrAbove, requireActiveGym, memberController.patch);

// Update profile image only (multipart)
router.patch('/:id/profile-image', authMiddleware, managerOrAbove, requireActiveGym, memberController.uploadMiddleware, memberController.updateProfileImage);

// Renew membership (gym owner and manager)
router.post('/:id/renew', authMiddleware, managerOrAbove, requireActiveGym, memberController.renew);

// Only gym owner can delete members (managers cannot delete)
router.delete('/:id', authMiddleware, gymOwnerOrAdmin, requireActiveGym, memberController.remove);

// Attendance marking (separate functionality)
router.post('/attendance', authMiddleware, managerOrAbove, requireActiveGym, markAttendanceWithFace);

// ========= Member fingerprint enrollment + check-in (WebAuthn) =========
router.use(memberFingerprintRoutes);

// Test Luxand connectivity (for debugging)
router.get('/test-luxand', authMiddleware, memberController.testLuxand);

// Check expired memberships
router.post('/check-expired-memberships', authMiddleware, gymOwnerOrAdmin, requireActiveGym, memberController.checkExpiredMemberships);

module.exports = router;
