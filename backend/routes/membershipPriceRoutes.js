const express = require('express');
const router = express.Router();
const controller = require('../controllers/membershipPriceController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, controller.create);
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getOne);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.remove);

module.exports = router;
