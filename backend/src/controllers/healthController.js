import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthCheck = asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: env.aiProvider,
  });
});

export const supabaseHealthCheck = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  res.status(error ? 503 : 200).json({
    status: error ? 'unavailable' : 'ok',
    supabase: error ? error.message : 'connected',
  });
});
