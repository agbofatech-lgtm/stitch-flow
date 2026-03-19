import { Router } from 'express';
import { eventController } from '@modules/controllers/eventController';
import { validate } from '@shared/hooks/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authMiddleware } from '@shared/hooks/auth';
import { eventsRateLimit } from '../config/rateLimit';
import { eventBatchSchema } from '../schemas/eventSchemas';

const router = Router();

router.post('/', authMiddleware, eventsRateLimit, validate(eventBatchSchema), asyncHandler(eventController.ingest));

export default router;
