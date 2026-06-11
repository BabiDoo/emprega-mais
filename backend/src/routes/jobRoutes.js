import { Router } from 'express';
import {
  create,
  getById,
  list,
  listMatches,
  remove,
  runMatch,
  update,
} from '../controllers/jobController.js';

const router = Router();

router.post('/', create);
router.get('/', list);
router.post('/:jobPostId/run-match', runMatch);
router.get('/:jobPostId/matches', listMatches);
router.get('/:jobPostId', getById);
router.patch('/:jobPostId', update);
router.put('/:jobPostId', update);
router.delete('/:jobPostId', remove);

export default router;
