const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { gymOwnerOrAdmin, staffManagerOrAbove } = require('../middleware/rbacMiddleware');
const expenseController = require('../controllers/expenseController');

router.use(authMiddleware);

// Owners and managers only for expenses
router.get('/', staffManagerOrAbove, expenseController.list);
router.get('/total', staffManagerOrAbove, expenseController.getTotalForRange);
router.post('/', gymOwnerOrAdmin, expenseController.create);
router.put('/:id', gymOwnerOrAdmin, expenseController.update);
router.delete('/:id', gymOwnerOrAdmin, expenseController.delete);

module.exports = router;
