import axios from 'axios';
import type {
  Company,
  CreateCompanyPayload,
  JobPost,
  CreateJobPostPayload,
  WhatsAppSession,
  CreateSessionPayload,
  SendTextPayload,
  TalentProfile,
  Match,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Health ──────────────────────────────────────────────────────────────────
export const healthCheck = () => api.get('/health');

// ─── Companies ───────────────────────────────────────────────────────────────
export const createCompany = (payload: CreateCompanyPayload) =>
  api.post<Company>('/companies', payload);

export const getCompany = (companyId: string) =>
  api.get<Company>(`/companies/${companyId}`);

// ─── Job Posts ────────────────────────────────────────────────────────────────
export const createJobPost = (payload: CreateJobPostPayload) =>
  api.post<JobPost>('/job-posts', payload);

export const getCompanyJobPosts = (companyId: string) =>
  api.get<JobPost[]>(`/companies/${companyId}/job-posts`);

export const getJobPost = (jobPostId: string) =>
  api.get<JobPost>(`/job-posts/${jobPostId}`);

// ─── WhatsApp Sessions ────────────────────────────────────────────────────────
export const createSession = (payload: CreateSessionPayload) =>
  api.post<WhatsAppSession>('/whatsapp-sessions', payload);

export const getSession = (sessionId: string) =>
  api.get<WhatsAppSession>(`/whatsapp-sessions/${sessionId}`);

export const sendTextMessage = (sessionId: string, payload: SendTextPayload) =>
  api.post<WhatsAppSession>(`/whatsapp-sessions/${sessionId}/messages/text`, payload);

export const sendAudioMessage = (sessionId: string, formData: FormData) =>
  api.post<WhatsAppSession>(`/whatsapp-sessions/${sessionId}/messages/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const generateProfile = (sessionId: string) =>
  api.post<TalentProfile>(`/whatsapp-sessions/${sessionId}/generate-profile`);

// ─── Talent Profiles ──────────────────────────────────────────────────────────
export const getTalentProfiles = () =>
  api.get<TalentProfile[]>('/talent-profiles');

export const getTalentProfile = (id: string) =>
  api.get<TalentProfile>(`/talent-profiles/${id}`);

// ─── Matches ──────────────────────────────────────────────────────────────────
export const runMatch = (jobPostId: string) =>
  api.post(`/job-posts/${jobPostId}/run-match`);

export const getMatches = (jobPostId: string) =>
  api.get<Match[]>(`/job-posts/${jobPostId}/matches`);

export default api;
