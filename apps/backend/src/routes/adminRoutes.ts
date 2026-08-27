import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

// Phase 6: operational metrics — authenticated admins only.
router.get('/metrics', asyncHandler(adminController.metrics));

router.get('/users', asyncHandler(adminController.users));
router.get('/analytics', asyncHandler(adminController.analytics));
router.get('/licenses', asyncHandler(adminController.licenses));
router.patch('/licenses/:id', asyncHandler(adminController.updateLicense));
router.post('/licenses/:id/revoke', asyncHandler(adminController.revokeLicense));
router.get('/feature-requests', asyncHandler(adminController.featureRequests));
router.get('/audit-logs', asyncHandler(adminController.auditLogs));

export default router;
