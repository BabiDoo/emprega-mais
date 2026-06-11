import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { asArray, clampNumber } from '../utils/json.js';
import { matchJobAndCandidateWithGemini } from './geminiService.js';
import { getJobPost } from './jobService.js';
import { createSignedUrl, storageBuckets } from './storageService.js';

function normalizeMatch(aiMatch) {
  const score = clampNumber(aiMatch.score, 0, 100, 0);
  const status = aiMatch.match_status
    || (score >= 80 ? 'strong_match' : score >= 60 ? 'good_match' : score >= 40 ? 'weak_match' : 'rejected');

  return {
    score,
    match_status: status,
    ai_reason: aiMatch.ai_reason || '',
    matched_skills: asArray(aiMatch.matched_skills),
    missing_skills: asArray(aiMatch.missing_skills),
    recommendation: aiMatch.recommendation || '',
    raw_ai_response: aiMatch,
  };
}

async function getEligibleTalentProfiles() {
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .eq('status', 'available')
    .or('age.gte.60,is_pcd.eq.true');

  if (error) throw new AppError(error.message, 400);
  return data;
}

async function upsertMatch(row) {
  const { data, error } = await supabase
    .from('ai_match_results')
    .upsert(row, { onConflict: 'job_post_id,talent_profile_id' })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

function formatMatchResult(match, talentProfile) {
  return {
    id: match.id,
    talentProfileId: talentProfile.id,
    name: talentProfile.name,
    age: talentProfile.age,
    city: talentProfile.city,
    state: talentProfile.state,
    eligibilityType: talentProfile.eligibility_type,
    accessibilityNeeds: talentProfile.accessibility_needs,
    workplaceAdaptations: talentProfile.workplace_adaptations,
    resumePdfUrl: talentProfile.resume_pdf_public_url || null,
    score: match.score,
    matchStatus: match.match_status,
    aiReason: match.ai_reason,
    matchedSkills: match.matched_skills,
    missingSkills: match.missing_skills,
    recommendation: match.recommendation,
  };
}

export async function runMatchForJob(jobPostId) {
  const jobPost = await getJobPost(jobPostId);
  const candidates = await getEligibleTalentProfiles();

  const matches = [];

  for (const candidate of candidates) {
    const aiMatch = await matchJobAndCandidateWithGemini({
      jobStructuredJson: jobPost.job_structured_json,
      candidateStructuredJson: candidate.candidate_structured_json || candidate.resume_json,
    });

    const normalized = normalizeMatch(aiMatch);
    const saved = await upsertMatch({
      job_post_id: jobPost.id,
      talent_profile_id: candidate.id,
      ...normalized,
      updated_at: new Date().toISOString(),
    });

    matches.push(formatMatchResult(saved, candidate));
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    jobPostId,
    matches,
  };
}

export async function listMatchesForJob(jobPostId) {
  const { data, error } = await supabase
    .from('ai_match_results')
    .select(`
      *,
      talent_profiles (
        id,
        name,
        age,
        city,
        state,
        eligibility_type,
        accessibility_needs,
        workplace_adaptations,
        resume_pdf_bucket,
        resume_pdf_path,
        resume_pdf_public_url
      )
    `)
    .eq('job_post_id', jobPostId)
    .order('score', { ascending: false });

  if (error) throw new AppError(error.message, 400);

  const matches = await Promise.all((data || []).map(async (match) => {
    const talentProfile = match.talent_profiles || {};

    if (talentProfile.resume_pdf_path) {
      talentProfile.resume_pdf_public_url = await createSignedUrl({
        bucket: talentProfile.resume_pdf_bucket || storageBuckets.resume,
        path: talentProfile.resume_pdf_path,
      });
    }

    return formatMatchResult(match, talentProfile);
  }));

  return {
    jobPostId,
    matches,
  };
}
