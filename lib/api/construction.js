// Chamadas ao módulo de Obras (Marco 6) da API real.
// Contrato confirmado em NayaraOne--API/src/features/construction/ (projects.service.js,
// projectStages.service.js, stageMeasurements.service.js, dailyReports.service.js,
// budgetLines.service.js, qualityChecklist.service.js, maintenanceCases.service.js,
// construction.routes.js).

import { apiFetch } from "@/lib/api/client";

// --- Obras (projects) ---

export async function listProjects(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/construction/projects${suffix}`);
}

export async function getProject(id) {
  return apiFetch(`/construction/projects/${id}`);
}

export async function createProject(payload) {
  return apiFetch("/construction/projects", { method: "POST", body: payload });
}

export async function updateProject(id, payload) {
  return apiFetch(`/construction/projects/${id}`, { method: "PATCH", body: payload });
}

export async function transitionProject(id, targetStatus) {
  return apiFetch(`/construction/projects/${id}/transition`, { method: "POST", body: { targetStatus } });
}

export async function removeProject(id) {
  return apiFetch(`/construction/projects/${id}`, { method: "DELETE" });
}

// Gate de entrega da obra (POST /construction/projects/:id/deliver) — bloqueia se houver
// não conformidade CRITICAL/OPEN vinculada (construction.controller.js deliverProject).
export async function deliverProject(id) {
  return apiFetch(`/construction/projects/${id}/deliver`, { method: "POST" });
}

// --- Etapas (project stages) ---

export async function createProjectStage(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/stages`, { method: "POST", body: payload });
}

export async function listProjectStages(projectId) {
  return apiFetch(`/construction/projects/${projectId}/stages`);
}

export async function getProjectStage(id) {
  return apiFetch(`/construction/stages/${id}`);
}

export async function updateProjectStage(id, payload) {
  return apiFetch(`/construction/stages/${id}`, { method: "PATCH", body: payload });
}

// --- Medições ---

export async function createStageMeasurement(stageId, payload) {
  return apiFetch(`/construction/stages/${stageId}/measurements`, { method: "POST", body: payload });
}

export async function listStageMeasurements(stageId) {
  return apiFetch(`/construction/stages/${stageId}/measurements`);
}

// decision: "APPROVED" | "REJECTED" — rejectionReason só é usado quando REJECTED.
export async function decideStageMeasurement(id, { decision, rejectionReason }) {
  return apiFetch(`/construction/measurements/${id}/decide`, {
    method: "POST",
    body: { decision, ...(rejectionReason ? { rejectionReason } : {}) },
  });
}

// --- RDO (daily reports) ---

export async function createDailyReport(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/daily-reports`, { method: "POST", body: payload });
}

export async function listDailyReports(projectId) {
  return apiFetch(`/construction/projects/${projectId}/daily-reports`);
}

export async function getDailyReport(id) {
  return apiFetch(`/construction/daily-reports/${id}`);
}

export async function updateDailyReport(id, payload) {
  return apiFetch(`/construction/daily-reports/${id}`, { method: "PATCH", body: payload });
}

// --- Orçamento (budget lines) ---

export async function createBudgetLine(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/budget-lines`, { method: "POST", body: payload });
}

export async function listBudgetLines(projectId) {
  return apiFetch(`/construction/projects/${projectId}/budget-lines`);
}

export async function updateBudgetLine(id, payload) {
  return apiFetch(`/construction/budget-lines/${id}`, { method: "PATCH", body: payload });
}

// --- Orçamento agregado (Budget) — DRAFT -> APPROVED (baseline imutável) ---

export async function createBudget(projectId) {
  return apiFetch(`/construction/projects/${projectId}/budgets`, { method: "POST", body: {} });
}

export async function listBudgets(projectId) {
  return apiFetch(`/construction/projects/${projectId}/budgets`);
}

export async function getBudget(id) {
  return apiFetch(`/construction/budgets/${id}`);
}

export async function approveBudget(id) {
  return apiFetch(`/construction/budgets/${id}/approve`, { method: "POST" });
}

// --- Change Orders ---

export async function createChangeOrder(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/change-orders`, { method: "POST", body: payload });
}

export async function listChangeOrders(projectId) {
  return apiFetch(`/construction/projects/${projectId}/change-orders`);
}

// decision: "APPROVE" | "REJECT"
export async function decideChangeOrder(id, decision) {
  return apiFetch(`/construction/change-orders/${id}/decide`, { method: "POST", body: { decision } });
}

// --- Saúde da obra (read model) ---

export async function getProjectHealth(projectId) {
  return apiFetch(`/construction/projects/${projectId}/health`);
}

// --- Qualidade (checklist) ---

export async function createQualityItem(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/quality-items`, { method: "POST", body: payload });
}

export async function listQualityItems(projectId) {
  return apiFetch(`/construction/projects/${projectId}/quality-items`);
}

// status: "PENDING" | "OK" | "NOT_OK"
export async function checkQualityItem(id, { status, notes }) {
  return apiFetch(`/construction/quality-items/${id}/check`, { method: "POST", body: { status, ...(notes !== undefined ? { notes } : {}) } });
}

// --- Pós-obra (maintenance cases) ---

export async function createMaintenanceCase(payload) {
  return apiFetch("/construction/maintenance-cases", { method: "POST", body: payload });
}

export async function listMaintenanceCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  if (filters.projectId) query.set("projectId", filters.projectId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/construction/maintenance-cases${suffix}`);
}

export async function getMaintenanceCase(id) {
  return apiFetch(`/construction/maintenance-cases/${id}`);
}

export async function updateMaintenanceCase(id, payload) {
  return apiFetch(`/construction/maintenance-cases/${id}`, { method: "PATCH", body: payload });
}

export async function removeMaintenanceCase(id) {
  return apiFetch(`/construction/maintenance-cases/${id}`, { method: "DELETE" });
}

// --- Ações de atendimento (warranty actions) ---

export async function createWarrantyAction(warrantyCaseId, payload) {
  return apiFetch(`/construction/maintenance-cases/${warrantyCaseId}/actions`, { method: "POST", body: payload });
}

export async function listWarrantyActions(warrantyCaseId) {
  return apiFetch(`/construction/maintenance-cases/${warrantyCaseId}/actions`);
}

// --- Requisições de material (material requests) ---

export async function createMaterialRequest(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/material-requests`, { method: "POST", body: payload });
}

export async function listMaterialRequests(projectId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/construction/projects/${projectId}/material-requests${suffix}`);
}

export async function receiveMaterialRequest(id) {
  return apiFetch(`/construction/material-requests/${id}/receive`, { method: "POST" });
}

// --- Não conformidades (nonconformities.service.js) ---
// severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" — status: "OPEN" | "CLOSED".

export async function createNonconformity(projectId, payload) {
  return apiFetch(`/construction/projects/${projectId}/nonconformities`, { method: "POST", body: payload });
}

export async function listNonconformities(projectId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/construction/projects/${projectId}/nonconformities${suffix}`);
}

export async function getNonconformity(id) {
  return apiFetch(`/construction/nonconformities/${id}`);
}

// Fecho da NC — API exige "afterEvidenceFileIds" preenchido (fail-closed) e, se a NC tiver
// requiresAcceptance=true, exige "acceptedByUserId" também preenchido.
export async function closeNonconformity(id, payload) {
  return apiFetch(`/construction/nonconformities/${id}/close`, { method: "POST", body: payload });
}
