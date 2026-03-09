const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { staffManagerOrAbove } = require('../middleware/rbacMiddleware');
const staffController = require('../controllers/staffController');

router.use(authMiddleware);
router.use(staffManagerOrAbove);

router.get('/', staffController.getStaffs);
router.post('/', staffController.createStaff);
router.patch('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
