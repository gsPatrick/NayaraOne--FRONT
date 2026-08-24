// Chamadas ao módulo Jurídico/Contratos da API real.
// Contrato confirmado em NayaraOne--API/src/features/legal/ (contracts.service.js,
// contractVersions.service.js, signatures.service.js, guarantees.service.js,
// inspections.service.js, keyDeliveries.service.js, legalCases.service.js,
// legalDeadlines.service.js, evidencePackages.service.js, legal.routes.js).

import { apiFetch } from "@/lib/api/client";

// --- Contratos ---

export async function listContracts() {
  return apiFetch("/legal/contracts");
}

export async function getContract(id) {
  return apiFetch(`/legal/contracts/${id}`);
}

export async function createContract(payload) {
  return apiFetch("/legal/contracts", { method: "POST", body: payload });
}

export async function transitionContract(id, targetStatus) {
  return apiFetch(`/legal/contracts/${id}/transition`, { method: "POST", body: { targetStatus } });
}

export async function addContractParty(contractId, { personId, partyRole }) {
  return apiFetch(`/legal/contracts/${contractId}/parties`, { method: "POST", body: { personId, partyRole } });
}

export async function listContractParties(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/parties`);
}

export async function createContractVersion(contractId, { content, documentFileId, effectiveFrom }) {
  return apiFetch(`/legal/contracts/${contractId}/versions`, {
    method: "POST",
    body: { content, ...(documentFileId ? { documentFileId } : {}), ...(effectiveFrom ? { effectiveFrom } : {}) },
  });
}

export async function listContractVersions(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/versions`);
}

// --- Assinaturas ---

export async function initiateSignature(contractVersionId, signerPersonIds) {
  return apiFetch(`/legal/contract-versions/${contractVersionId}/signatures`, {
    method: "POST",
    body: { signerPersonIds },
  });
}

export async function listSignatures(contractVersionId) {
  return apiFetch(`/legal/contract-versions/${contractVersionId}/signatures`);
}

// --- Garantias ---

export async function createGuarantee(contractId, payload) {
  return apiFetch(`/legal/contracts/${contractId}/guarantees`, { method: "POST", body: payload });
}

export async function listGuarantees(filters = {}) {
  const query = new URLSearchParams();
  if (filters.contractId) query.set("contractId", filters.contractId);
  if (filters.status) query.set("status", filters.status);
  const qs = query.toString();
  return apiFetch(`/legal/guarantees${qs ? `?${qs}` : ""}`);
}

export async function getGuarantee(id) {
  return apiFetch(`/legal/guarantees/${id}`);
}

export async function updateGuarantee(id, payload) {
  return apiFetch(`/legal/guarantees/${id}`, { method: "PATCH", body: payload });
}

export async function deleteGuarantee(id) {
  return apiFetch(`/legal/guarantees/${id}`, { method: "DELETE" });
}

// --- Vistorias ---

export async function createInspection(payload) {
  return apiFetch("/legal/inspections", { method: "POST", body: payload });
}

export async function listInspections() {
  return apiFetch("/legal/inspections");
}

export async function getInspection(id) {
  return apiFetch(`/legal/inspections/${id}`);
}

export async function completeInspection(id) {
  return apiFetch(`/legal/inspections/${id}/complete`, { method: "POST" });
}

export async function addInspectionItem(inspectionId, { itemName, condition, notes }) {
  return apiFetch(`/legal/inspections/${inspectionId}/items`, {
    method: "POST",
    body: { itemName, ...(condition ? { condition } : {}), ...(notes ? { notes } : {}) },
  });
}

export async function listInspectionItems(inspectionId) {
  return apiFetch(`/legal/inspections/${inspectionId}/items`);
}

// Casamento por itemName textual (não por FK) — buckets divergences/onlyInEntry/onlyInExit.
export async function compareInspections(entryInspectionId, exitInspectionId) {
  const query = new URLSearchParams({ entryInspectionId, exitInspectionId });
  return apiFetch(`/legal/inspections/compare?${query.toString()}`);
}

// --- Entrega de chaves ---

export async function createKeyDelivery(payload) {
  return apiFetch("/legal/key-deliveries", { method: "POST", body: payload });
}

export async function listKeyDeliveries() {
  return apiFetch("/legal/key-deliveries");
}

export async function getKeyDelivery(id) {
  return apiFetch(`/legal/key-deliveries/${id}`);
}

// Trava do backend: só libera se o contrato estiver SIGNED/ACTIVE e existir vistoria
// CHECK_IN COMPLETED do mesmo contrato (ou do mesmo imóvel) — não replicar a regra no front,
// deixar a API recusar e mostrar o erro.
export async function releaseKeyDelivery(id) {
  return apiFetch(`/legal/key-deliveries/${id}/release`, { method: "POST" });
}

// --- Processos jurídicos ---

export async function createLegalCase(payload) {
  return apiFetch("/legal/cases", { method: "POST", body: payload });
}

export async function listLegalCases() {
  return apiFetch("/legal/cases");
}

export async function getLegalCase(id) {
  return apiFetch(`/legal/cases/${id}`);
}

export async function updateLegalCase(id, payload) {
  return apiFetch(`/legal/cases/${id}`, { method: "PATCH", body: payload });
}

export async function linkCaseToTask(id, taskId) {
  return apiFetch(`/legal/cases/${id}/link-task`, { method: "POST", body: { taskId } });
}

// --- Prazos ---

export async function createLegalDeadline(caseId, { description, dueAt }) {
  return apiFetch(`/legal/cases/${caseId}/deadlines`, { method: "POST", body: { description, dueAt } });
}

// severity é calculado em runtime pela API (OVERDUE|DUE_SOON ≤48h|NORMAL|DONE) — não
// recalcular no front com outra janela de tempo, usar o valor que a API devolve.
// Suporta filtro server-side por legalCaseId/status/severity (ver legal.controller.js).
export async function listLegalDeadlines(filters = {}) {
  const query = new URLSearchParams();
  if (filters.legalCaseId) query.set("legalCaseId", filters.legalCaseId);
  if (filters.status) query.set("status", filters.status);
  if (filters.severity) query.set("severity", filters.severity);
  const qs = query.toString();
  return apiFetch(`/legal/deadlines${qs ? `?${qs}` : ""}`);
}

export async function updateLegalDeadline(id, payload) {
  return apiFetch(`/legal/deadlines/${id}`, { method: "PATCH", body: payload });
}

// --- Pacotes de evidência ---

export async function createEvidencePackage(caseId, manifestItems) {
  return apiFetch(`/legal/cases/${caseId}/evidence-packages`, { method: "POST", body: { manifestItems } });
}

export async function listEvidencePackages(caseId) {
  return apiFetch(`/legal/cases/${caseId}/evidence-packages`);
}

export async function getEvidencePackage(id) {
  return apiFetch(`/legal/evidence-packages/${id}`);
}
