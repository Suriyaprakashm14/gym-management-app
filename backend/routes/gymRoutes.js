const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  gymOwnerOrAdmin, 
  requireGymAccess,
  requireActiveGym 
} = require('../middleware/rbacMiddleware');
const gymController = require('../controllers/gymController');

// All routes require authentication
router.use(authMiddleware);

router.get('/my-gym', gymOwnerOrAdmin, gymController.getGymById);
router.get('/:gymId', gymOwnerOrAdmin, requireGymAccess('gymId'), gymController.getGymById);
router.put('/:gymId', gymOwnerOrAdmin, requireGymAccess('gymId'), requireActiveGym, gymController.updateGym);

module.exports = router;
