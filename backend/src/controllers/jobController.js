import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createJobPost,
  deleteJobPost,
  getJobPost,
  listJobPosts,
  updateJobPost,
} from '../services/jobService.js';
import { listMatchesForJob, runMatchForJob } from '../services/matchService.js';

export const create = asyncHandler(async (req, res) => {
  const jobPost = await createJobPost(req.body);
  res.status(201).json(jobPost);
});

export const list = asyncHandler(async (req, res) => {
  const jobPosts = await listJobPosts({
    companyId: req.query.companyId,
    status: req.query.status,
  });
  res.json({ jobPosts });
});

export const getById = asyncHandler(async (req, res) => {
  const jobPost = await getJobPost(req.params.jobPostId);
  res.json(jobPost);
});

export const update = asyncHandler(async (req, res) => {
  const jobPost = await updateJobPost(req.params.jobPostId, req.body);
  res.json(jobPost);
});

export const remove = asyncHandler(async (req, res) => {
  await deleteJobPost(req.params.jobPostId);
  res.status(204).send();
});

export const runMatch = asyncHandler(async (req, res) => {
  const result = await runMatchForJob(req.params.jobPostId);
  res.json(result);
});

export const listMatches = asyncHandler(async (req, res) => {
  const result = await listMatchesForJob(req.params.jobPostId);
  res.json(result);
});
