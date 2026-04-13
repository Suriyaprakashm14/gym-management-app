const express = require('express');
const router = express.Router();
const controller = require('../controllers/membersPersonalDetailsController');
const authMiddleware = require('../middleware/authMiddleware');
const { gymOwnerOrAdmin, managerOrAbove, requireActiveGym } = require('../middleware/rbacMiddleware');

router.post('/', authMiddleware, managerOrAbove, requireActiveGym, controller.create);
router.get('/', authMiddleware, managerOrAbove, controller.getAll);
router.get('/member/:memberId', authMiddleware, managerOrAbove, controller.getByMemberId);
router.get('/:id', authMiddleware, managerOrAbove, controller.getOne);
router.put('/member/:memberId', authMiddleware, managerOrAbove, requireActiveGym, controller.updateByMemberId);
router.patch('/member/:memberId', authMiddleware, managerOrAbove, requireActiveGym, controller.updateByMemberId);
router.put('/:id', authMiddleware, managerOrAbove, requireActiveGym, controller.update);
router.delete('/:id', authMiddleware, gymOwnerOrAdmin, requireActiveGym, controller.remove);

module.exports = router;
