import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false });
}

export const env = {
  port: Number(process.env.PORT || 3333),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  audioBucket: process.env.AUDIO_BUCKET || 'candidate-audios',
  resumeBucket: process.env.RESUME_BUCKET || 'candidate-resumes',
  frontendUrl: process.env.FRONTEND_URL || '*',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
};

export function requireSupabaseEnv() {
  const missing = [];

  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
  }
}

export function requireGeminiEnv() {
  if (!env.geminiApiKey) {
    throw new Error('Missing GEMINI_API_KEY or OPENAI_API_KEY for Gemini API calls');
  }
}
