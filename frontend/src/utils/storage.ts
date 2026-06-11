const KEYS = {
  COMPANY_ID: 'emprega_company_id',
  SESSION_ID: 'emprega_session_id',
  ROLE: 'emprega_role',
};

export const storage = {
  getCompanyId: () => localStorage.getItem(KEYS.COMPANY_ID),
  setCompanyId: (id: string) => localStorage.setItem(KEYS.COMPANY_ID, id),
  clearCompanyId: () => localStorage.removeItem(KEYS.COMPANY_ID),

  getSessionId: () => localStorage.getItem(KEYS.SESSION_ID),
  setSessionId: (id: string) => localStorage.setItem(KEYS.SESSION_ID, id),
  clearSessionId: () => localStorage.removeItem(KEYS.SESSION_ID),

  getRole: () => localStorage.getItem(KEYS.ROLE) as 'company' | 'candidate' | null,
  setRole: (role: 'company' | 'candidate') => localStorage.setItem(KEYS.ROLE, role),
  clearRole: () => localStorage.removeItem(KEYS.ROLE),

  clearAll: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
