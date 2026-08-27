import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authRateLimit } from '../config/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/authSchemas';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimit, validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', authRateLimit, validate(refreshSchema), asyncHandler(authController.logout));

export default router;
