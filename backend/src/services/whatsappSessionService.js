import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

export const whatsappSteps = [
  'ask_name',
  'ask_age',
  'ask_birth_date',
  'ask_is_pcd',
  'ask_accessibility_needs',
  'ask_city_state',
  'ask_professional_history',
  'ask_current_goal',
  'ask_education',
  'ask_skills',
];

const botMessagesByStep = {
  ask_name: 'Ola. Para comecar, me diga seu nome completo.',
  ask_age: 'Qual e a sua idade?',
  ask_birth_date: 'Qual e a sua data de nascimento?',
  ask_is_pcd: 'Voce se autodeclara uma pessoa com deficiencia, PCD?',
  ask_accessibility_needs: 'Voce precisa de alguma adaptacao ou recurso de acessibilidade no trabalho?',
  ask_city_state: 'Em qual cidade e estado voce mora?',
  ask_professional_history: 'Conte um pouco da sua experiencia profissional.',
  ask_current_goal: 'Que tipo de trabalho voce busca agora?',
  ask_education: 'Qual e sua formacao ou escolaridade?',
  ask_skills: 'Quais habilidades voce gostaria de destacar?',
  generating_resume: 'Tenho as informacoes principais. Agora posso gerar seu perfil e curriculo.',
  completed: 'Seu perfil foi criado e seu curriculo esta pronto.',
};

export function getBotMessage(step) {
  return botMessagesByStep[step] || null;
}

export function getNextStep(step) {
  const currentIndex = whatsappSteps.indexOf(step);
  if (currentIndex < 0) return whatsappSteps[0];
  return whatsappSteps[currentIndex + 1] || 'generating_resume';
}

export async function createWhatsappSession(payload = {}) {
  const currentStep = 'ask_name';

  const { data: session, error } = await supabase
    .from('whatsapp_sessions')
    .insert({
      phone: payload.phone || null,
      current_step: currentStep,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);

  await createBotChatMessage({
    sessionId: session.id,
    step: currentStep,
    text: getBotMessage(currentStep),
  });

  return {
    session,
    currentStep,
    botMessage: getBotMessage(currentStep),
  };
}

export async function getWhatsappSession(sessionId) {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw new AppError('WhatsApp session not found', 404);
  return data;
}

export async function getWhatsappMessages(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function createCandidateChatMessage({
  sessionId,
  step,
  messageType,
  textContent,
  transcription,
  metadata = {},
}) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender: 'candidate',
      message_type: messageType,
      text_content: textContent || null,
      transcription: transcription || null,
      step,
      metadata,
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function createBotChatMessage({ sessionId, step, text, metadata = {} }) {
  if (!text) return null;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender: 'bot',
      message_type: 'text',
      text_content: text,
      step,
      metadata,
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function updateChatMessage(chatMessageId, payload) {
  const { data, error } = await supabase
    .from('chat_messages')
    .update(payload)
    .eq('id', chatMessageId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function advanceSessionAfterCandidateMessage({ sessionId, currentStep }) {
  const nextStep = getNextStep(currentStep);

  const { data: session, error } = await supabase
    .from('whatsapp_sessions')
    .update({
      current_step: nextStep,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);

  const botMessage = getBotMessage(nextStep);
  await createBotChatMessage({ sessionId, step: nextStep, text: botMessage });

  return {
    session,
    currentStep: nextStep,
    botMessage,
  };
}

export async function processTextMessage({ sessionId, step, text }) {
  const session = await getWhatsappSession(sessionId);
  const currentStep = step || session.current_step;

  const chatMessage = await createCandidateChatMessage({
    sessionId,
    step: currentStep,
    messageType: 'text',
    textContent: text,
    transcription: text,
  });

  const next = await advanceSessionAfterCandidateMessage({ sessionId, currentStep });

  return {
    chatMessage,
    transcriptionText: text,
    ...next,
  };
}

export async function getConversationByStep(sessionId) {
  const messages = await getWhatsappMessages(sessionId);

  return messages.reduce((accumulator, message) => {
    if (message.sender !== 'candidate' || !message.step) return accumulator;

    const content = message.transcription || message.text_content;
    if (!content) return accumulator;

    accumulator[message.step] = accumulator[message.step]
      ? `${accumulator[message.step]}\n${content}`
      : content;

    return accumulator;
  }, {});
}

export async function completeWhatsappSession({ sessionId, talentProfileId }) {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update({
      current_step: 'completed',
      status: 'completed',
      talent_profile_id: talentProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  await createBotChatMessage({ sessionId, step: 'completed', text: getBotMessage('completed') });
  return data;
}

export async function markWhatsappSessionError({ sessionId, message }) {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update({
      status: 'error',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  await createBotChatMessage({ sessionId, step: 'error', text: message });
  return data;
}
