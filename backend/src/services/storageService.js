import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

export async function uploadBufferToStorage({ bucket, path, buffer, contentType, upsert = true }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert,
    });

  if (error) {
    throw new AppError(`Supabase storage upload failed: ${error.message}`, 502);
  }

  return data;
}

export function getPublicUrl({ bucket, path }) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function createSignedUrl({ bucket, path, expiresIn = 60 * 60 * 24 * 7 }) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    throw new AppError(`Supabase signed URL failed: ${error.message}`, 502);
  }

  return data.signedUrl;
}

export const storageBuckets = {
  audio: env.audioBucket,
  resume: env.resumeBucket,
};
