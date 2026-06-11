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
  const normalizedMimeType = normalizeMimeType(mimeType);
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

  return mapping[normalizedMimeType] || 'webm';
}

function normalizeMimeType(mimeType = '') {
  return mimeType.split(';')[0].trim().toLowerCase();
}

function normalizeTranscription(text = '') {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isUsableTranscription(text) {
  const normalized = normalizeTranscription(text);

  if (!normalized) return false;

  const nonSpeechPatterns = [
    /por favor.*forneca.*(audio|conteudo).*transcrit/,
    /nao.*(recebi|ha|existe).*(audio|fala|conteudo)/,
    /nenhum.*(audio|fala|conteudo).*(fornecido|enviado|detectado)/,
  ];

  return !nonSpeechPatterns.some((pattern) => pattern.test(normalized));
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

  if (!file.buffer?.length || file.size < 1024) {
    throw new AppError('Audio is too short or empty. Record again before sending.', 400);
  }

  const session = await getWhatsappSession(sessionId);
  const currentStep = step || session.current_step;

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

  try {
    const transcription = await transcribeAudioWithGemini({
      buffer: file.buffer,
      mimeType: normalizeMimeType(file.mimetype),
    });
    const transcriptionText = transcription.text?.trim() || '';

    if (!isUsableTranscription(transcriptionText)) {
      throw new AppError('Audio transcription did not contain usable speech. Record again before sending.', 400);
    }

    audioMessage = await updateAudioMessage(audioMessage.id, {
      transcription_status: 'completed',
      transcription_text: transcriptionText,
      transcription_raw_response: transcription.raw,
      error_message: null,
    });

    const chatMessage = await createCandidateChatMessage({
      sessionId,
      step: currentStep,
      messageType: 'audio',
      textContent: transcriptionText,
      transcription: transcriptionText,
      metadata: {
        audioMessageId: audioMessage.id,
        mimeType: file.mimetype,
        size: file.size,
        publicUrl,
      },
    });

    audioMessage = await updateAudioMessage(audioMessage.id, {
      chat_message_id: chatMessage.id,
    });

    await updateChatMessage(chatMessage.id, {
      audio_message_id: audioMessage.id,
    });

    const next = await advanceSessionAfterCandidateMessage({
      sessionId,
      currentStep,
    });

    return {
      audioMessage,
      chatMessage: {
        ...chatMessage,
        transcription: transcriptionText,
      },
      transcriptionText,
      storagePath,
      publicUrl,
      ...next,
    };
  } catch (error) {
    await updateAudioMessage(audioMessage.id, {
      transcription_status: 'failed',
      error_message: error.message,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(`Gemini transcription failed: ${error.message}`, 502);
  }
}
