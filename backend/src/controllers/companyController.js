import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createCompany,
  getCompany,
  listCompanies,
  updateCompany,
} from '../services/companyService.js';
import { listJobPosts } from '../services/jobService.js';

export const create = asyncHandler(async (req, res) => {
  const company = await createCompany(req.body);
  res.status(201).json(company);
});

export const list = asyncHandler(async (req, res) => {
  const companies = await listCompanies();
  res.json({ companies });
});

export const getById = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.companyId);
  res.json(company);
});

export const update = asyncHandler(async (req, res) => {
  const company = await updateCompany(req.params.companyId, req.body);
  res.json(company);
});

export const listCompanyJobPosts = asyncHandler(async (req, res) => {
  const jobPosts = await listJobPosts({ companyId: req.params.companyId });
  res.json({ companyId: req.params.companyId, jobPosts });
});
