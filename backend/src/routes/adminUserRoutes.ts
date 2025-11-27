import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as adminUserController from '../controllers/adminUserController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/users', adminUserController.getAllUsers);
router.get('/users/:id', adminUserController.getUserById);
router.post('/users', adminUserController.createUser);
router.put('/users/:id', adminUserController.updateUser);
router.put('/users/:id/credentials', adminUserController.updateCredentials);
router.delete('/users/:id', adminUserController.deleteUser);
router.post('/users/:id/restore', adminUserController.restoreUser);
router.post('/users/:id/promote', adminUserController.promoteUser);
router.post('/users/:id/force-logout', adminUserController.forceLogout);
router.post('/users/bulk-delete', adminUserController.bulkDelete);
router.delete('/users/:id/permanent', authorize('SUPER_ADMIN'), adminUserController.permanentDelete);
router.post('/users/bulk-permanent-delete', authorize('SUPER_ADMIN'), adminUserController.bulkPermanentDelete);

router.get('/pending/leave', adminUserController.getPendingLeave);
router.get('/pending/product', adminUserController.getPendingProducts);
router.put('/leave/:id/review', adminUserController.reviewLeave);
router.put('/product/:id/review', adminUserController.reviewProduct);

router.post('/users/:id/approve', adminUserController.approveUser);
router.post('/users/:id/reject', adminUserController.rejectUser);
router.post('/users/bulk-approve', adminUserController.bulkApprove);

export default router;
