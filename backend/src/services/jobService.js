import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { asArray } from '../utils/json.js';
import { structureJobWithGemini } from './geminiService.js';

function normalizeHashtags(hashtags) {
  return asArray(hashtags).map((hashtag) => {
    const value = String(hashtag).trim();
    return value.startsWith('#') ? value : `#${value}`;
  }).filter((hashtag) => hashtag.length > 1);
}

function validateJobPayload(payload) {
  if (!payload?.companyId && !payload?.company_id) throw new AppError('companyId is required', 400);
  if (!payload?.title) throw new AppError('title is required', 400);
  if (!payload?.description) throw new AppError('description is required', 400);
  if (!payload?.area) throw new AppError('area is required', 400);
}

function fallbackJobStructure({ title, description, area, hashtags }) {
  const keywords = [
    ...normalizeHashtags(hashtags).map((item) => item.replace('#', '')),
    ...String(title).split(/\s+/),
    ...String(area).split(/\s+/),
  ].map((item) => item.toLowerCase()).filter(Boolean);

  return {
    title,
    area,
    seniority: 'nao informado',
    required_skills: [],
    desired_skills: [],
    desired_experience: [],
    education_required: 'nao informado',
    location: { city: 'nao informado', state: 'nao informado', remote: false },
    work_model: 'nao informado',
    pcd_friendly: true,
    accessibility: {
      accepts_pcd: true,
      required_adaptations: [],
      physical_accessibility: 'nao informado',
      assistive_technology: 'nao informado',
    },
    keywords: [...new Set(keywords)],
    source_description: description,
  };
}

export async function createJobPost(payload) {
  validateJobPayload(payload);

  const hashtags = normalizeHashtags(payload.hashtags);
  let jobStructuredJson;

  try {
    jobStructuredJson = await structureJobWithGemini({
      title: payload.title,
      description: payload.description,
      area: payload.area,
      hashtags,
    });
  } catch (error) {
    jobStructuredJson = {
      ...fallbackJobStructure({
        title: payload.title,
        description: payload.description,
        area: payload.area,
        hashtags,
      }),
      ai_warning: error.message,
    };
  }

  const row = {
    company_id: payload.companyId || payload.company_id,
    title: payload.title,
    description: payload.description,
    area: payload.area,
    hashtags,
    job_structured_json: jobStructuredJson,
    status: payload.status || 'active',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('job_posts')
    .insert(row)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function listJobPosts(filters = {}) {
  let query = supabase
    .from('job_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function getJobPost(jobPostId) {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('id', jobPostId)
    .single();

  if (error) throw new AppError('Job post not found', 404);
  return data;
}

export async function updateJobPost(jobPostId, payload) {
  const row = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined) row.title = payload.title;
  if (payload.description !== undefined) row.description = payload.description;
  if (payload.area !== undefined) row.area = payload.area;
  if (payload.hashtags !== undefined) row.hashtags = normalizeHashtags(payload.hashtags);
  if (payload.status !== undefined) row.status = payload.status;

  if (row.title || row.description || row.area || row.hashtags) {
    const current = await getJobPost(jobPostId);
    const title = row.title || current.title;
    const description = row.description || current.description;
    const area = row.area || current.area;
    const hashtags = row.hashtags || current.hashtags;

    try {
      row.job_structured_json = await structureJobWithGemini({ title, description, area, hashtags });
    } catch (error) {
      row.job_structured_json = {
        ...fallbackJobStructure({ title, description, area, hashtags }),
        ai_warning: error.message,
      };
    }
  }

  const { data, error } = await supabase
    .from('job_posts')
    .update(row)
    .eq('id', jobPostId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function deleteJobPost(jobPostId) {
  const { error } = await supabase
    .from('job_posts')
    .delete()
    .eq('id', jobPostId);

  if (error) throw new AppError(error.message, 400);
}
