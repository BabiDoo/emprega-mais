import { Router } from 'express';
import { healthCheck, supabaseHealthCheck } from '../controllers/healthController.js';

const router = Router();

router.get('/', healthCheck);
router.get('/supabase', supabaseHealthCheck);

export default router;
