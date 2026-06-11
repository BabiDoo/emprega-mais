import { env, requireGeminiEnv } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { clampNumber, parseJsonFromText } from '../utils/json.js';

const GEMINI_MODEL = 'gemini-3.5-flash';

let clientPromise = null;

async function getClient() {
  requireGeminiEnv();

  if (!clientPromise) {
    clientPromise = import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({
      apiKey: env.geminiApiKey,
    }));
  }

  return clientPromise;
}

async function generateContent(contents) {
  const ai = await getClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AppError('Gemini returned an empty response', 502);
  }

  return text.trim();
}

export async function transcribeAudioWithGemini({ buffer, mimeType }) {
  const base64Audio = buffer.toString('base64');
  const prompt = [
    'Voce e um sistema de transcricao de audio em portugues brasileiro.',
    'Transcreva fielmente o conteudo falado pelo candidato.',
    'Nao invente informacoes e preserve nomes, idades, cidades, formacoes e experiencias.',
    'Retorne apenas o texto transcrito, sem comentarios adicionais.',
  ].join(' ');

  const text = await generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
  ]);

  return {
    text,
    raw: { provider: 'google-gemini', model: GEMINI_MODEL, text },
  };
}

export async function structureJobWithGemini({ title, description, area, hashtags }) {
  const prompt = `
Voce e um assistente especialista em recrutamento e estruturacao de vagas inclusivas.
Gere apenas JSON valido para matching entre vagas e candidatos 60+ e/ou PCD.
Nao invente requisitos que nao aparecem na vaga.

Entrada:
Titulo: ${title}
Descricao: ${description}
Area: ${area}
Hashtags: ${(hashtags || []).join(', ')}

Formato obrigatorio:
{
  "title": "",
  "area": "",
  "seniority": "",
  "required_skills": [],
  "desired_skills": [],
  "desired_experience": [],
  "education_required": "",
  "location": { "city": "", "state": "", "remote": false },
  "work_model": "",
  "pcd_friendly": false,
  "accessibility": {
    "accepts_pcd": false,
    "required_adaptations": [],
    "physical_accessibility": "nao informado",
    "assistive_technology": "nao informado"
  },
  "keywords": []
}
`;

  const text = await generateContent(prompt);
  return parseJsonFromText(text);
}

export async function generateCandidateProfileWithGemini(conversationByStep) {
  const prompt = `
Voce e um assistente especialista em recrutamento inclusivo para pessoas com 60 anos ou mais e PCDs.
A partir das transcricoes de uma conversa por audio, gere curriculo, resumo, hashtags e JSON estruturado.
Nao invente experiencias que o candidato nao informou.
O candidato e elegivel se idade >= 60 OU is_pcd = true.
Retorne apenas JSON valido.

Transcricoes:
Nome: ${conversationByStep.ask_name || ''}
Idade: ${conversationByStep.ask_age || ''}
Data de nascimento: ${conversationByStep.ask_birth_date || ''}
PCD: ${conversationByStep.ask_is_pcd || ''}
Acessibilidade/adaptacoes: ${conversationByStep.ask_accessibility_needs || ''}
Cidade e estado: ${conversationByStep.ask_city_state || ''}
Historico profissional: ${conversationByStep.ask_professional_history || ''}
Objetivo atual: ${conversationByStep.ask_current_goal || ''}
Formacao: ${conversationByStep.ask_education || ''}
Habilidades: ${conversationByStep.ask_skills || ''}

Formato obrigatorio:
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
    "personal_info": {},
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
    "location": { "city": "", "state": "" },
    "professional_experience": [],
    "current_goal": "",
    "education": "",
    "skills": [],
    "preferred_areas": [],
    "keywords": []
  }
}
`;

  const text = await generateContent(prompt);
  return parseJsonFromText(text);
}

export async function matchJobAndCandidateWithGemini({ jobStructuredJson, candidateStructuredJson }) {
  const prompt = `
Voce e um motor de matching entre vagas e candidatos 60+ e/ou PCDs.
Compare a vaga com o candidato considerando habilidades, experiencia, area, localizacao, formacao,
palavras-chave, acessibilidade, adaptacoes razoaveis e abertura para PCD.
Nao penalize PCD por necessidade de adaptacao razoavel.
Retorne apenas JSON valido com score de 0 a 100.

JSON da vaga:
${JSON.stringify(jobStructuredJson, null, 2)}

JSON do candidato:
${JSON.stringify(candidateStructuredJson, null, 2)}

Formato:
{
  "score": 0,
  "match_status": "weak_match",
  "ai_reason": "",
  "matched_skills": [],
  "missing_skills": [],
  "recommendation": ""
}
`;

  const text = await generateContent(prompt);
  const parsed = parseJsonFromText(text);
  const score = clampNumber(parsed.score, 0, 100, 0);

  return {
    ...parsed,
    score,
    match_status: normalizeMatchStatus(parsed.match_status, score),
  };
}

function normalizeMatchStatus(status, score) {
  const validStatuses = new Set(['rejected', 'weak_match', 'good_match', 'strong_match']);
  if (validStatuses.has(status)) return status;
  if (score >= 80) return 'strong_match';
  if (score >= 60) return 'good_match';
  if (score >= 40) return 'weak_match';
  return 'rejected';
}
