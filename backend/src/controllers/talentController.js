import { asyncHandler } from '../utils/asyncHandler.js';
import { getTalentProfile, listTalentProfiles } from '../services/profileService.js';

export const list = asyncHandler(async (req, res) => {
  const talentProfiles = await listTalentProfiles();
  res.json({ talentProfiles });
});

export const getById = asyncHandler(async (req, res) => {
  const profile = await getTalentProfile(req.params.talentProfileId);
  res.json(profile);
});
