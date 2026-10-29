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
