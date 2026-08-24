// Sessão mockada — alinhado a core.user_memberships (Caderno Técnico).
// Em produção o company_id ativo vem do JWT, resolvido no login (resolveActiveTenant).
// Aqui simulamos o mesmo contrato: usuário fixo com múltiplos vínculos para demonstrar a troca de empresa.

import { USERS } from "./users";
import { COMPANIES } from "./companies";

export const CURRENT_USER_ID = "user-8";
export const ACTIVE_COMPANY_STORAGE_KEY = "nayaraone.activeCompanyId";

export function getCurrentUser() {
  return USERS.find((u) => u.id === CURRENT_USER_ID) || USERS[0];
}

export function getUserMemberships(user) {
  return (user?.memberships || [])
    .map((m) => ({ role: m.role, company: COMPANIES.find((c) => c.legalName === m.company) }))
    .filter((m) => m.company);
}
