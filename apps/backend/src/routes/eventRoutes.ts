import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { eventsRateLimit } from '../config/rateLimit';
import { eventBatchSchema } from '../schemas/eventSchemas';

const router = Router();

router.post('/', authMiddleware, eventsRateLimit, validate(eventBatchSchema), asyncHandler(eventController.ingest));

export default router;
