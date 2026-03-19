import { Router } from 'express';
import { featureRequestController } from '@modules/controllers/featureRequestController';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authMiddleware } from '@shared/hooks/auth';
import { validate } from '@shared/hooks/validate';
import { createFeatureRequestSchema } from '../schemas/featureRequestSchemas';

const router = Router();

router.get('/', asyncHandler(featureRequestController.list));
router.post('/', authMiddleware, validate(createFeatureRequestSchema), asyncHandler(featureRequestController.create));
router.post('/:id/vote', authMiddleware, asyncHandler(featureRequestController.vote));

export default router;
