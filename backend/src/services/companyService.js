import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

function toCompanyRow(payload) {
  return {
    auth_user_id: payload.authUserId || payload.auth_user_id || null,
    name: payload.name,
    email: payload.email,
    cnpj: payload.cnpj || null,
    website: payload.website || null,
    updated_at: new Date().toISOString(),
  };
}

function validateCompanyPayload(payload) {
  if (!payload?.name) throw new AppError('Company name is required', 400);
  if (!payload?.email) throw new AppError('Company email is required', 400);
}

export async function createCompany(payload) {
  validateCompanyPayload(payload);

  const { data, error } = await supabase
    .from('companies')
    .insert(toCompanyRow(payload))
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function listCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 400);
  return data;
}

export async function getCompany(companyId) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) throw new AppError('Company not found', 404);
  return data;
}

export async function updateCompany(companyId, payload) {
  const row = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) row.name = payload.name;
  if (payload.email !== undefined) row.email = payload.email;
  if (payload.cnpj !== undefined) row.cnpj = payload.cnpj || null;
  if (payload.website !== undefined) row.website = payload.website || null;

  const { data, error } = await supabase
    .from('companies')
    .update(row)
    .eq('id', companyId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  return data;
}
