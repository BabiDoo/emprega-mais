import axios, { type AxiosResponse } from 'axios';
import type {
  Company,
  CreateCompanyPayload,
  JobPost,
  CreateJobPostPayload,
  WhatsAppSession,
  CreateSessionPayload,
  SendTextPayload,
  ChatMessage,
  TalentProfile,
  Match,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const withData = <T>(response: AxiosResponse, data: T): AxiosResponse<T> => ({
  ...response,
  data,
});

const toArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const normalizeCompany = (company: any): Company => ({
  id: company.id,
  name: company.name,
  email: company.email,
  createdAt: company.createdAt || company.created_at,
});

const normalizeJobPost = (job: any): JobPost => ({
  id: job.id,
  companyId: job.companyId || job.company_id,
  title: job.title,
  description: job.description,
  area: job.area,
  hashtags: toArray<string>(job.hashtags),
  candidateTypes: toArray(job.candidateTypes || job.candidate_types || job.job_structured_json?.candidate_types),
  jobStructuredJson: job.jobStructuredJson || job.job_structured_json,
  createdAt: job.createdAt || job.created_at,
});

const normalizeChatMessage = (message: any): ChatMessage => ({
  id: message.id,
  role: message.role || (message.sender === 'candidate' ? 'user' : 'ai'),
  type: message.type || (message.message_type === 'audio' ? 'audio' : 'text'),
  content: message.content || message.transcription || message.text_content || '',
  audioUrl: message.audioUrl || message.public_url,
  timestamp: message.timestamp || message.created_at || new Date().toISOString(),
});

const normalizeSessionPayload = (payload: any): WhatsAppSession => {
  const session = payload.session || payload;
  const messages = payload.messages
    ? payload.messages.map(normalizeChatMessage)
    : payload.botMessage
      ? [{
          id: `${session.id || payload.sessionId}-welcome`,
          role: 'ai' as const,
          type: 'text' as const,
          content: payload.botMessage,
          timestamp: session.created_at || new Date().toISOString(),
        }]
      : [];

  return {
    id: session.id || payload.sessionId,
    sessionId: session.id || payload.sessionId,
    phone: session.phone || '',
    step: payload.currentStep || session.current_step || payload.step || '',
    messages,
    createdAt: session.createdAt || session.created_at || new Date().toISOString(),
  };
};

const normalizeTalentProfile = (profile: any): TalentProfile => {
  const resumeJson = profile.resume_json || {};
  const candidateJson = profile.candidate_structured_json || {};

  return {
    id: profile.id || profile.talentProfileId,
    sessionId: profile.sessionId || profile.session_id || '',
    name: profile.name,
    phone: profile.phone || '',
    email: profile.email,
    summary: profile.summary || profile.professional_summary,
    skills: toArray<string>(profile.skills || resumeJson.skills || candidateJson.skills),
    experience: toArray<string>(
      profile.experience
      || resumeJson.experience?.map((item: any) => typeof item === 'string' ? item : item.description || item.role)
      || candidateJson.professional_experience?.map((item: any) => typeof item === 'string' ? item : item.description || item.role),
    ),
    education: toArray<string>(profile.education || (resumeJson.education ? [resumeJson.education] : [])),
    candidateType: profile.candidateType || profile.eligibility_type,
    pdfUrl: profile.pdfUrl || profile.resumePdfUrl || profile.resume_pdf_public_url,
    profileJson: profile.profileJson || profile.candidate_structured_json || profile.resume_json,
    createdAt: profile.createdAt || profile.created_at,
  };
};

const normalizeMatch = (match: any): Match => ({
  id: match.id,
  jobPostId: match.jobPostId || match.job_post_id,
  talentProfileId: match.talentProfileId || match.talent_profile_id,
  score: match.score,
  justification: match.justification || match.aiReason || match.ai_reason || match.recommendation,
  status: match.status || match.matchStatus || match.match_status || 'pending',
  interviewDate: match.interviewDate || match.interview_date,
  feedback: match.feedback,
  talentProfile: match.talentProfile
    ? normalizeTalentProfile(match.talentProfile)
    : match.name
      ? normalizeTalentProfile({
          id: match.talentProfileId,
          name: match.name,
          phone: match.phone,
          professional_summary: match.aiReason,
          resumePdfUrl: match.resumePdfUrl,
        })
      : undefined,
  createdAt: match.createdAt || match.created_at || new Date().toISOString(),
});

// ─── Health ──────────────────────────────────────────────────────────────────
export const healthCheck = () => api.get('/health');

// ─── Companies ───────────────────────────────────────────────────────────────
export const createCompany = (payload: CreateCompanyPayload) =>
  api.post('/companies', payload).then((response) => withData(response, normalizeCompany(response.data)));

export const getCompany = (companyId: string) =>
  api.get(`/companies/${companyId}`).then((response) => withData(response, normalizeCompany(response.data)));

// ─── Job Posts ────────────────────────────────────────────────────────────────
export const createJobPost = (payload: CreateJobPostPayload) =>
  api.post('/job-posts', payload).then((response) => withData(response, normalizeJobPost(response.data)));

export const getCompanyJobPosts = (companyId: string) =>
  api.get(`/companies/${companyId}/job-posts`).then((response) => (
    withData(response, toArray<any>(response.data.jobPosts || response.data).map(normalizeJobPost))
  ));

export const getJobPost = (jobPostId: string) =>
  api.get(`/job-posts/${jobPostId}`).then((response) => withData(response, normalizeJobPost(response.data)));

// ─── WhatsApp Sessions ────────────────────────────────────────────────────────
export const createSession = (payload: CreateSessionPayload) =>
  api.post('/whatsapp-sessions', payload)
    .then((response) => getSession(response.data.sessionId || response.data.id));

export const getSession = (sessionId: string) =>
  api.get(`/whatsapp-sessions/${sessionId}`).then((response) => (
    withData(response, normalizeSessionPayload(response.data))
  ));

export const sendTextMessage = (sessionId: string, payload: SendTextPayload) =>
  api.post(`/whatsapp-sessions/${sessionId}/messages/text`, payload)
    .then(() => getSession(sessionId));

export const sendAudioMessage = (sessionId: string, formData: FormData) =>
  api.post(`/whatsapp-sessions/${sessionId}/messages/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(() => getSession(sessionId));

export const generateProfile = (sessionId: string) =>
  api.post(`/whatsapp-sessions/${sessionId}/generate-profile`).then((response) => (
    withData(response, normalizeTalentProfile(response.data.profile || response.data))
  ));

// ─── Talent Profiles ──────────────────────────────────────────────────────────
export const getTalentProfiles = () =>
  api.get('/talent-profiles').then((response) => (
    withData(response, toArray<any>(response.data.talentProfiles || response.data).map(normalizeTalentProfile))
  ));

export const getTalentProfile = (id: string) =>
  api.get(`/talent-profiles/${id}`).then((response) => withData(response, normalizeTalentProfile(response.data)));

// ─── Matches ──────────────────────────────────────────────────────────────────
export const runMatch = (jobPostId: string) =>
  api.post(`/job-posts/${jobPostId}/run-match`);

export const getMatches = (jobPostId: string) =>
  api.get(`/job-posts/${jobPostId}/matches`).then((response) => (
    withData(response, toArray<any>(response.data.matches || response.data).map(normalizeMatch))
  ));

export default api;
