import { Router } from 'express';
import { syncController } from '../controllers/syncController';
import { authMiddleware } from '../middleware/auth';
import { syncRateLimit } from '../config/rateLimit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { pullSyncSchema, pushSyncSchema } from '../schemas/syncSchemas';

const router = Router();

router.post('/push', authMiddleware, syncRateLimit, validate(pushSyncSchema), asyncHandler(syncController.push));
router.get('/pull', authMiddleware, syncRateLimit, validate(pullSyncSchema), asyncHandler(syncController.pull));

export default router;
