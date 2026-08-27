import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { healthController } from '../controllers/healthController';

const router = Router();

router.get('/', asyncHandler(healthController.check));

export default router;
