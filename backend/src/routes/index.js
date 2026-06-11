import { Router } from 'express';
import companyRoutes from './companyRoutes.js';
import healthRoutes from './healthRoutes.js';
import jobRoutes from './jobRoutes.js';
import talentRoutes from './talentRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/companies', companyRoutes);
router.use('/job-posts', jobRoutes);
router.use('/whatsapp-sessions', whatsappRoutes);
router.use('/talent-profiles', talentRoutes);

export default router;
