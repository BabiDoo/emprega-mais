import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const acceptedAudioMimeTypes = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
]);

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const mimeType = file.mimetype.split(';')[0].trim().toLowerCase();

    if (acceptedAudioMimeTypes.has(mimeType)) {
      callback(null, true);
      return;
    }

    callback(new AppError(`Unsupported audio type: ${file.mimetype}`, 415));
  },
});
