import { Router } from 'express';
import {
  create,
  getById,
  list,
  listCompanyJobPosts,
  update,
} from '../controllers/companyController.js';

const router = Router();

router.post('/', create);
router.get('/', list);
router.get('/:companyId/job-posts', listCompanyJobPosts);
router.get('/:companyId', getById);
router.patch('/:companyId', update);
router.put('/:companyId', update);

export default router;
