const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { staffManagerOrAbove } = require('../middleware/rbacMiddleware');
const userController = require('../controllers/userController');

router.use(authMiddleware);
router.get('/staff', staffManagerOrAbove, userController.getStaff);
router.patch('/:userId/status', staffManagerOrAbove, userController.updateStatus);

module.exports = router;
