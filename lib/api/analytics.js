// Chamadas ao BI (painéis e detalhe de indicador) da API real.
// Contrato confirmado em NayaraOne--API/src/features/analytics/ (dashboards/dashboard.routes.js, metrics/drilldown.routes.js).
// O Front só exibe: todo valor, formato, alerta e rótulo de natureza já vêm prontos do servidor.

import { apiFetch } from "@/lib/api/client";

/** Painel completo (todos os widgets numa resposta). asOf opcional (AAAA-MM-DD, calendário de São Paulo). */
export async function getDashboard(code, { asOf } = {}) {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return apiFetch(`/analytics/dashboards/${encodeURIComponent(code)}${query}`);
}

/**
 * Detalhe (drill-down) de um indicador crítico, com o item de `sourceRefs` do número (filtro assinado).
 * Sem permissão de detalhe a API responde 403 ANALYTICS_DRILLDOWN_FORBIDDEN com `details.aggregate` (o agregado permitido).
 */
export async function getMetricDrilldown(metricCode, sourceRef, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    filter: JSON.stringify(sourceRef.filter),
    filterHash: sourceRef.filterHash,
    filterSignature: sourceRef.filterSignature,
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiFetch(`/analytics/metrics/${encodeURIComponent(metricCode)}/drilldown?${params.toString()}`);
}

/**
 * Indicador pelo endpoint de métrica. Com `groupId`, o consolidado do grupo calculado na leitura (M9-D625): `value` e `formatted`, `byCompany`, `eliminations`,
 * `consolidatedStatus` e `warnings`. Sem `analytics:read:group` a API responde 403 ANALYTICS_GROUP_SCOPE_FORBIDDEN.
 */
export async function getMetric(metricCode, { groupId, asOf } = {}) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (asOf) params.set("asOf", asOf);
  const query = params.toString();
  return apiFetch(`/analytics/metrics/${encodeURIComponent(metricCode)}${query ? `?${query}` : ""}`);
}

/**
 * Centro de Comando da Diretoria (M9-D685): os seis blocos, o briefing e o contador de itens ocultos numa só resposta. `block` pede um bloco por inteiro ("Ver todos").
 * O Front só desenha o que a API devolveu: nenhum item, total ou ordem é calculado aqui.
 */
export async function getCommandCenter({ block, asOf } = {}) {
  const params = new URLSearchParams();
  if (block) params.set("bloco", block);
  if (asOf) params.set("asOf", asOf);
  const query = params.toString();
  return apiFetch(`/analytics/dashboards/command_center${query ? `?${query}` : ""}`);
}
