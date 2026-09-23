// Chamadas ao módulo de Configurações (Settings) por empresa/tenant da API real.
// Contrato: GET /settings?prefix=... , GET /settings/:key , PUT /settings/:key com { value }.
// Tenant é resolvido no backend via RLS — aqui só passamos a key.
// Exige permissão settings:read (GET) / settings:update (PUT); sem ela a API responde 403.

import { apiFetch } from "@/lib/api/client";

export async function listSettings(prefix) {
  const query = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  return apiFetch(`/settings${query}`);
}

export async function getSetting(key) {
  return apiFetch(`/settings/${encodeURIComponent(key)}`);
}

export async function updateSetting(key, value) {
  return apiFetch(`/settings/${encodeURIComponent(key)}`, { method: "PUT", body: { value } });
}

// Testa uma chamada real e barata ao provedor ativo (Clicksign/ZapSign/FGV) pra saber se o
// token configurado de fato funciona — nunca devolve o segredo em texto claro, só
// { configured, connected, reason?, checkedAt } por integração.
export async function getIntegrationsStatus() {
  return apiFetch(`/settings/integrations/status`);
}
