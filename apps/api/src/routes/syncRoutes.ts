import { Router } from 'express';
import { syncController } from '@modules/controllers/syncController';
import { authMiddleware } from '@shared/hooks/auth';
import { syncRateLimit } from '../config/rateLimit';
import { validate } from '@shared/hooks/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { pullSyncSchema, pushSyncSchema } from '../schemas/syncSchemas';

const router = Router();

router.post('/push', authMiddleware, syncRateLimit, validate(pushSyncSchema), asyncHandler(syncController.push));
router.get('/pull', authMiddleware, syncRateLimit, validate(pullSyncSchema), asyncHandler(syncController.pull));

export default router;
