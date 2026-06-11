# Documento de Implementação MVP — Plataforma de Vagas 60+ e PCD

## 1. Visão geral do produto

A plataforma conecta empresas que desejam divulgar vagas inclusivas a candidatos cadastrados em um banco de talentos formado por dois públicos prioritários:

1. Pessoas com **60 anos ou mais**.
2. Pessoas com deficiência (**PCDs**), independentemente de idade mínima definida para o MVP.

O objetivo do MVP é valorizar experiência, trajetória profissional, acessibilidade e inclusão. A regra de elegibilidade do candidato passa a ser:

```txt
Candidato elegível = idade >= 60 OU is_pcd = true
```

O candidato não preenche um formulário tradicional. Ele passa por uma experiência simulando WhatsApp, responde preferencialmente por áudio, a IA transcreve os áudios, cria um currículo estruturado, gera um resumo em PDF e monta um JSON profissional para ser usado no match com vagas.

A empresa cadastra uma vaga na plataforma web. A IA estrutura essa vaga em JSON, incluindo requisitos técnicos, habilidades, acessibilidade, adaptações possíveis e abertura para PCDs/60+. Depois, o backend compara o JSON da vaga com o JSON dos candidatos para gerar uma lista de matches.

---

# 2. Escopo do MVP

## 2.1 Funcionalidades obrigatórias

O MVP precisa entregar:

1. Cadastro/login simples de empresa.
2. Cadastro de vagas pela empresa.
3. Geração de JSON estruturado da vaga por IA.
4. Tela simulando WhatsApp para cadastro do candidato.
5. Envio real de áudio pelo frontend.
6. Upload do áudio para Supabase Storage.
7. Transcrição real do áudio por IA.
8. Armazenamento da transcrição no banco.
9. Geração de currículo por IA.
10. Geração de JSON estruturado do candidato.
11. Armazenamento do candidato no banco de talentos.
12. Geração de resumo/currículo em PDF já no MVP.
13. Cadastro de informações de elegibilidade: 60+, PCD ou ambos.
14. Cadastro opcional de necessidades de acessibilidade/adaptações.
15. Match por IA entre vaga e candidatos.
16. Tela da empresa para visualizar candidatos compatíveis.
17. Tela para visualizar o currículo gerado.
18. Tela/botão para baixar ou abrir o PDF do resumo/currículo.

---

# 3. Stack sugerida

## Frontend

* React, Next.js ou Vite.
* Supabase client para auth e leitura simples, se desejado.
* MediaRecorder API para gravar áudio no navegador.
* Interface simulando WhatsApp.
* `MediaRecorder API` nativa do navegador para capturar áudio.
* Envio via `FormData`/`multipart/form-data` para o backend.
* Opcional: hook `useAudioRecorder` para encapsular gravação, preview, retry e status.

## Backend

* Node.js com Express ou NestJS.
* `multer` ou `busboy` para receber `multipart/form-data` no endpoint de áudio.
* `@supabase/supabase-js` no backend com service role para upload no Storage.
* Biblioteca de PDF, como `pdf-lib`, `puppeteer` ou `@react-pdf/renderer`, para gerar o PDF do currículo/resumo.
* Supabase SDK com service role.
* OpenAI ou outro modelo para:

  * transcrição;
  * geração de currículo;
  * estruturação da vaga;
  * match.
  * geração de resumo/currículo em PDF, caso o PDF seja gerado a partir de HTML/template.

## Banco

* Supabase Postgres.
* Supabase Storage para áudios e PDFs de currículo/resumo.

---

# 4. Fluxos de usuário

## 4.1 Fluxo da empresa

1. Empresa acessa a plataforma.
2. Empresa faz cadastro ou login.
3. Empresa acessa dashboard.
4. Empresa clica em “Criar vaga”.
5. Empresa preenche:

   * título;
   * descrição;
   * área;
   * hashtags.
6. Backend recebe os dados da vaga.
7. Backend chama IA para gerar `job_structured_json`.
8. Backend salva a vaga no banco.
9. Empresa vê a vaga criada.
10. Empresa clica em “Rodar match”.
11. Backend busca candidatos do banco de talentos.
12. Backend envia JSON da vaga + JSON dos candidatos para IA.
13. IA retorna score, justificativa e habilidades compatíveis.
14. Backend salva os resultados em `ai_match_results`.
15. Empresa visualiza ranking de candidatos.
16. Empresa abre o currículo gerado do candidato.

---

## 4.2 Fluxo do candidato no WhatsApp fake

1. Candidato acessa tela “Entrar no banco de talentos”.
2. Frontend cria uma nova sessão de conversa.
3. Bot envia mensagem de boas-vindas.
4. Bot pergunta as informações em etapas, incluindo idade, se a pessoa é PCD e necessidades de acessibilidade/adaptações, quando aplicável.
5. Candidato responde por áudio.
6. Frontend grava o áudio usando `MediaRecorder`.
7. Frontend envia o áudio para o backend.
8. Backend salva o áudio no Supabase Storage.
9. Backend cria registro em `audio_messages`.
10. Backend envia o arquivo para transcrição.
11. Backend salva a transcrição.
12. Backend retorna:

* transcrição;
* próxima pergunta;
* próximo step.

13. Ao final, backend chama IA para gerar:

* currículo;
* resumo profissional;
* resumo/currículo em PDF;
* hashtags;
* JSON estruturado do candidato.

14. Backend salva o candidato em `talent_profiles`.
15. Bot informa que o currículo e o PDF foram criados com sucesso.
16. Frontend mostra uma prévia do currículo.

---

# 5. Modelagem do banco de dados

## 5.1 Entidades principais

A modelagem do MVP será composta por:

```txt
companies
job_posts
talent_profiles
whatsapp_sessions
chat_messages
audio_messages
resume_files
ai_match_results
```

---

# 6. SQL completo para Supabase

## 6.1 Extensão

```sql
create extension if not exists "pgcrypto";
```

---

## 6.2 Tabela `companies`

Armazena empresas cadastradas na plataforma.

```sql
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
```

---

## 6.3 Tabela `job_posts`

Armazena as vagas cadastradas pelas empresas.

```sql
create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,

  title text not null,
  description text not null,
  area text not null,

  hashtags text[] not null default '{}',

  job_structured_json jsonb not null default '{}'::jsonb,

  status text not null default 'active',
  -- active | paused | closed | draft

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Exemplo de `job_structured_json`:

```json
{
  "title": "Atendente de Loja",
  "area": "Atendimento",
  "seniority": "operacional",
  "required_skills": [
    "atendimento ao cliente",
    "organização",
    "comunicação"
  ],
  "desired_skills": [
    "experiência com caixa",
    "vendas presenciais"
  ],
  "desired_experience": [
    "varejo",
    "atendimento presencial"
  ],
  "education_required": "Ensino médio desejável",
  "location": {
    "city": "Belo Horizonte",
    "state": "MG",
    "remote": false
  },
  "work_model": "presencial",
  "pcd_friendly": true,
  "accessibility": {
    "accepts_pcd": true,
    "required_adaptations": [],
    "physical_accessibility": "não informado",
    "assistive_technology": "não informado"
  },
  "keywords": [
    "atendimento",
    "loja",
    "cliente",
    "organização",
    "vendas"
  ]
}
```

---

## 6.4 Tabela `talent_profiles`

Armazena candidatos do banco de talentos.

```sql
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
  -- senior_60_plus | pcd | both

  professional_summary text,

  resume_text text,
  resume_json jsonb not null default '{}'::jsonb,

  resume_pdf_bucket text default 'candidate-resumes',
  resume_pdf_path text,
  resume_pdf_public_url text,

  candidate_structured_json jsonb not null default '{}'::jsonb,

  hashtags text[] not null default '{}',

  source text not null default 'fake_whatsapp',
  -- fake_whatsapp | manual | import

  status text not null default 'available',
  -- available | unavailable | hidden

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
```

Exemplo de `candidate_structured_json`:

```json
{
  "name": "Maria Aparecida Souza",
  "age": 62,
  "is_pcd": false,
  "disability_types": [],
  "accessibility_needs": "não informado",
  "workplace_adaptations": "não informado",
  "eligibility_type": "senior_60_plus",
  "location": {
    "city": "Belo Horizonte",
    "state": "MG"
  },
  "professional_experience": [
    {
      "role": "Atendente de Loja",
      "area": "Atendimento",
      "description": "Experiência com atendimento ao público, organização de loja e suporte ao cliente."
    }
  ],
  "current_goal": "Busca oportunidade em atendimento, recepção ou comércio.",
  "education": "Ensino médio completo",
  "skills": [
    "atendimento ao cliente",
    "organização",
    "comunicação",
    "pontualidade"
  ],
  "preferred_areas": [
    "Atendimento",
    "Recepção",
    "Comércio"
  ],
  "keywords": [
    "atendimento",
    "cliente",
    "loja",
    "recepção",
    "organização",
    "60+"
  ]
}
```

---

## 6.5 Tabela `whatsapp_sessions`

Controla a conversa simulada do WhatsApp.

```sql
create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),

  phone text,

  current_step text not null default 'welcome',
  -- welcome
  -- ask_name
  -- ask_age
  -- ask_birth_date
  -- ask_is_pcd
  -- ask_accessibility_needs
  -- ask_city_state
  -- ask_professional_history
  -- ask_current_goal
  -- ask_education
  -- ask_skills
  -- generating_resume
  -- completed

  status text not null default 'active',
  -- active | completed | abandoned | error

  talent_profile_id uuid references public.talent_profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 6.6 Tabela `chat_messages`

Armazena o histórico da conversa.

```sql
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references public.whatsapp_sessions(id) on delete cascade,

  sender text not null,
  -- bot | candidate | system

  message_type text not null default 'text',
  -- text | audio | transcription | system

  text_content text,

  audio_message_id uuid,

  transcription text,

  step text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);
```

---

## 6.7 Tabela `audio_messages`

Controla o ciclo completo do áudio.

```sql
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
  -- pending | processing | completed | failed

  transcription_text text,

  transcription_provider text,
  -- openai | google | assemblyai | mock

  transcription_raw_response jsonb not null default '{}'::jsonb,

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Depois de criar `audio_messages`, adicionar a foreign key em `chat_messages`:

```sql
alter table public.chat_messages
add constraint chat_messages_audio_message_id_fkey
foreign key (audio_message_id)
references public.audio_messages(id)
on delete set null;
```


---

## 6.8 Tabela `resume_files`

Armazena os PDFs gerados para o candidato. Para o MVP do hackathon, o PDF **faz parte do escopo** e deve ser gerado ao final do cadastro.

```sql
create table if not exists public.resume_files (
  id uuid primary key default gen_random_uuid(),

  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  session_id uuid references public.whatsapp_sessions(id) on delete set null,

  file_type text not null default 'resume_pdf',
  -- resume_pdf | summary_pdf

  storage_bucket text not null default 'candidate-resumes',
  storage_path text not null,
  public_url text,

  generation_status text not null default 'completed',
  -- pending | processing | completed | failed

  provider text not null default 'html_to_pdf',
  -- html_to_pdf | react_pdf | pdf_lib | mock

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 6.9 Tabela `ai_match_results`

Armazena resultados do match entre vagas e candidatos.

```sql
create table if not exists public.ai_match_results (
  id uuid primary key default gen_random_uuid(),

  job_post_id uuid not null references public.job_posts(id) on delete cascade,

  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,

  score int not null default 0,

  match_status text not null default 'pending',
  -- pending | weak_match | good_match | strong_match | rejected

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
```

---

# 7. Índices recomendados

```sql
create index if not exists idx_companies_auth_user_id
on public.companies(auth_user_id);

create index if not exists idx_job_posts_company_id
on public.job_posts(company_id);

create index if not exists idx_job_posts_area
on public.job_posts(area);

create index if not exists idx_job_posts_hashtags
on public.job_posts using gin(hashtags);

create index if not exists idx_job_posts_structured_json
on public.job_posts using gin(job_structured_json);

create index if not exists idx_talent_profiles_age
on public.talent_profiles(age);

create index if not exists idx_talent_profiles_is_pcd
on public.talent_profiles(is_pcd);

create index if not exists idx_talent_profiles_eligibility_type
on public.talent_profiles(eligibility_type);

create index if not exists idx_talent_profiles_city_state
on public.talent_profiles(city, state);

create index if not exists idx_talent_profiles_hashtags
on public.talent_profiles using gin(hashtags);

create index if not exists idx_talent_profiles_structured_json
on public.talent_profiles using gin(candidate_structured_json);

create index if not exists idx_whatsapp_sessions_status
on public.whatsapp_sessions(status);

create index if not exists idx_chat_messages_session_id
on public.chat_messages(session_id);

create index if not exists idx_audio_messages_session_id
on public.audio_messages(session_id);

create index if not exists idx_audio_messages_chat_message_id
on public.audio_messages(chat_message_id);

create index if not exists idx_audio_messages_status
on public.audio_messages(transcription_status);

create index if not exists idx_audio_messages_step
on public.audio_messages(step);

create index if not exists idx_resume_files_talent_profile_id
on public.resume_files(talent_profile_id);

create index if not exists idx_resume_files_session_id
on public.resume_files(session_id);

create index if not exists idx_ai_match_results_job_post_id
on public.ai_match_results(job_post_id);

create index if not exists idx_ai_match_results_talent_profile_id
on public.ai_match_results(talent_profile_id);

create index if not exists idx_ai_match_results_score
on public.ai_match_results(score desc);
```

---

# 8. Supabase Storage

## 8.1 Bucket obrigatório

Criar bucket:

```txt
candidate-audios
```

Uso:

```txt
candidate-audios/{session_id}/{audio_message_id}.webm
```

Exemplo:

```txt
candidate-audios/52d8c1e3/6b9a01d9.webm
```

No banco, salvar:

```json
{
  "storage_bucket": "candidate-audios",
  "storage_path": "52d8c1e3/6b9a01d9.webm"
}
```

---

## 8.2 Bucket obrigatório para PDFs

Criar bucket obrigatório:

```txt
candidate-resumes
```

Uso futuro:

```txt
candidate-resumes/{talent_profile_id}/resume.pdf
candidate-resumes/{talent_profile_id}/summary.pdf
```

Para o hackathon, o PDF **não deve ser ignorado**. Ele faz parte do MVP e deve ser gerado ao final do cadastro do candidato.

---

# 9. Biblioteca e implementação de áudio

## 9.1 Decisão técnica recomendada

Para o MVP, a melhor escolha é usar a **MediaRecorder API nativa do navegador** no frontend, sem depender de uma biblioteca externa pesada. Ela permite capturar áudio do microfone usando `navigator.mediaDevices.getUserMedia`, gravar com `MediaRecorder`, gerar um `Blob` e enviar esse arquivo para o backend via `FormData`.

Arquitetura recomendada:

```txt
React/Vite/Next
↓
MediaRecorder API captura áudio
↓
Blob audio/webm
↓
FormData multipart/form-data
↓
Endpoint Node.js com multer
↓
Supabase Storage
↓
OpenAI Transcription API
↓
Banco Postgres
↓
Frontend recebe transcrição e próxima pergunta
```

## 9.2 Bibliotecas/pacotes usados

### Frontend

```txt
Nenhuma biblioteca obrigatória para gravação.
Usar APIs nativas:
- navigator.mediaDevices.getUserMedia
- MediaRecorder
- Blob
- FormData
```

Opcionalmente, criar um hook próprio:

```txt
src/hooks/useAudioRecorder.ts
```

Responsabilidades do hook:

```txt
- pedir permissão do microfone;
- iniciar gravação;
- parar gravação;
- montar Blob final;
- controlar status: idle, recording, uploading, transcribing, failed;
- expor audioBlob para envio;
- permitir gravar novamente se falhar.
```

### Backend

Pacotes recomendados:

```bash
npm install multer @supabase/supabase-js openai
npm install -D @types/multer
```

Uso de cada pacote:

```txt
multer:
  Receber multipart/form-data no endpoint de áudio.

@supabase/supabase-js:
  Fazer upload do arquivo para o bucket candidate-audios usando service role.

openai:
  Enviar o arquivo de áudio para transcrição.

pdf-lib, puppeteer ou @react-pdf/renderer:
  Gerar o PDF do currículo/resumo do candidato.
```

## 9.3 Hook `useAudioRecorder`

```ts
import { useRef, useState } from "react";

export type AudioRecorderStatus =
  | "idle"
  | "recording"
  | "stopped"
  | "failed";

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [status, setStatus] = useState<AudioRecorderStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm"
        });

        setAudioBlob(blob);
        setStatus("stopped");

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setStatus("recording");
    } catch (err) {
      setStatus("failed");
      setError("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecording() {
    setAudioBlob(null);
    setError(null);
    setStatus("idle");
    chunksRef.current = [];
  }

  return {
    status,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
}
```

## 9.4 Função de envio do áudio

```ts
async function sendAudio({
  sessionId,
  audioBlob,
  currentStep
}: {
  sessionId: string;
  audioBlob: Blob;
  currentStep: string;
}) {
  const formData = new FormData();

  formData.append("audio", audioBlob, `candidate-${Date.now()}.webm`);
  formData.append("step", currentStep);

  const response = await fetch(
    `/api/whatsapp-sessions/${sessionId}/messages/audio`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.message || "Erro ao enviar áudio para transcrição."
    );
  }

  return response.json();
}
```

## 9.5 Endpoint backend com `multer`

```ts
import multer from "multer";
import { Router } from "express";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "audio/webm",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/mp4"
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Formato de áudio não suportado."));
    }

    cb(null, true);
  }
});

router.post(
  "/api/whatsapp-sessions/:sessionId/messages/audio",
  upload.single("audio"),
  async (req, res) => {
    const { sessionId } = req.params;
    const { step } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        error: "AUDIO_REQUIRED",
        message: "Envie um arquivo de áudio."
      });
    }

    // 1. Validar sessão e step.
    // 2. Criar audio_messages como pending.
    // 3. Fazer upload para Supabase Storage.
    // 4. Transcrever com OpenAI.
    // 5. Salvar transcrição.
    // 6. Avançar conversa.
    // 7. Retornar próxima pergunta.

    return res.json({
      transcriptionStatus: "completed"
    });
  }
);
```

## 9.6 Upload para Supabase Storage no backend

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function uploadCandidateAudio({
  sessionId,
  audioMessageId,
  buffer,
  mimeType
}: {
  sessionId: string;
  audioMessageId: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const storagePath = `${sessionId}/${audioMessageId}.webm`;

  const { error } = await supabaseAdmin.storage
    .from("candidate-audios")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Erro ao salvar áudio: ${error.message}`);
  }

  return {
    bucket: "candidate-audios",
    path: storagePath
  };
}
```

## 9.7 Transcrição com OpenAI

```ts
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function transcribeAudio({
  buffer,
  filename,
  mimeType
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}) {
  const file = await toFile(buffer, filename, {
    type: mimeType
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    language: "pt"
  });

  return transcription.text;
}
```

## 9.8 Observações importantes

```txt
- Para hackathon, priorizar audio/webm porque é simples no Chrome/Edge.
- O frontend nunca deve enviar áudio direto para OpenAI, para não expor a API key.
- O frontend envia para o backend.
- O backend salva no Supabase Storage antes ou depois da transcrição.
- O backend registra status: pending, processing, completed ou failed.
- Em caso de falha, o bot deve pedir para o candidato gravar novamente.
- Para acessibilidade, manter fallback de resposta por texto.
- Para PCDs, o fallback de texto é importante, porque nem todo candidato poderá ou desejará responder por áudio.
```


---

# 10. Steps da conversa do WhatsApp fake

## 9.1 Ordem oficial dos steps

```txt
welcome
ask_name
ask_age
ask_birth_date
ask_is_pcd
ask_accessibility_needs
ask_city_state
ask_professional_history
ask_current_goal
ask_education
ask_skills
generating_resume
completed
```

---

## 9.2 Templates de mensagens do bot

```ts
export const whatsappSteps = {
  welcome: {
    nextStep: "ask_name",
    botMessage:
      "Olá! Eu sou o assistente da plataforma 60+ e PCD. Vou te ajudar a criar seu currículo para o banco de talentos. Podemos começar?"
  },

  ask_name: {
    nextStep: "ask_age",
    botMessage:
      "Me diga seu nome completo, por favor. Você pode responder por áudio."
  },

  ask_age: {
    nextStep: "ask_birth_date",
    botMessage:
      "Qual é a sua idade? Lembrando que essa plataforma é exclusiva para pessoas com 60 anos ou mais e/ou PCDs."
  },

  ask_birth_date: {
    nextStep: "ask_is_pcd",
    botMessage:
      "Qual é a sua data de nascimento?"
  },

  ask_is_pcd: {
    nextStep: "ask_accessibility_needs",
    botMessage:
      "Você é uma pessoa com deficiência (PCD)? Se sim, pode me contar qual tipo de deficiência ou necessidade gostaria de informar. Essa informação ajuda a buscar vagas mais adequadas e acessíveis."
  },

  ask_accessibility_needs: {
    nextStep: "ask_city_state",
    botMessage:
      "Você precisa de alguma adaptação, recurso de acessibilidade ou condição específica no ambiente de trabalho? Se não precisar, pode responder 'não'."
  },

  ask_city_state: {
    nextStep: "ask_professional_history",
    botMessage:
      "Em qual cidade e estado você mora?"
  },

  ask_professional_history: {
    nextStep: "ask_current_goal",
    botMessage:
      "Agora me conte com o que você trabalha ou já trabalhou. Pode falar livremente por áudio."
  },

  ask_current_goal: {
    nextStep: "ask_education",
    botMessage:
      "Que tipo de trabalho você está buscando atualmente?"
  },

  ask_education: {
    nextStep: "ask_skills",
    botMessage:
      "Você tem alguma formação acadêmica, curso técnico, curso livre ou experiência prática importante?"
  },

  ask_skills: {
    nextStep: "generating_resume",
    botMessage:
      "Quais habilidades você considera que tem de melhor?"
  },

  generating_resume: {
    nextStep: "completed",
    botMessage:
      "Perfeito! Agora vou organizar suas informações e gerar seu currículo."
  },

  completed: {
    nextStep: null,
    botMessage:
      "Seu currículo foi criado com sucesso e já está no banco de talentos."
  }
};
```

---

# 11. Endpoints do backend

## 10.1 Health check

```txt
GET /api/health
```

Resposta:

```json
{
  "status": "ok"
}
```

---

# 12. Endpoints de empresa

## 11.1 Criar empresa

```txt
POST /api/companies
```

Body:

```json
{
  "name": "Mercado Bom Preço",
  "email": "rh@mercadobompreco.com",
  "cnpj": "00.000.000/0001-00",
  "website": "https://mercadobompreco.com"
}
```

Resposta:

```json
{
  "id": "uuid",
  "name": "Mercado Bom Preço",
  "email": "rh@mercadobompreco.com"
}
```

---

## 11.2 Buscar empresa logada

```txt
GET /api/companies/me
```

Resposta:

```json
{
  "id": "uuid",
  "name": "Mercado Bom Preço",
  "email": "rh@mercadobompreco.com"
}
```

Para hackathon, se a autenticação for simplificada, o frontend pode guardar `companyId` em localStorage.

---

# 13. Endpoints de vagas

## 12.1 Criar vaga

```txt
POST /api/job-posts
```

Body:

```json
{
  "companyId": "uuid",
  "title": "Atendente de Loja",
  "description": "Atendimento ao cliente, organização de prateleiras, suporte nas vendas e auxílio no caixa.",
  "area": "Atendimento",
  "hashtags": ["#atendimento", "#varejo", "#cliente", "#loja"]
}
```

Processo no backend:

```txt
1. Receber dados da vaga.
2. Chamar IA para gerar job_structured_json.
3. Salvar vaga no banco.
4. Retornar vaga criada.
```

Resposta:

```json
{
  "id": "uuid",
  "companyId": "uuid",
  "title": "Atendente de Loja",
  "description": "Atendimento ao cliente, organização de prateleiras, suporte nas vendas e auxílio no caixa.",
  "area": "Atendimento",
  "hashtags": ["#atendimento", "#varejo", "#cliente", "#loja"],
  "jobStructuredJson": {
    "title": "Atendente de Loja",
    "area": "Atendimento",
    "required_skills": ["atendimento ao cliente", "organização", "comunicação"],
    "keywords": ["atendimento", "cliente", "loja"]
  }
}
```

---

## 12.2 Listar vagas da empresa

```txt
GET /api/companies/:companyId/job-posts
```

Resposta:

```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Atendente de Loja",
      "area": "Atendimento",
      "status": "active",
      "createdAt": "2026-06-11T12:00:00Z"
    }
  ]
}
```

---

## 12.3 Detalhar vaga

```txt
GET /api/job-posts/:jobPostId
```

Resposta:

```json
{
  "id": "uuid",
  "title": "Atendente de Loja",
  "description": "Atendimento ao cliente...",
  "area": "Atendimento",
  "hashtags": ["#atendimento", "#varejo"],
  "jobStructuredJson": {
    "required_skills": ["atendimento ao cliente", "organização"]
  }
}
```

---

# 14. Endpoints do WhatsApp fake

## 13.1 Criar sessão

```txt
POST /api/whatsapp-sessions
```

Body:

```json
{
  "phone": "31999999999"
}
```

Backend:

```txt
1. Criar whatsapp_sessions com current_step = welcome.
2. Criar primeira mensagem do bot em chat_messages.
3. Retornar sessionId e mensagem inicial.
```

Resposta:

```json
{
  "sessionId": "uuid",
  "currentStep": "welcome",
  "nextStep": "ask_name",
  "botMessage": "Olá! Eu sou o assistente da plataforma 60+ e PCD. Vou te ajudar a criar seu currículo para o banco de talentos. Podemos começar?"
}
```

---

## 13.2 Buscar sessão e mensagens

```txt
GET /api/whatsapp-sessions/:sessionId
```

Resposta:

```json
{
  "sessionId": "uuid",
  "currentStep": "ask_professional_history",
  "status": "active",
  "messages": [
    {
      "id": "uuid",
      "sender": "bot",
      "messageType": "text",
      "textContent": "Me diga seu nome completo, por favor.",
      "step": "ask_name",
      "createdAt": "2026-06-11T12:00:00Z"
    },
    {
      "id": "uuid",
      "sender": "candidate",
      "messageType": "audio",
      "transcription": "Maria Aparecida Souza",
      "step": "ask_name",
      "createdAt": "2026-06-11T12:01:00Z"
    }
  ]
}
```

---

## 13.3 Enviar mensagem de texto

Esse endpoint é útil para fallback caso o áudio falhe.

```txt
POST /api/whatsapp-sessions/:sessionId/messages/text
```

Body:

```json
{
  "step": "ask_name",
  "text": "Maria Aparecida Souza"
}
```

Backend:

```txt
1. Validar sessão.
2. Salvar mensagem do candidato.
3. Atualizar current_step para o próximo.
4. Criar mensagem do bot com próxima pergunta.
5. Retornar próxima pergunta.
```

Resposta:

```json
{
  "chatMessageId": "uuid",
  "receivedText": "Maria Aparecida Souza",
  "currentStep": "ask_age",
  "botMessage": "Qual é a sua idade? Lembrando que essa plataforma é exclusiva para pessoas com 60 anos ou mais e/ou PCDs."
}
```

---

## 13.4 Enviar áudio e transcrever

```txt
POST /api/whatsapp-sessions/:sessionId/messages/audio
```

Formato:

```txt
multipart/form-data
```

Campos:

```txt
audio: arquivo .webm
step: ask_professional_history
```

Backend:

```txt
1. Validar sessão.
2. Validar step.
3. Validar arquivo.
4. Criar audio_messages com status pending.
5. Salvar áudio no Supabase Storage.
6. Criar chat_messages do tipo audio.
7. Atualizar audio_messages.chat_message_id.
8. Atualizar audio_messages.transcription_status para processing.
9. Enviar arquivo para IA de transcrição.
10. Salvar transcription_text.
11. Atualizar audio_messages.transcription_status para completed.
12. Atualizar chat_messages.transcription.
13. Atualizar whatsapp_sessions.current_step.
14. Criar próxima mensagem do bot.
15. Retornar transcrição e próxima pergunta.
```

Resposta de sucesso:

```json
{
  "audioMessageId": "uuid",
  "chatMessageId": "uuid",
  "step": "ask_professional_history",
  "transcriptionStatus": "completed",
  "transcriptionText": "Eu trabalhei por muitos anos como atendente de loja e também ajudei no caixa.",
  "currentStep": "ask_current_goal",
  "botMessage": "Que tipo de trabalho você está buscando atualmente?"
}
```

Resposta de erro:

```json
{
  "audioMessageId": "uuid",
  "transcriptionStatus": "failed",
  "errorMessage": "Não foi possível transcrever o áudio.",
  "retry": true,
  "botMessage": "Não consegui entender esse áudio. Pode gravar novamente, por favor?"
}
```

---

## 13.5 Gerar perfil e currículo do candidato

```txt
POST /api/whatsapp-sessions/:sessionId/generate-profile
```

Backend:

```txt
1. Buscar sessão.
2. Buscar todas as mensagens/transcrições da sessão.
3. Montar objeto com respostas por step.
4. Chamar IA para gerar currículo e JSON do candidato.
5. Validar idade >= 40.
6. Criar registro em talent_profiles.
7. Gerar PDF do resumo/currículo.
8. Salvar PDF no bucket `candidate-resumes`.
9. Criar registro em `resume_files` e atualizar campos de PDF em `talent_profiles`.
10. Atualizar whatsapp_sessions.status para completed.
11. Atualizar whatsapp_sessions.talent_profile_id.
12. Criar mensagem final do bot.
13. Retornar currículo e PDF criados.
```

Resposta:

```json
{
  "talentProfileId": "uuid",
  "name": "Maria Aparecida Souza",
  "age": 62,
  "isPcd": false,
  "eligibilityType": "senior_60_plus",
  "professionalSummary": "Profissional com ampla experiência em atendimento ao público, organização de loja e relacionamento com clientes.",
  "resumeText": "Maria Aparecida Souza\n\nResumo profissional...\n\nExperiência profissional...",
  "resumePdfUrl": "https://.../candidate-resumes/uuid/resume.pdf",
  "hashtags": ["#atendimento", "#varejo", "#comunicacao", "#organizacao"],
  "candidateStructuredJson": {
    "name": "Maria Aparecida Souza",
    "age": 52,
    "skills": ["atendimento ao cliente", "organização", "comunicação"]
  }
}
```

Resposta se idade menor que 40:

```json
{
  "error": "CANDIDATE_NOT_ELIGIBLE",
  "message": "Essa plataforma é voltada para oportunidades para pessoas com 60 anos ou mais e/ou pessoas com deficiência. No momento, não conseguimos concluir seu cadastro porque você não se enquadra nos critérios do MVP."
}
```

---

# 15. Endpoints de candidatos

## 14.1 Listar banco de talentos

```txt
GET /api/talent-profiles
```

Resposta:

```json
{
  "talents": [
    {
      "id": "uuid",
      "name": "Maria Aparecida Souza",
      "age": 52,
      "city": "Belo Horizonte",
      "state": "MG",
      "professionalSummary": "Profissional com ampla experiência em atendimento...",
      "hashtags": ["#atendimento", "#varejo"]
    }
  ]
}
```

---

## 14.2 Detalhar candidato

```txt
GET /api/talent-profiles/:talentProfileId
```

Resposta:

```json
{
  "id": "uuid",
  "name": "Maria Aparecida Souza",
  "age": 52,
  "city": "Belo Horizonte",
  "state": "MG",
  "professionalSummary": "Profissional com ampla experiência em atendimento...",
  "resumeText": "Maria Aparecida Souza\n\nResumo profissional...",
  "resumeJson": {},
  "candidateStructuredJson": {},
  "hashtags": ["#atendimento", "#varejo"]
}
```

---

# 16. Endpoints de match

## 15.1 Rodar match para uma vaga

```txt
POST /api/job-posts/:jobPostId/run-match
```

Backend:

```txt
1. Buscar vaga.
2. Buscar candidatos disponíveis com (age >= 60 or is_pcd = true).
3. Para cada candidato, enviar job_structured_json + candidate_structured_json para IA.
4. Receber score e justificativa.
5. Salvar ou atualizar ai_match_results.
6. Retornar matches ordenados por score.
```

Resposta:

```json
{
  "jobPostId": "uuid",
  "matches": [
    {
      "talentProfileId": "uuid",
      "name": "Maria Aparecida Souza",
      "age": 52,
      "city": "Belo Horizonte",
      "state": "MG",
      "score": 86,
      "matchStatus": "strong_match",
      "aiReason": "A candidata possui experiência em atendimento ao cliente, organização e comunicação.",
      "matchedSkills": ["atendimento ao cliente", "organização", "comunicação"],
      "missingSkills": ["experiência específica no segmento de moda"],
      "recommendation": "Recomendada para entrevista."
    }
  ]
}
```

---

## 15.2 Listar matches de uma vaga

```txt
GET /api/job-posts/:jobPostId/matches
```

Resposta:

```json
{
  "jobPostId": "uuid",
  "matches": [
    {
      "id": "uuid",
      "talentProfileId": "uuid",
      "name": "Maria Aparecida Souza",
      "score": 86,
      "matchStatus": "strong_match",
      "aiReason": "A candidata possui boa aderência com a vaga."
    }
  ]
}
```

---

# 17. Prompts usados nas chamadas de IA

## 16.1 Prompt para transcrição de áudio

Este prompt pode ser usado caso o modelo de transcrição aceite instruções.

```txt
Você é um sistema de transcrição de áudio em português brasileiro.

Transcreva fielmente o conteúdo falado pelo candidato.

Regras:
- Não invente informações.
- Não corrija dados pessoais de forma criativa.
- Preserve nomes, idades, cidades, formações e experiências profissionais.
- Se o áudio estiver confuso, transcreva o que for possível.
- Retorne apenas o texto transcrito, sem comentários adicionais.
```

---

## 16.2 Prompt para gerar JSON estruturado da vaga

```txt
Você é um assistente especialista em recrutamento e estruturação de vagas de emprego.

A partir dos dados da vaga, gere um JSON estruturado para ser usado em matching com candidatos.

Regras:
- Não invente requisitos excessivos.
- Não adicione exigências que não aparecem na vaga.
- Extraia habilidades obrigatórias e desejáveis.
- Identifique área, senioridade, modelo de trabalho, localização e palavras-chave.
- Caso alguma informação não esteja clara, use "não informado".
- Retorne apenas JSON válido.
- Não escreva explicações fora do JSON.

Entrada:
Título: {{title}}
Descrição: {{description}}
Área: {{area}}
Hashtags: {{hashtags}}

Formato obrigatório de saída:

{
  "title": "",
  "area": "",
  "seniority": "",
  "required_skills": [],
  "desired_skills": [],
  "desired_experience": [],
  "education_required": "",
  "location": {
    "city": "",
    "state": "",
    "remote": false
  },
  "work_model": "",
  "pcd_friendly": false,
  "accessibility": {
    "accepts_pcd": false,
    "required_adaptations": [],
    "physical_accessibility": "não informado",
    "assistive_technology": "não informado"
  },
  "keywords": []
}
```

---

## 16.3 Prompt para gerar currículo e JSON do candidato

```txt
Você é um assistente especialista em recrutamento inclusivo para pessoas com 60 anos ou mais e pessoas com deficiência (PCDs).

A partir das informações transcritas de uma conversa por áudio, gere:

1. Um currículo profissional em texto, claro, bonito e objetivo.
2. Um resumo profissional curto.
3. Uma lista de hashtags profissionais.
4. Um JSON estruturado para ser usado em matching com vagas.

Regras:
- Não invente experiências que o candidato não informou.
- Valorize experiências práticas, trajetória profissional, habilidades comportamentais e aprendizados.
- Use linguagem respeitosa e profissional.
- O candidato é elegível se tiver 60 anos ou mais OU se for PCD.
- Caso falte alguma informação, use "não informado".
- A idade deve ser um número inteiro quando informada.
- Não trate deficiência como limitação profissional automática.
- Valorize acessibilidade, adaptações razoáveis e habilidades transferíveis.
- Não inclua CID ou detalhes médicos sensíveis se o candidato não informou espontaneamente.
- As hashtags devem ser profissionais e úteis para busca.
- Retorne apenas JSON válido.
- Não escreva explicações fora do JSON.

Informações transcritas da conversa:

Nome:
{{ask_name}}

Idade:
{{ask_age}}

Data de nascimento:
{{ask_birth_date}}

PCD:
{{ask_is_pcd}}

Necessidades de acessibilidade/adaptações:
{{ask_accessibility_needs}}

Cidade e estado:
{{ask_city_state}}

Histórico profissional:
{{ask_professional_history}}

Objetivo atual:
{{ask_current_goal}}

Formação:
{{ask_education}}

Habilidades:
{{ask_skills}}

Formato obrigatório de saída:

{
  "name": "",
  "age": 0,
  "birth_date": "",
  "is_pcd": false,
  "disability_types": [],
  "accessibility_needs": "",
  "workplace_adaptations": "",
  "eligibility_type": "",
  "city": "",
  "state": "",
  "professional_summary": "",
  "resume_text": "",
  "resume_json": {
    "personal_info": {
      "name": "",
      "age": 0,
      "birth_date": "",
      "is_pcd": false,
      "disability_types": [],
      "accessibility_needs": "",
      "workplace_adaptations": "",
      "eligibility_type": "",
      "city": "",
      "state": ""
    },
    "summary": "",
    "experience": [],
    "education": "",
    "skills": [],
    "goals": ""
  },
  "hashtags": [],
  "candidate_structured_json": {
    "name": "",
    "age": 0,
    "is_pcd": false,
    "disability_types": [],
    "accessibility_needs": "",
    "workplace_adaptations": "",
    "eligibility_type": "",
    "location": {
      "city": "",
      "state": ""
    },
    "professional_experience": [],
    "current_goal": "",
    "education": "",
    "skills": [],
    "preferred_areas": [],
    "keywords": []
  }
}
```

---

## 16.4 Prompt para match entre vaga e candidato

```txt
Você é um assistente de matching entre vagas de emprego e candidatos 60+ e/ou PCDs.

Compare o JSON da vaga com o JSON do candidato.

Avalie:
- habilidades compatíveis;
- experiência profissional;
- área desejada;
- localização;
- formação;
- palavras-chave;
- aderência geral;
- habilidades transferíveis;
- necessidades de acessibilidade e adaptações possíveis;
- se a vaga informa abertura para PCD;

Regras:
- Não rejeite candidato apenas por não ter formação acadêmica.
- Valorize experiência prática.
- Valorize habilidades transferíveis.
- Não penalize PCD por necessidade de adaptação razoável.
- Não use deficiência como fator negativo quando a vaga puder ser executada com adaptação.
- Seja justo, objetivo e respeitoso.
- A plataforma é voltada para pessoas com 60 anos ou mais e/ou PCDs.
- Retorne apenas JSON válido.
- Não escreva explicações fora do JSON.
- O score deve ser de 0 a 100.

JSON da vaga:
{{job_structured_json}}

JSON do candidato:
{{candidate_structured_json}}

Formato obrigatório de saída:

{
  "score": 0,
  "match_status": "weak_match",
  "ai_reason": "",
  "matched_skills": [],
  "missing_skills": [],
  "recommendation": ""
}
```

Regras para `match_status`:

```txt
0 a 39: rejected
40 a 59: weak_match
60 a 79: good_match
80 a 100: strong_match
```

---

# 18. Telas do frontend

## 17.1 Home pública

Objetivo: apresentar a plataforma.

Componentes:

* Hero:

  * título: “Conectando empresas a talentos 60+ e PCDs”
  * subtítulo: “Uma plataforma para valorizar experiência, trajetória, acessibilidade e inclusão e novas oportunidades.”
* Botão: “Sou empresa”
* Botão: “Quero entrar no banco de talentos”

Ações:

```txt
Clique em “Sou empresa” → /company/login
Clique em “Quero entrar no banco de talentos” → /talent/whatsapp
```

---

## 17.2 Login/cadastro da empresa

Rota sugerida:

```txt
/company/login
```

Campos:

* nome da empresa;
* e-mail;
* CNPJ opcional;
* website opcional.

Endpoint usado:

```txt
POST /api/companies
```

Após criar empresa:

```txt
Salvar companyId no localStorage
Redirecionar para /company/dashboard
```

Para hackathon, pode evitar Supabase Auth e usar cadastro simplificado.

---

## 17.3 Dashboard da empresa

Rota sugerida:

```txt
/company/dashboard
```

Componentes:

* saudação com nome da empresa;
* card com total de vagas;
* card com total de matches;
* botão “Criar nova vaga”;
* tabela/lista de vagas.

Endpoint usado:

```txt
GET /api/companies/:companyId/job-posts
```

---

## 17.4 Criar vaga

Rota sugerida:

```txt
/company/jobs/new
```

Campos:

* título da vaga;
* descrição;
* área;
* hashtags.

Botão:

```txt
Criar vaga
```

Endpoint usado:

```txt
POST /api/job-posts
```

Estado de loading:

```txt
Criando vaga e estruturando informações com IA...
```

Após sucesso:

```txt
Redirecionar para /company/jobs/:jobPostId
```

---

## 17.5 Detalhe da vaga

Rota sugerida:

```txt
/company/jobs/:jobPostId
```

Componentes:

* título;
* descrição;
* área;
* hashtags;
* JSON estruturado da vaga;
* botão “Rodar match com banco de talentos”;
* lista de matches.

Endpoints usados:

```txt
GET /api/job-posts/:jobPostId
POST /api/job-posts/:jobPostId/run-match
GET /api/job-posts/:jobPostId/matches
```

Estado de loading:

```txt
Analisando candidatos com IA...
```

---

## 17.6 Lista de matches

Dentro da tela de detalhe da vaga.

Cada card de candidato deve mostrar:

* nome;
* idade;
* elegibilidade: 60+, PCD ou ambos;
* necessidades de acessibilidade/adaptações, quando informadas;
* cidade/estado;
* score;
* status do match;
* justificativa da IA;
* habilidades compatíveis;
* botão “Ver currículo”.
* botão “Abrir PDF”.

Exemplo visual:

```txt
Maria Aparecida Souza — 62 anos
Belo Horizonte, MG

Score: 86%
Forte compatibilidade

A candidata possui experiência em atendimento ao cliente, organização e comunicação.

Habilidades compatíveis:
- atendimento ao cliente
- organização
- comunicação

[Ver currículo]
```

Endpoint usado para abrir currículo:

```txt
GET /api/talent-profiles/:talentProfileId
```

---

## 17.7 Tela do currículo do candidato

Rota sugerida:

```txt
/company/talents/:talentProfileId
```

Componentes:

* nome;
* idade;
* elegibilidade: 60+, PCD ou ambos;
* necessidades de acessibilidade/adaptações, quando informadas;
* cidade/estado;
* resumo profissional;
* currículo gerado pela IA;
* hashtags;
* JSON estruturado opcional em accordion/debug.

Endpoint usado:

```txt
GET /api/talent-profiles/:talentProfileId
```

---

# 19. Tela do WhatsApp fake

## 18.1 Rota

```txt
/talent/whatsapp
```

## 18.2 Componentes

A tela deve simular um chat.

Componentes:

* header estilo WhatsApp;
* lista de mensagens;
* bolhas do bot;
* bolhas do candidato;
* botão de gravar áudio;
* botão de parar gravação;
* loading de upload;
* loading de transcrição;
* fallback de texto opcional;
* botão final para ver currículo.

---

## 18.3 Estados do frontend

```ts
type AudioStatus =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "completed"
  | "failed";

type ChatMessage = {
  id: string;
  sender: "bot" | "candidate" | "system";
  messageType: "text" | "audio" | "system";
  textContent?: string;
  transcription?: string;
  step?: string;
  createdAt?: string;
};
```

---

## 18.4 Fluxo inicial da tela

Ao carregar `/talent/whatsapp`:

```txt
1. Verificar se existe sessionId no localStorage.
2. Se não existir, chamar POST /api/whatsapp-sessions.
3. Salvar sessionId no localStorage.
4. Renderizar mensagem inicial do bot.
```

Endpoint:

```txt
POST /api/whatsapp-sessions
```

---

## 18.5 Fluxo de gravação de áudio

```txt
1. Usuário clica em "Gravar".
2. Frontend inicia MediaRecorder.
3. Usuário clica em "Parar".
4. Frontend cria Blob de áudio.
5. Frontend envia para POST /api/whatsapp-sessions/:sessionId/messages/audio.
6. UI mostra "Enviando áudio...".
7. UI mostra "Transcrevendo áudio...".
8. Backend retorna transcrição.
9. Frontend adiciona mensagem do candidato.
10. Frontend adiciona próxima mensagem do bot.
11. Atualiza currentStep.
```

---

## 18.6 Exemplo de envio de áudio no frontend

```ts
async function sendAudio({
  sessionId,
  audioBlob,
  currentStep
}: {
  sessionId: string;
  audioBlob: Blob;
  currentStep: string;
}) {
  const formData = new FormData();

  formData.append("audio", audioBlob, "candidate-audio.webm");
  formData.append("step", currentStep);

  const response = await fetch(
    `/api/whatsapp-sessions/${sessionId}/messages/audio`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error("Erro ao enviar áudio");
  }

  return response.json();
}
```

---

## 18.7 Quando chamar geração do currículo

Quando o `currentStep` retornar como:

```txt
generating_resume
```

O frontend deve chamar:

```txt
POST /api/whatsapp-sessions/:sessionId/generate-profile
```

Estado de loading:

```txt
Gerando seu currículo com IA...
```

Após sucesso:

```txt
Mostrar currículo gerado
Mostrar mensagem final do bot
```

---

# 20. Validações importantes

## 20.1 Validação de elegibilidade

A plataforma é exclusiva para candidatos que atendam a pelo menos um dos critérios:

```txt
idade >= 60
OU
is_pcd = true
```

Validação em três lugares:

1. Prompt da IA.
2. Backend antes de salvar candidato.
3. Constraint no banco:

```sql
constraint talent_profiles_eligibility_check check (
  (age is not null and age >= 60)
  or is_pcd = true
)
```

Mensagem de erro:

```txt
Essa plataforma é voltada para oportunidades para pessoas com 60 anos ou mais e/ou pessoas com deficiência. No momento, não conseguimos concluir seu cadastro porque você não se enquadra nos critérios do MVP.
```

Observação importante:

```txt
Não exigir laudo, CID ou documentação médica no MVP do hackathon.
Essas informações são sensíveis e podem ficar fora do MVP.
Para o hackathon, basta autodeclaração opcional de PCD e necessidades de acessibilidade.
```

---

## 20.2 Validação do áudio

No backend:

```txt
Tamanho máximo: 10 MB
Formato recomendado: audio/webm
Formatos aceitos:
- audio/webm
- audio/mpeg
- audio/mp3
- audio/wav
- audio/mp4
```

Para hackathon, priorizar apenas:

```txt
audio/webm
```

---

## 19.3 Validação da vaga

Campos obrigatórios:

```txt
companyId
title
description
area
```

Hashtags podem ser opcionais.

---

# 21. Dados mockados para teste

## 20.1 Empresa

```json
{
  "name": "Mercado Bom Preço",
  "email": "rh@mercadobompreco.com",
  "cnpj": "00.000.000/0001-00",
  "website": "https://mercadobompreco.com"
}
```

---

## 20.2 Vaga

```json
{
  "companyId": "uuid",
  "title": "Atendente de Loja",
  "description": "Atendimento ao cliente, organização de prateleiras, suporte nas vendas e auxílio no caixa.",
  "area": "Atendimento",
  "hashtags": ["#atendimento", "#varejo", "#cliente", "#loja"]
}
```

---

## 20.3 Respostas simuladas do candidato

```json
{
  "ask_name": "Maria Aparecida Souza",
  "ask_age": "Tenho 62 anos",
  "ask_birth_date": "Nasci em 12 de abril de 1964",
  "ask_is_pcd": "Não sou PCD",
  "ask_accessibility_needs": "Não preciso de adaptações específicas",
  "ask_city_state": "Moro em Belo Horizonte, Minas Gerais",
  "ask_professional_history": "Trabalhei por muitos anos como atendente de loja, ajudei no caixa, organizei produtos e atendi clientes.",
  "ask_current_goal": "Estou buscando uma vaga em atendimento, recepção ou loja.",
  "ask_education": "Tenho ensino médio completo e alguns cursos rápidos de atendimento.",
  "ask_skills": "Sou comunicativa, organizada, pontual e gosto de lidar com pessoas."
}
```

---

# 22. Ordem de implementação recomendada

## 21.1 Backend primeiro

1. Criar tabelas no Supabase.
2. Criar bucket `candidate-audios`.
3. Criar endpoint `/api/health`.
4. Criar endpoints de empresa.
5. Criar endpoints de vaga.
6. Criar endpoint de sessão WhatsApp.
7. Criar endpoint de upload de áudio.
8. Integrar transcrição.
9. Criar serviço de geração de PDF.
10. Criar bucket `candidate-resumes`.
11. Criar endpoint de geração de perfil + PDF.
12. Criar endpoint de match.

---

## 21.2 Frontend em paralelo

1. Criar home.
2. Criar dashboard da empresa.
3. Criar formulário de vaga.
4. Criar tela de detalhe da vaga.
5. Criar tela WhatsApp fake.
6. Implementar gravação de áudio.
7. Implementar tela de currículo.
8. Implementar tela/lista de matches.

---

# 23. Priorização realista para hackathon de 3 horas

Como o tempo é curto, a prioridade deve ser:

## Prioridade 1

* Banco Supabase criado.
* Tela WhatsApp fake.
* Gravação e envio real de áudio.
* Transcrição funcionando.
* Currículo gerado por IA.
* PDF do resumo/currículo gerado e salvo no Storage.
* Candidato salvo no banco.

## Prioridade 2

* Empresa cria vaga.
* IA gera JSON da vaga.
* Vaga salva no banco.

## Prioridade 3

* Rodar match IA.
* Mostrar candidatos compatíveis.

## Prioridade 4

* Melhorar UI.
* Melhorar dashboard.
* Mostrar JSON em modo debug.
* Adicionar filtros.

---

# 24. Contrato entre frontend e backend

## Frontend precisa receber do backend

Para WhatsApp fake:

```json
{
  "sessionId": "uuid",
  "currentStep": "ask_name",
  "botMessage": "Me diga seu nome completo, por favor."
}
```

Para áudio:

```json
{
  "transcriptionText": "Eu trabalhei por muitos anos como atendente...",
  "currentStep": "ask_current_goal",
  "botMessage": "Que tipo de trabalho você está buscando atualmente?"
}
```

Para currículo:

```json
{
  "talentProfileId": "uuid",
  "name": "Maria Aparecida Souza",
  "resumeText": "Currículo completo...",
  "resumePdfUrl": "https://.../candidate-resumes/uuid/resume.pdf",
  "hashtags": ["#atendimento", "#varejo"]
}
```

Para vaga:

```json
{
  "id": "uuid",
  "title": "Atendente de Loja",
  "jobStructuredJson": {}
}
```

Para match:

```json
{
  "matches": [
    {
      "talentProfileId": "uuid",
      "name": "Maria Aparecida Souza",
      "score": 86,
      "matchStatus": "strong_match",
      "aiReason": "Boa compatibilidade com a vaga."
    }
  ]
}
```

---

# 25. Resumo final

O MVP deve funcionar de ponta a ponta:

```txt
Empresa cria vaga inclusiva
↓
IA estrutura vaga em JSON com acessibilidade/PCD
↓
Candidato 60+ e/ou PCD responde por áudio ou texto no WhatsApp fake
↓
Backend salva áudio no Supabase Storage
↓
IA transcreve áudio
↓
IA gera currículo, PDF e JSON do candidato
↓
Candidato elegível entra no banco de talentos
↓
IA compara JSON da vaga com JSON do candidato
↓
Empresa vê os melhores matches e seus currículos
```

A modelagem é simples, mas suficiente para uma entrega funcional em poucas horas, mantendo o áudio e a transcrição como partes reais do produto, e não apenas mock visual.