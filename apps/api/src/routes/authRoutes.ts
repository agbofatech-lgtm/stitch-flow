import { Router } from 'express';
import { authController } from '@modules/controllers/authController';
import { validate } from '@shared/hooks/validate';
import { authRateLimit } from '../config/rateLimit';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/authSchemas';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimit, validate(refreshSchema), asyncHandler(authController.refresh));

export default router;
