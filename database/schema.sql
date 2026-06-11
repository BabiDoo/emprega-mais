create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  cnpj text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null,
  area text not null,
  hashtags text[] not null default '{}',
  job_structured_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.talent_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  birth_date date,
  city text,
  state text,
  phone text,
  is_pcd boolean not null default false,
  disability_types text[] not null default '{}',
  accessibility_needs text,
  workplace_adaptations text,
  eligibility_type text not null default 'senior_60_plus',
  professional_summary text,
  resume_text text,
  resume_json jsonb not null default '{}'::jsonb,
  resume_pdf_bucket text default 'candidate-resumes',
  resume_pdf_path text,
  resume_pdf_public_url text,
  candidate_structured_json jsonb not null default '{}'::jsonb,
  hashtags text[] not null default '{}',
  source text not null default 'fake_whatsapp',
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talent_profiles_eligibility_check check (
    (age is not null and age >= 60)
    or is_pcd = true
  ),
  constraint talent_profiles_eligibility_type_check check (
    eligibility_type in ('senior_60_plus', 'pcd', 'both')
  )
);

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text,
  current_step text not null default 'welcome',
  status text not null default 'active',
  talent_profile_id uuid references public.talent_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.whatsapp_sessions(id) on delete cascade,
  sender text not null,
  message_type text not null default 'text',
  text_content text,
  audio_message_id uuid,
  transcription text,
  step text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audio_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.whatsapp_sessions(id) on delete cascade,
  chat_message_id uuid references public.chat_messages(id) on delete cascade,
  step text not null,
  storage_bucket text not null default 'candidate-audios',
  storage_path text not null,
  public_url text,
  original_filename text,
  mime_type text,
  file_size_bytes int,
  duration_seconds numeric,
  transcription_status text not null default 'pending',
  transcription_text text,
  transcription_provider text,
  transcription_raw_response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_messages
add constraint chat_messages_audio_message_id_fkey
foreign key (audio_message_id)
references public.audio_messages(id)
on delete set null;

create table if not exists public.resume_files (
  id uuid primary key default gen_random_uuid(),
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  session_id uuid references public.whatsapp_sessions(id) on delete set null,
  file_type text not null default 'resume_pdf',
  storage_bucket text not null default 'candidate-resumes',
  storage_path text not null,
  public_url text,
  generation_status text not null default 'completed',
  provider text not null default 'html_to_pdf',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_match_results (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  score int not null default 0,
  match_status text not null default 'pending',
  ai_reason text,
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  recommendation text,
  raw_ai_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_post_id, talent_profile_id),
  constraint ai_match_score_check check (score >= 0 and score <= 100)
);

create index if not exists idx_companies_auth_user_id on public.companies(auth_user_id);
create index if not exists idx_job_posts_company_id on public.job_posts(company_id);
create index if not exists idx_job_posts_area on public.job_posts(area);
create index if not exists idx_job_posts_hashtags on public.job_posts using gin(hashtags);
create index if not exists idx_job_posts_structured_json on public.job_posts using gin(job_structured_json);
create index if not exists idx_talent_profiles_age on public.talent_profiles(age);
create index if not exists idx_talent_profiles_is_pcd on public.talent_profiles(is_pcd);
create index if not exists idx_talent_profiles_eligibility_type on public.talent_profiles(eligibility_type);
create index if not exists idx_talent_profiles_city_state on public.talent_profiles(city, state);
create index if not exists idx_talent_profiles_hashtags on public.talent_profiles using gin(hashtags);
create index if not exists idx_talent_profiles_structured_json on public.talent_profiles using gin(candidate_structured_json);
create index if not exists idx_whatsapp_sessions_status on public.whatsapp_sessions(status);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_audio_messages_session_id on public.audio_messages(session_id);
create index if not exists idx_audio_messages_chat_message_id on public.audio_messages(chat_message_id);
create index if not exists idx_audio_messages_status on public.audio_messages(transcription_status);
create index if not exists idx_audio_messages_step on public.audio_messages(step);
create index if not exists idx_resume_files_talent_profile_id on public.resume_files(talent_profile_id);
create index if not exists idx_resume_files_session_id on public.resume_files(session_id);
create index if not exists idx_ai_match_results_job_post_id on public.ai_match_results(job_post_id);
create index if not exists idx_ai_match_results_talent_profile_id on public.ai_match_results(talent_profile_id);
create index if not exists idx_ai_match_results_score on public.ai_match_results(score desc);
