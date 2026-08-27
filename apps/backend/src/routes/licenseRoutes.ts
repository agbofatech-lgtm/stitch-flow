import { Router } from 'express';
import { licenseController } from '../controllers/licenseController';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { licenseRateLimit } from '../config/rateLimit';
import { deactivateDeviceSchema, validateLicenseSchema } from '../schemas/licenseSchemas';

const router = Router();

router.post('/validate', licenseRateLimit, validate(validateLicenseSchema), asyncHandler(licenseController.validate));
router.post('/:licenseId/devices/deactivate', authMiddleware, validate(deactivateDeviceSchema), asyncHandler(licenseController.deactivateDevice));

export default router;
