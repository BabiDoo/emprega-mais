import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { transcribeAudioWithGemini } from './geminiService.js';
import {
  advanceSessionAfterCandidateMessage,
  createCandidateChatMessage,
  getWhatsappSession,
  updateChatMessage,
} from './whatsappSessionService.js';
import { getPublicUrl, storageBuckets, uploadBufferToStorage } from './storageService.js';

function extensionFromMimeType(mimeType) {
  const mapping = {
    'audio/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/mp4': 'mp4',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };

  return mapping[mimeType] || 'webm';
}

async function createAudioMessage(row) {
  const { data, error } = await supabase
    .from('audio_messages')
    .insert(row)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

async function updateAudioMessage(audioMessageId, payload) {
  const { data, error } = await supabase
    .from('audio_messages')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', audioMessageId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function processAudioMessage({ sessionId, step, file }) {
  if (!file) {
    throw new AppError('Audio file is required in field "audio"', 400);
  }

  const session = await getWhatsappSession(sessionId);
  const currentStep = step || session.current_step;
  const chatMessage = await createCandidateChatMessage({
    sessionId,
    step: currentStep,
    messageType: 'audio',
    textContent: file.originalname || 'candidate-audio',
    metadata: {
      mimeType: file.mimetype,
      size: file.size,
    },
  });

  const extension = extensionFromMimeType(file.mimetype);
  const audioMessageId = crypto.randomUUID();
  const storagePath = `${sessionId}/${audioMessageId}.${extension}`;

  await uploadBufferToStorage({
    bucket: storageBuckets.audio,
    path: storagePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const publicUrl = getPublicUrl({
    bucket: storageBuckets.audio,
    path: storagePath,
  });

  let audioMessage = await createAudioMessage({
    id: audioMessageId,
    session_id: sessionId,
    chat_message_id: chatMessage.id,
    step: currentStep,
    storage_bucket: storageBuckets.audio,
    storage_path: storagePath,
    public_url: publicUrl,
    original_filename: file.originalname || null,
    mime_type: file.mimetype,
    file_size_bytes: file.size,
    transcription_status: 'processing',
    transcription_provider: 'google-gemini',
  });

  await updateChatMessage(chatMessage.id, {
    audio_message_id: audioMessage.id,
  });

  try {
    const transcription = await transcribeAudioWithGemini({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    audioMessage = await updateAudioMessage(audioMessage.id, {
      transcription_status: 'completed',
      transcription_text: transcription.text,
      transcription_raw_response: transcription.raw,
      error_message: null,
    });

    await updateChatMessage(chatMessage.id, {
      transcription: transcription.text,
      text_content: transcription.text,
    });

    const next = await advanceSessionAfterCandidateMessage({
      sessionId,
      currentStep,
    });

    return {
      audioMessage,
      chatMessage: {
        ...chatMessage,
        transcription: transcription.text,
      },
      transcriptionText: transcription.text,
      storagePath,
      publicUrl,
      ...next,
    };
  } catch (error) {
    await updateAudioMessage(audioMessage.id, {
      transcription_status: 'failed',
      error_message: error.message,
    });

    throw new AppError(`Gemini transcription failed: ${error.message}`, 502);
  }
}
