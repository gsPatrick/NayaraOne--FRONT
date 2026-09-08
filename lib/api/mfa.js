// Chamadas ao módulo de MFA (TOTP) próprio da API real.
// Contrato confirmado em NayaraOne--API/src/features/users/mfa.controller.js + mfa.routes.

import { apiFetch } from "@/lib/api/client";

// Gera um novo segredo TOTP (não habilita MFA ainda) — retorna { otpauthUri }.
export async function setupMfa() {
  return apiFetch("/users/me/mfa/setup", { method: "POST" });
}

// Confirma o primeiro código TOTP e habilita o MFA — retorna { recoveryCodes } em texto
// plano, exibidos apenas nesta resposta.
export async function confirmMfa(code) {
  return apiFetch("/users/me/mfa/confirm", { method: "POST", body: { code } });
}

// Verifica um código TOTP (ou código de recuperação) e abre a janela de "MFA recente"
// (step-up) usada pelas ações sensíveis do Financeiro.
export async function verifyMfa(code) {
  return apiFetch("/users/me/mfa/verify", { method: "POST", body: { code } });
}

// Desabilita o MFA — exige um código TOTP atual válido.
export async function disableMfa(code) {
  return apiFetch("/users/me/mfa/disable", { method: "POST", body: { code } });
}
