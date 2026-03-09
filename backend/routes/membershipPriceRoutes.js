const express = require('express');
const router = express.Router();
const controller = require('../controllers/membershipPriceController');
const authMiddleware = require('../middleware/authMiddleware');
const { staffManagerOrAbove, allRoles } = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

// View membership prices: gym_owner, manager, staff
router.get('/', allRoles, controller.getAll);
router.get('/:id', allRoles, controller.getOne);

// Mutations: gym_owner, manager only
router.post('/', staffManagerOrAbove, controller.create);
router.put('/:id', staffManagerOrAbove, controller.update);
router.delete('/:id', staffManagerOrAbove, controller.remove);

module.exports = router;
