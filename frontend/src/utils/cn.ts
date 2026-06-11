import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const CANDIDATE_TYPE_LABELS: Record<string, string> = {
  '60+': 'Pessoa 60+',
  PCD_FISICA: 'PCD — Deficiência Física',
  PCD_VISUAL: 'PCD — Deficiência Visual',
  PCD_AUDITIVA: 'PCD — Deficiência Auditiva',
  PCD_INTELECTUAL: 'PCD — Deficiência Intelectual',
  PCD_AUTISMO: 'PCD — Transtorno do Espectro Autista',
};
