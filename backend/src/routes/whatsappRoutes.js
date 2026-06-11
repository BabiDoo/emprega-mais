import { Router } from 'express';
import { uploadAudio } from '../config/multer.js';
import {
  createSession,
  generateProfile,
  getSession,
  sendAudioMessage,
  sendTextMessage,
} from '../controllers/whatsappController.js';

const router = Router();

router.post('/', createSession);
router.get('/:sessionId', getSession);
router.post('/:sessionId/messages/text', sendTextMessage);
router.post('/:sessionId/messages/audio', uploadAudio.single('audio'), sendAudioMessage);
router.post('/:sessionId/generate-profile', generateProfile);

export default router;
