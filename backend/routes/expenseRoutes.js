const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { staffManagerOrAbove } = require('../middleware/rbacMiddleware');
const expenseController = require('../controllers/expenseController');

router.use(authMiddleware);

// Owner: all branches; Manager: their branch only (controller enforces)
router.get('/', staffManagerOrAbove, expenseController.list);
router.get('/total', staffManagerOrAbove, expenseController.getTotalForRange);
router.post('/', staffManagerOrAbove, expenseController.create);
router.put('/:id', staffManagerOrAbove, expenseController.update);
router.delete('/:id', staffManagerOrAbove, expenseController.delete);

module.exports = router;
