const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { managerOrAbove } = require('../middleware/rbacMiddleware');
const expenseController = require('../controllers/expenseController');

router.use(authMiddleware);

router.get('/', managerOrAbove, expenseController.list);
router.get('/total', managerOrAbove, expenseController.getTotalForRange);
router.post('/', managerOrAbove, expenseController.create);
router.put('/:id', managerOrAbove, expenseController.update);
router.delete('/:id', managerOrAbove, expenseController.delete);

module.exports = router;
