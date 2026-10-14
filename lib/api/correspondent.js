// Chamadas ao módulo de Correspondente Bancário/Financiamentos (Marco 8) da API real.
// Contrato confirmado em NayaraOne--API/src/features/correspondent/cases/financingCases.service.js.

import { apiFetch } from "@/lib/api/client";

export async function listFinancingCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/financing-cases${suffix}`);
}

export async function getFinancingCase(id) {
  return apiFetch(`/financing-cases/${id}`);
}

export async function createFinancingCase(payload) {
  return apiFetch("/financing-cases", { method: "POST", body: payload });
}

// --- Fase 2: requirements (checklist de documentos) e documentos enviados ---

export async function listCaseRequirements(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/requirements`);
}

export async function createCaseRequirement(financingCaseId, payload) {
  return apiFetch(`/financing-cases/${financingCaseId}/requirements`, { method: "POST", body: payload });
}

// Envia uma nova versão de documento pro requirement — backend sempre cria uma linha nova
// (nunca sobrescreve a versão anterior, ver caseDocuments.service.js).
export async function uploadCaseDocument(financingCaseId, { requirementId, fileId }) {
  return apiFetch(`/financing-cases/${financingCaseId}/documents`, { method: "POST", body: { requirementId, fileId } });
}

// --- Fase 3: simulações (cada chamada cria uma linha nova — nunca sobrescreve a anterior) ---

export async function listSimulations(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/simulations`);
}

export async function createSimulation(financingCaseId, { amount, termMonths }) {
  return apiFetch(`/financing-cases/${financingCaseId}/simulations`, { method: "POST", body: { amount, termMonths } });
}

// --- Fase 5: submissão ao provider (idempotente no backend — reenviar com os mesmos dados
// nunca cria uma segunda submissão) ---

export async function listSubmissions(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/submissions`);
}

export async function submitFinancingCase(financingCaseId, payload = {}) {
  return apiFetch(`/financing-cases/${financingCaseId}/submissions`, { method: "POST", body: payload });
}

export async function acknowledgeUnknownSubmission(financingCaseId, submissionId) {
  return apiFetch(`/financing-cases/${financingCaseId}/submissions/${submissionId}/acknowledge-unknown`, { method: "POST" });
}

// --- Fase 6: status consolidado + histórico (append-only, nunca perde o status bruto original) ---

export async function getFinancingCaseStatus(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/status`);
}

// --- Fase 7: avaliação do imóvel (só informativa — nunca altera o preço do imóvel/oferta) ---

export async function listAppraisals(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/appraisals`);
}

export async function createAppraisal(financingCaseId, payload = {}) {
  return apiFetch(`/financing-cases/${financingCaseId}/appraisals`, { method: "POST", body: payload });
}
