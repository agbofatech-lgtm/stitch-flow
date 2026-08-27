import { Router } from 'express';
import { syncController } from '../controllers/syncController';
import { authMiddleware } from '../middleware/auth';
import { syncRateLimit } from '../config/rateLimit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  changesQuerySchema,
  mutationsSchema,
  pullSyncSchema,
  pushSyncSchema
} from '../schemas/syncSchemas';
import { requireWorkspace } from '../middleware/workspace';

const router = Router();

// v1 (user-scoped, timestamp-based) — retained for compatibility
router.post('/push', authMiddleware, requireWorkspace, syncRateLimit, validate(pushSyncSchema), asyncHandler(syncController.push));
router.get('/pull', authMiddleware, syncRateLimit, validate(pullSyncSchema), asyncHandler(syncController.pull));

// v2 (workspace-scoped, monotonic server cursor, idempotent mutations)
router.get('/changes', authMiddleware, requireWorkspace, syncRateLimit, validate(changesQuerySchema), asyncHandler(syncController.changes));
router.post('/mutations', authMiddleware, requireWorkspace, syncRateLimit, validate(mutationsSchema), asyncHandler(syncController.mutations));

export default router;
