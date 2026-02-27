const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  adminOnly, 
  gymOwnerOrAdmin, 
  requireGymAccess,
  requireActiveGym 
} = require('../middleware/rbacMiddleware');
const gymController = require('../controllers/gymController');

// All routes require authentication
router.use(authMiddleware);

// Admin only routes
router.post('/', adminOnly, gymController.createGym);
router.get('/', adminOnly, gymController.getAllGyms);
router.get('/:gymId/statistics', adminOnly, requireGymAccess('gymId'), gymController.getGymStatistics);
router.put('/:gymId/freeze', adminOnly, requireGymAccess('gymId'), gymController.freezeGym);
router.put('/:gymId/unfreeze', adminOnly, requireGymAccess('gymId'), gymController.unfreezeGym);
router.delete('/:gymId', adminOnly, requireGymAccess('gymId'), gymController.deleteGym);

// Gym owner and admin routes
router.get('/my-gym', gymOwnerOrAdmin, gymController.getGymById);
router.get('/:gymId', gymOwnerOrAdmin, requireGymAccess('gymId'), gymController.getGymById);
router.put('/:gymId', gymOwnerOrAdmin, requireGymAccess('gymId'), requireActiveGym, gymController.updateGym);

module.exports = router;
