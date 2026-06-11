import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { asArray } from '../utils/json.js';
import { createResumePdfBuffer } from '../utils/pdf.js';
import { generateCandidateProfileWithGemini } from './geminiService.js';
import { createSignedUrl, storageBuckets, uploadBufferToStorage } from './storageService.js';
import {
  completeWhatsappSession,
  getConversationByStep,
  getWhatsappSession,
  markWhatsappSessionError,
} from './whatsappSessionService.js';

const INELIGIBLE_MESSAGE = 'Essa plataforma e voltada para oportunidades para pessoas com 60 anos ou mais e/ou pessoas com deficiencia. No momento, nao conseguimos concluir seu cadastro porque voce nao se enquadra nos criterios do MVP.';

function toNullableString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'nao informado') return null;
  return normalized;
}

function toInteger(value) {
  const match = String(value ?? '').match(/\d+/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').toLowerCase();
  if (['true', 'sim', 'sou pcd', 'pcd', 'yes'].some((token) => normalized.includes(token))) return true;
  if (['false', 'nao', 'não', 'no'].some((token) => normalized.includes(token))) return false;
  return false;
}

function normalizeDate(value) {
  const normalized = toNullableString(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return null;
}

function resolveEligibilityType({ age, isPcd }) {
  if (age >= 60 && isPcd) return 'both';
  if (isPcd) return 'pcd';
  return 'senior_60_plus';
}

function normalizeProfile(aiProfile, conversationByStep, phone) {
  const age = toInteger(aiProfile.age) ?? toInteger(conversationByStep.ask_age);
  const isPcd = toBoolean(aiProfile.is_pcd);
  const name = toNullableString(aiProfile.name) || toNullableString(conversationByStep.ask_name) || 'Candidato sem nome';
  const eligibilityType = resolveEligibilityType({ age, isPcd });

  const candidateStructuredJson = {
    ...(aiProfile.candidate_structured_json || {}),
    name,
    age,
    is_pcd: isPcd,
    eligibility_type: eligibilityType,
  };

  return {
    name,
    age,
    birth_date: normalizeDate(aiProfile.birth_date),
    city: toNullableString(aiProfile.city),
    state: toNullableString(aiProfile.state),
    phone: toNullableString(phone),
    is_pcd: isPcd,
    disability_types: asArray(aiProfile.disability_types),
    accessibility_needs: toNullableString(aiProfile.accessibility_needs),
    workplace_adaptations: toNullableString(aiProfile.workplace_adaptations),
    eligibility_type: eligibilityType,
    professional_summary: toNullableString(aiProfile.professional_summary),
    resume_text: toNullableString(aiProfile.resume_text) || buildResumeTextFallback(aiProfile, conversationByStep),
    resume_json: aiProfile.resume_json || {},
    candidate_structured_json: candidateStructuredJson,
    hashtags: asArray(aiProfile.hashtags),
    source: 'fake_whatsapp',
    status: 'available',
    updated_at: new Date().toISOString(),
  };
}

function buildResumeTextFallback(aiProfile, conversationByStep) {
  return [
    aiProfile.name || conversationByStep.ask_name || 'Candidato',
    '',
    aiProfile.professional_summary || 'Resumo profissional nao informado.',
    '',
    `Experiencia: ${conversationByStep.ask_professional_history || 'nao informado'}`,
    `Objetivo: ${conversationByStep.ask_current_goal || 'nao informado'}`,
    `Formacao: ${conversationByStep.ask_education || 'nao informado'}`,
    `Habilidades: ${conversationByStep.ask_skills || 'nao informado'}`,
  ].join('\n');
}

function assertEligibility(profile) {
  if ((profile.age !== null && profile.age >= 60) || profile.is_pcd === true) {
    return;
  }

  throw new AppError(INELIGIBLE_MESSAGE, 422);
}

async function insertTalentProfile(profile) {
  const { data, error } = await supabase
    .from('talent_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

async function updateTalentProfile(talentProfileId, payload) {
  const { data, error } = await supabase
    .from('talent_profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', talentProfileId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

async function insertResumeFile(row) {
  const { data, error } = await supabase
    .from('resume_files')
    .insert(row)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function generateProfileFromSession(sessionId) {
  const session = await getWhatsappSession(sessionId);

  if (session.talent_profile_id) {
    return getTalentProfile(session.talent_profile_id);
  }

  const conversationByStep = await getConversationByStep(sessionId);
  let aiProfile;

  try {
    aiProfile = await generateCandidateProfileWithGemini(conversationByStep);
  } catch (error) {
    throw new AppError(`Gemini profile generation failed: ${error.message}`, 502);
  }

  const profile = normalizeProfile(aiProfile, conversationByStep, session.phone);

  try {
    assertEligibility(profile);
  } catch (error) {
    await markWhatsappSessionError({ sessionId, message: error.message });
    throw error;
  }

  const talentProfile = await insertTalentProfile(profile);
  const pdfBuffer = createResumePdfBuffer({
    title: `Curriculo - ${talentProfile.name}`,
    resumeText: talentProfile.resume_text,
  });
  const resumePath = `${talentProfile.id}/resume.pdf`;

  await uploadBufferToStorage({
    bucket: storageBuckets.resume,
    path: resumePath,
    buffer: pdfBuffer,
    contentType: 'application/pdf',
  });

  const signedUrl = await createSignedUrl({
    bucket: storageBuckets.resume,
    path: resumePath,
  });

  await insertResumeFile({
    talent_profile_id: talentProfile.id,
    session_id: sessionId,
    file_type: 'resume_pdf',
    storage_bucket: storageBuckets.resume,
    storage_path: resumePath,
    public_url: signedUrl,
    generation_status: 'completed',
    provider: 'node_pdf_generator',
  });

  const updatedProfile = await updateTalentProfile(talentProfile.id, {
    resume_pdf_bucket: storageBuckets.resume,
    resume_pdf_path: resumePath,
    resume_pdf_public_url: signedUrl,
  });

  await completeWhatsappSession({
    sessionId,
    talentProfileId: updatedProfile.id,
  });

  return {
    ...updatedProfile,
    resumePdfUrl: signedUrl,
  };
}

export async function getTalentProfile(talentProfileId) {
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .eq('id', talentProfileId)
    .single();

  if (error) throw new AppError('Talent profile not found', 404);

  let resumePdfUrl = data.resume_pdf_public_url || null;

  if (data.resume_pdf_path) {
    resumePdfUrl = await createSignedUrl({
      bucket: data.resume_pdf_bucket || storageBuckets.resume,
      path: data.resume_pdf_path,
    });
  }

  return {
    ...data,
    resumePdfUrl,
  };
}

export async function listTalentProfiles() {
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 400);
  return data;
}
