// Processos jurídicos: partes, documentos, linha do tempo, recebível, prazos, dossiê e notificações versionadas.
// Contrato em wt/api-m5 src/features/legal (legalCases.controller/service, legalCaseDocuments/Receivables/Timeline,
// legalDeadlines.service, legalDeadlineSource, legalDeadlineTransitions, evidencePackages.service, noticeVersions.service).

import { apiFetch } from "@/lib/api/client";

// --- Processos ---

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

// Partes formais: partyRole PLAINTIFF | DEFENDANT | WITNESS | THIRD_PARTY.
export async function addLegalCaseParty(caseId, { personId, partyRole }) {
  return apiFetch(`/legal/cases/${caseId}/parties`, { method: "POST", body: { personId, partyRole } });
}

export async function listLegalCaseParties(caseId) {
  return apiFetch(`/legal/cases/${caseId}/parties`);
}

// Documento/prova ligado por file_links (o arquivo original não é copiado). purpose: DOCUMENT|EVIDENCE|PETITION|DECISION|NOTICE|OTHER.
export async function linkLegalCaseDocument(caseId, { fileId, purpose, description }) {
  return apiFetch(`/legal/cases/${caseId}/documents`, {
    method: "POST",
    body: { fileId, ...(purpose ? { purpose } : {}), ...(description ? { description } : {}) },
  });
}

export async function listLegalCaseDocuments(caseId) {
  return apiFetch(`/legal/cases/${caseId}/documents`);
}

export async function getLegalCaseTimeline(caseId) {
  return apiFetch(`/legal/cases/${caseId}/timeline`);
}

// Só o valor CONFIRMADO vira recebível (legal:approve + finance:create), com a base jurídica e a referência.
export async function linkLegalCaseReceivable(caseId, { basis, basisReference, dueAt, resultCenterId }) {
  return apiFetch(`/legal/cases/${caseId}/receivables`, {
    method: "POST",
    body: { basis, basisReference, dueAt, ...(resultCenterId ? { resultCenterId } : {}) },
  });
}

export async function listLegalCaseReceivables(caseId) {
  return apiFetch(`/legal/cases/${caseId}/receivables`);
}

// --- Prazos (Caderno §15) ---

// Origem verificável obrigatória: `sourceFileId` (arquivo desta empresa) ou `sourceEventId` (evento real); sem os
// dois a API devolve 400 DEADLINE_SOURCE_REQUIRED. Responsável do prazo ou do processo. Data só-dia ("AAAA-MM-DD")
// vence às 23:59 de Brasília. A tarefa do responsável nasce junto.
export async function createLegalDeadline(caseId, payload) {
  const body = {};
  for (const key of ["description", "dueAt", "criticality", "responsibleUserId", "sourceFileId", "sourceEventId", "sourceDocument", "sourceEvent"]) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") body[key] = payload[key];
  }
  return apiFetch(`/legal/cases/${caseId}/deadlines`, { method: "POST", body });
}

// severity vem calculado pela API (OVERDUE | DUE_SOON | NORMAL | DONE) — não recalcular no front.
export async function listLegalDeadlines(filters = {}) {
  const query = new URLSearchParams();
  if (filters.legalCaseId) query.set("legalCaseId", filters.legalCaseId);
  if (filters.status) query.set("status", filters.status);
  if (filters.severity) query.set("severity", filters.severity);
  const qs = query.toString();
  return apiFetch(`/legal/deadlines${qs ? `?${qs}` : ""}`);
}

// Concluir (status DONE + conclusionNote/conclusionEvidenceFileId): só o responsável ou quem tem legal:approve
// (403 LEGAL_DEADLINE_NOT_RESPONSIBLE). Cancelar (status CANCELLED + changeReason): legal:approve.
export async function updateLegalDeadline(id, payload) {
  return apiFetch(`/legal/deadlines/${id}`, { method: "PATCH", body: payload });
}

// --- Dossiê (pacotes de evidência) ---

export async function createEvidencePackage(caseId, manifestItems) {
  return apiFetch(`/legal/cases/${caseId}/evidence-packages`, { method: "POST", body: { manifestItems } });
}

export async function createEvidencePackageAuto(caseId) {
  return apiFetch(`/legal/cases/${caseId}/evidence-packages/auto`, { method: "POST" });
}

export async function listEvidencePackages(caseId) {
  return apiFetch(`/legal/cases/${caseId}/evidence-packages`);
}

export async function getEvidencePackage(id) {
  return apiFetch(`/legal/evidence-packages/${id}`);
}

// Exportar exige a permissão própria legal:evidence:export; a DLP continua por cima (finalidade/justificativa e MFA).
export async function exportEvidencePackage(id, { purpose, justification } = {}) {
  const params = new URLSearchParams();
  if (purpose) params.set("purpose", purpose);
  if (justification) params.set("justification", justification);
  return apiFetch(`/legal/evidence-packages/${id}/export${params.size ? `?${params}` : ""}`);
}

export async function listEvidencePackageAccessLog(id) {
  return apiFetch(`/legal/evidence-packages/${id}/access-log`);
}

// --- Notificações formais (versionadas) ---

export async function listNotices(filters = {}) {
  const query = new URLSearchParams();
  if (filters.contractId) query.set("contractId", filters.contractId);
  if (filters.legalCaseId) query.set("legalCaseId", filters.legalCaseId);
  if (filters.status) query.set("status", filters.status);
  const qs = query.toString();
  return apiFetch(`/legal/notices${qs ? `?${qs}` : ""}`);
}

export async function getNotice(id) {
  return apiFetch(`/legal/notices/${id}`);
}

export async function createNotice(payload) {
  return apiFetch("/legal/notices", { method: "POST", body: payload });
}

// Corrigir = nova versão (a anterior fica preservada) e a notificação volta a rascunho; só a versão aprovada é enviada.
export async function createNoticeVersion(id, { reason, content, contentFileId, recipientDescription, recipientPersonId }) {
  const body = { reason };
  if (content !== undefined) body.content = content;
  if (contentFileId !== undefined) body.contentFileId = contentFileId;
  if (recipientDescription !== undefined) body.recipientDescription = recipientDescription;
  if (recipientPersonId !== undefined) body.recipientPersonId = recipientPersonId;
  return apiFetch(`/legal/notices/${id}/versions`, { method: "POST", body });
}

export async function listNoticeVersions(id) {
  return apiFetch(`/legal/notices/${id}/versions`);
}

export async function submitNoticeForReview(id) {
  return apiFetch(`/legal/notices/${id}/submit-for-review`, { method: "POST" });
}

export async function approveNotice(id) {
  return apiFetch(`/legal/notices/${id}/approve`, { method: "POST" });
}

export async function rejectNotice(id, reason) {
  return apiFetch(`/legal/notices/${id}/reject`, { method: "POST", body: { reason } });
}

export async function sendNotice(id) {
  return apiFetch(`/legal/notices/${id}/send`, { method: "POST" });
}

export async function registerNoticeDeliveryEvidence(id, payload) {
  return apiFetch(`/legal/notices/${id}/delivery-evidence`, { method: "POST", body: payload });
}

// --- Minuta sugerida pela NAY Jurídica (Caderno M5 §17 "Sugere minuta usando biblioteca homologada") ---

// A NAY monta a minuta só com versões de cláusula homologadas (com a IA, quando ligada, escolhendo e ordenando); fica pendente
// de revisão. Nada muda no contrato até uma pessoa aceitar.
export async function suggestContractDraft(contractId) {
  return apiFetch(`/legal/nay/contracts/${contractId}/draft-suggestions`, { method: "POST", body: {} });
}

export async function listContractDraftSuggestions(contractId) {
  return apiFetch(`/legal/nay/contracts/${contractId}/draft-suggestions`);
}

// Aceitar vira versão RASCUNHO do contrato (ainda precisa da aprovação da versão). `documentFileId`: arquivo do documento.
export async function acceptContractDraftSuggestion(id, { documentFileId, reason } = {}) {
  return apiFetch(`/legal/nay/draft-suggestions/${id}/accept`, { method: "POST", body: { ...(documentFileId ? { documentFileId } : {}), ...(reason ? { reason } : {}) } });
}

export async function discardContractDraftSuggestion(id, reason) {
  return apiFetch(`/legal/nay/draft-suggestions/${id}/discard`, { method: "POST", body: { reason } });
}
