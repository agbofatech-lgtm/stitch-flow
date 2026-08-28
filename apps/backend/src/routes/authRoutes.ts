import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authRateLimit } from '../config/rateLimit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../schemas/authSchemas';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimit, validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', authRateLimit, validate(refreshSchema), asyncHandler(authController.logout));
// Phase 9 — account recovery. Same strict auth rate limit applies: these
// endpoints must not become an enumeration or brute-force oracle.
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;
