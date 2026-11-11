// Chamadas de Obras criadas na verificação independente do Marco 6 (API: src/features/construction/
// constructionConfig.controller.js e construction.routes.js): tipos de obra e checklist por tipo/etapa,
// alçadas (permissão própria + MFA recente), parâmetros de Obras e revisões do orçamento aprovado.
import { apiFetch } from "@/lib/api/client";

// --- Tipos de obra e checklist por tipo/etapa (Caderno §9) ---
export async function listProjectTypes() {
  return apiFetch("/construction/project-types");
}
export async function createProjectType(payload) {
  return apiFetch("/construction/project-types", { method: "POST", body: payload });
}
export async function updateProjectType(id, payload) {
  return apiFetch(`/construction/project-types/${id}`, { method: "PATCH", body: payload });
}
export async function listChecklistTemplates(projectTypeId) {
  const suffix = projectTypeId ? `?projectTypeId=${encodeURIComponent(projectTypeId)}` : "";
  return apiFetch(`/construction/checklist-templates${suffix}`);
}
export async function createChecklistTemplate(payload) {
  return apiFetch("/construction/checklist-templates", { method: "POST", body: payload });
}
export async function updateChecklistTemplate(id, payload) {
  return apiFetch(`/construction/checklist-templates/${id}`, { method: "PATCH", body: payload });
}
export async function applyProjectChecklist(projectId) {
  return apiFetch(`/construction/projects/${projectId}/checklist/apply`, { method: "POST" });
}

// --- Alçadas (perda de material e desconto/ressarcimento de garantia) ---
export async function listApprovalThresholds() {
  return apiFetch("/construction/approval-thresholds");
}
// Exige construction:approval_threshold:manage e MFA recente: o host global de step-up abre o código e repete a chamada.
export async function saveApprovalThreshold(context, maxAutoApproveAmount) {
  return apiFetch("/construction/approval-thresholds", { method: "POST", body: { context, maxAutoApproveAmount } });
}

// --- Parâmetros de Obras (evidência mínima da medição; regra do diário ausente) ---
export async function getConstructionParameters() {
  return apiFetch("/construction/settings/parameters");
}
export async function updateConstructionParameters(values) {
  return apiFetch("/construction/settings/parameters", { method: "PUT", body: { values } });
}

// --- Revisões append-only do orçamento aprovado (cada Change Order aprovado vira uma) ---
export async function listBudgetRevisions(projectId) {
  return apiFetch(`/construction/projects/${projectId}/budget-revisions`);
}

// --- Membros ativos da empresa (campos de responsável: obra, etapa, não conformidade) ---
export async function listConstructionMembers() {
  return apiFetch("/construction/members");
}
