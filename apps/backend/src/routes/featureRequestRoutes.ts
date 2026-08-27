import { Router } from 'express';
import { featureRequestController } from '../controllers/featureRequestController';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createFeatureRequestSchema } from '../schemas/featureRequestSchemas';

const router = Router();

router.get('/', asyncHandler(featureRequestController.list));
router.post('/', authMiddleware, validate(createFeatureRequestSchema), asyncHandler(featureRequestController.create));
router.post('/:id/vote', authMiddleware, asyncHandler(featureRequestController.vote));

export default router;
