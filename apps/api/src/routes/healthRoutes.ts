import { Router } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { healthController } from '@modules/controllers/healthController';

const router = Router();

router.get('/', asyncHandler(healthController.check));

export default router;
