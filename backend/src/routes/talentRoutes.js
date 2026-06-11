import { Router } from 'express';
import { getById, list } from '../controllers/talentController.js';

const router = Router();

router.get('/', list);
router.get('/:talentProfileId', getById);

export default router;
