import { Router } from 'express';
import authRoutes from './authRoutes';
import licenseRoutes from './licenseRoutes';
import eventRoutes from './eventRoutes';
import featureRequestRoutes from './featureRequestRoutes';
import syncRoutes from './syncRoutes';
import adminRoutes from './adminRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/licenses', licenseRoutes);
router.use('/events', eventRoutes);
router.use('/feature-requests', featureRequestRoutes);
router.use('/sync', syncRoutes);
router.use('/admin', adminRoutes);
router.use('/health', healthRoutes);

export default router;
