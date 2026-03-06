const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { managerOrAbove } = require('../middleware/rbacMiddleware');
const expenseCategoryController = require('../controllers/expenseCategoryController');

router.use(authMiddleware);

router.get('/', managerOrAbove, expenseCategoryController.list);
router.post('/', managerOrAbove, expenseCategoryController.create);
router.put('/:id', managerOrAbove, expenseCategoryController.update);
router.delete('/:id', managerOrAbove, expenseCategoryController.delete);

module.exports = router;
