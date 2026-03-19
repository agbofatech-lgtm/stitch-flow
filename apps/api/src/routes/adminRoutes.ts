import { Router } from 'express';
import { adminController } from '@modules/controllers/adminController';
import { authMiddleware } from '@shared/hooks/auth';
import { requireRole } from '@shared/hooks/requireRole';
import { asyncHandler } from '@shared/utils/asyncHandler';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/users', asyncHandler(adminController.users));
router.get('/analytics', asyncHandler(adminController.analytics));
router.get('/licenses', asyncHandler(adminController.licenses));
router.patch('/licenses/:id', asyncHandler(adminController.updateLicense));
router.post('/licenses/:id/revoke', asyncHandler(adminController.revokeLicense));
router.get('/feature-requests', asyncHandler(adminController.featureRequests));
router.get('/audit-logs', asyncHandler(adminController.auditLogs));

export default router;
