import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { healthController } from '../controllers/healthController';

const router = Router();

// Unauthenticated by design: used by load balancers / orchestrators.
// None of these endpoints expose secrets or infrastructure credentials.
router.get('/', asyncHandler(healthController.check));
router.get('/live', asyncHandler(healthController.live));
router.get('/ready', asyncHandler(healthController.ready));
router.get('/version', asyncHandler(healthController.version));

export default router;
