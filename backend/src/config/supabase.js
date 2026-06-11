import { createClient } from '@supabase/supabase-js';
import { env, requireSupabaseEnv } from './env.js';

requireSupabaseEnv();

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
