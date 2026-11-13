// Chamadas à NAY (módulo de IA) da API real.
// Contrato confirmado em NayaraOne--API/src/features/ai/ (runApi/runApi.handler.js, orchestrator/runs/runs.routes.js,
// recommendations/recommendations.routes.js e approval/approval.routes.js).

import { apiFetch } from "@/lib/api/client";

/**
 * POST /ai/runs. Devolve { httpStatus, data }: 200 traz a resposta completa; 202 traz só { runId, status: "RUNNING" } (consulta longa,
 * o cliente acompanha por GET /ai/runs/:id).
 */
export async function createAiRun(body) {
  const out = await apiFetch("/ai/runs", { method: "POST", body, envelope: true });
  return { httpStatus: out.httpStatus, data: out.data };
}

/** GET /ai/runs/:id — estado do run, resumo da saída e fontes. */
export async function getAiRun(runId) {
  return apiFetch(`/ai/runs/${runId}`);
}

/** GET /ai/recommendations com paginação. Devolve { items, page, limit, total }. */
export async function listAiRecommendations({ status, page = 1, limit = 20 } = {}) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  query.set("page", String(page));
  query.set("limit", String(limit));
  const out = await apiFetch(`/ai/recommendations?${query.toString()}`, { envelope: true });
  const pagination = out.pagination || {};
  return {
    items: Array.isArray(out.data) ? out.data : [],
    page: pagination.page || page,
    limit: pagination.limit || limit,
    total: Number.isFinite(pagination.total) ? pagination.total : null,
  };
}

/** POST /ai/recommendations/:id/accept com corpo vazio: marca a recomendação informativa como vista (não executa nada). */
export async function acceptAiRecommendation(id) {
  return apiFetch(`/ai/recommendations/${id}/accept`, { method: "POST", body: {} });
}
