// Chamadas ao módulo de autenticação da API real (POST /auth/login, /auth/refresh, /auth/logout).
// Contrato confirmado em NayaraOne--API/src/features/auth/auth.service.js.

import { apiFetch } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

export async function loginRequest(email, password, companyId) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password, ...(companyId ? { companyId } : {}) },
    skipAuth: true,
  });
}

export async function refreshRequest() {
  const session = getSession();
  if (!session?.refreshToken) {
    throw new Error("Nenhum refresh token disponível.");
  }
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: { refreshToken: session.refreshToken },
    skipAuth: true,
  });
}

export async function logoutRequest() {
  const session = getSession();
  if (!session?.refreshToken) return { revoked: false };
  return apiFetch("/auth/logout", {
    method: "POST",
    body: { refreshToken: session.refreshToken },
    skipRefresh: true,
  });
}
