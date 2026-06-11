import { asyncHandler } from '../utils/asyncHandler.js';
import { processAudioMessage } from '../services/audioService.js';
import {
  createWhatsappSession,
  getWhatsappMessages,
  getWhatsappSession,
  processTextMessage,
} from '../services/whatsappSessionService.js';
import { generateProfileFromSession } from '../services/profileService.js';

export const createSession = asyncHandler(async (req, res) => {
  const result = await createWhatsappSession(req.body);

  res.status(201).json({
    sessionId: result.session.id,
    currentStep: result.currentStep,
    botMessage: result.botMessage,
    session: result.session,
  });
});

export const getSession = asyncHandler(async (req, res) => {
  const session = await getWhatsappSession(req.params.sessionId);
  const messages = await getWhatsappMessages(req.params.sessionId);
  res.json({ session, messages });
});

export const sendTextMessage = asyncHandler(async (req, res) => {
  const result = await processTextMessage({
    sessionId: req.params.sessionId,
    step: req.body.step,
    text: req.body.text,
  });

  res.json({
    chatMessage: result.chatMessage,
    transcriptionText: result.transcriptionText,
    currentStep: result.currentStep,
    botMessage: result.botMessage,
    session: result.session,
  });
});

export const sendAudioMessage = asyncHandler(async (req, res) => {
  const result = await processAudioMessage({
    sessionId: req.params.sessionId,
    step: req.body.step,
    file: req.file,
  });

  res.json({
    audioMessage: result.audioMessage,
    chatMessage: result.chatMessage,
    transcriptionText: result.transcriptionText,
    storagePath: result.storagePath,
    publicUrl: result.publicUrl,
    currentStep: result.currentStep,
    botMessage: result.botMessage,
    session: result.session,
  });
});

export const generateProfile = asyncHandler(async (req, res) => {
  const profile = await generateProfileFromSession(req.params.sessionId);

  res.json({
    talentProfileId: profile.id,
    name: profile.name,
    resumeText: profile.resume_text,
    resumePdfUrl: profile.resumePdfUrl,
    hashtags: profile.hashtags,
    profile,
  });
});
