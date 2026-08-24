// Checagem de permissão real no front — lê o array `permissions` gravado na sessão em
// POST /auth/login (as mesmas strings de código usadas por requirePermission() na API,
// ex. "properties:read"). O front nunca decide sozinho o que o usuário pode fazer: só
// espelha visualmente (esconde nav/botão) o que a API já vai aceitar ou recusar de qualquer
// forma — a fonte de verdade da autorização continua sendo sempre o backend.

import { getSession } from "@/lib/auth/session";

export function getPermissions() {
  return getSession()?.permissions || [];
}

export function hasPermission(code) {
  if (!code) return true;
  return getPermissions().includes(code);
}

export function hasAnyPermission(codes = []) {
  if (!codes || codes.length === 0) return true;
  const granted = getPermissions();
  return codes.some((code) => granted.includes(code));
}

export function hasAllPermissions(codes = []) {
  if (!codes || codes.length === 0) return true;
  const granted = getPermissions();
  return codes.every((code) => granted.includes(code));
}
