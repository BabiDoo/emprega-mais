// ─── Company ────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  email: string;
}

// ─── Job Post ────────────────────────────────────────────────────────────────
export type CandidateType =
  | '60+'
  | 'PCD_FISICA'
  | 'PCD_VISUAL'
  | 'PCD_AUDITIVA'
  | 'PCD_INTELECTUAL'
  | 'PCD_AUTISMO';

export interface JobPost {
  id: string;
  companyId: string;
  title: string;
  description: string;
  area: string;
  hashtags: string[];
  candidateTypes: CandidateType[];
  jobStructuredJson?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateJobPostPayload {
  companyId: string;
  title: string;
  description: string;
  area: string;
  hashtags: string[];
  candidateTypes: CandidateType[];
}

// ─── WhatsApp Session ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  type: 'text' | 'audio';
  content: string;
  audioUrl?: string;
  timestamp: string;
}

export interface WhatsAppSession {
  id: string;
  phone: string;
  step: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface CreateSessionPayload {
  phone: string;
}

export interface SendTextPayload {
  step: string;
  text: string;
}

// ─── Talent Profile ──────────────────────────────────────────────────────────
export interface TalentProfile {
  id: string;
  sessionId: string;
  name: string;
  phone: string;
  email?: string;
  summary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  candidateType?: CandidateType;
  pdfUrl?: string;
  profileJson?: Record<string, unknown>;
  createdAt: string;
}

// ─── Match ────────────────────────────────────────────────────────────────────
export interface Match {
  id: string;
  jobPostId: string;
  talentProfileId: string;
  score: number;
  justification?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'interview_scheduled';
  interviewDate?: string;
  feedback?: string;
  talentProfile?: TalentProfile;
  createdAt: string;
}

// ─── Auth / Storage ──────────────────────────────────────────────────────────
export type UserRole = 'company' | 'candidate';

export interface AppState {
  role: UserRole | null;
  companyId: string | null;
  sessionId: string | null;
}
