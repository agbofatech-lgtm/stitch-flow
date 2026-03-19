import { Router } from 'express';
import { licenseController } from '@modules/controllers/licenseController';
import { validate } from '@shared/hooks/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authMiddleware } from '@shared/hooks/auth';
import { licenseRateLimit } from '../config/rateLimit';
import { deactivateDeviceSchema, validateLicenseSchema } from '../schemas/licenseSchemas';

const router = Router();

router.post('/validate', licenseRateLimit, validate(validateLicenseSchema), asyncHandler(licenseController.validate));
router.post('/:licenseId/devices/deactivate', authMiddleware, validate(deactivateDeviceSchema), asyncHandler(licenseController.deactivateDevice));

export default router;
