const express = require('express');
const router = express.Router();
const controller = require('../controllers/membersPersonalDetailsController');
const authMiddleware = require('../middleware/authMiddleware');
const { gymOwnerOrAdmin } = require('../middleware/rbacMiddleware');

router.post('/', authMiddleware, controller.create);
router.get('/', authMiddleware, controller.getAll);
router.get('/member/:memberId', authMiddleware, controller.getByMemberId);
router.get('/:id', authMiddleware, controller.getOne);
router.put('/member/:memberId', authMiddleware, controller.updateByMemberId);
router.patch('/member/:memberId', authMiddleware, controller.updateByMemberId);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, gymOwnerOrAdmin, controller.remove);

module.exports = router;
