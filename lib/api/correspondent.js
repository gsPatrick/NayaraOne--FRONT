// Chamadas ao módulo de Correspondente Bancário/Financiamentos (Marco 8) da API real.
// Contrato confirmado em NayaraOne--API/src/features/correspondent/cases/financingCases.service.js.

import { apiFetch, getBaseUrl } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

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

export async function validateCaseRequirement(financingCaseId, requirementId) {
  return apiFetch(`/financing-cases/${financingCaseId}/requirements/${requirementId}/validate`, { method: "POST" });
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

// --- Fase 8: comissões (NC) — EXPECTED -> CONFIRMED/RECEIVABLE -> RECEIVED -> ADJUSTED ---

export async function listCommissionEntitlements(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/commissions`);
}

export async function createCommissionEntitlement(financingCaseId, { baseAmount, triggerEvent }) {
  return apiFetch(`/financing-cases/${financingCaseId}/commissions`, { method: "POST", body: { baseAmount, triggerEvent: triggerEvent || undefined } });
}

export async function confirmCommissionEntitlement(financingCaseId, entitlementId, { externalConfirmationId }) {
  return apiFetch(`/financing-cases/${financingCaseId}/commissions/${entitlementId}/confirm`, {
    method: "POST",
    body: { externalConfirmationId },
  });
}

export async function receiveCommissionEntitlement(financingCaseId, entitlementId) {
  return apiFetch(`/financing-cases/${financingCaseId}/commissions/${entitlementId}/receive`, { method: "POST" });
}

export async function chargebackCommissionEntitlement(financingCaseId, entitlementId, { reason }) {
  return apiFetch(`/financing-cases/${financingCaseId}/commissions/${entitlementId}/chargeback`, {
    method: "POST",
    body: { reason },
  });
}

// --- Fase 10: NAY Correspondente (restrita, somente leitura — sinaliza e compara, nunca decide) ---

export async function getNayStalledCases(thresholdDays) {
  const query = thresholdDays ? `?thresholdDays=${thresholdDays}` : "";
  return apiFetch(`/financing-cases/nay/stalled${query}`);
}

export async function getNayCompareSimulations(financingCaseId) {
  return apiFetch(`/financing-cases/${financingCaseId}/nay/compare-simulations`);
}

// --- Fase 12: Fiscal/Compliance (NFS-e, DIMOB, reconciliação, export contábil) — Nayara One é
// subledger operacional/gerencial, nunca substitui o livro contábil oficial. ---

export async function listInvoiceRequests() {
  return apiFetch("/fiscal/invoices");
}

export async function requestInvoice({ sourceType, sourceId, amount, description }) {
  return apiFetch("/fiscal/invoices", { method: "POST", body: { sourceType, sourceId, amount, description } });
}

export async function checkInvoiceStatus(invoiceRequestId) {
  return apiFetch(`/fiscal/invoices/${invoiceRequestId}/check-status`, { method: "POST" });
}

export async function cancelInvoice(invoiceRequestId, { reason }) {
  return apiFetch(`/fiscal/invoices/${invoiceRequestId}/cancel`, { method: "POST", body: { reason } });
}

export async function getInvoiceEvents(invoiceRequestId) {
  return apiFetch(`/fiscal/invoices/${invoiceRequestId}/events`);
}

export async function listDimobBatches(referenceYear) {
  const query = referenceYear ? `?referenceYear=${referenceYear}` : "";
  return apiFetch(`/fiscal/dimob-batches${query}`);
}

export async function generateDimobBatch({ referenceYear }) {
  return apiFetch("/fiscal/dimob-batches", { method: "POST", body: { referenceYear } });
}

export async function closeDimobBatch(dimobBatchId) {
  return apiFetch(`/fiscal/dimob-batches/${dimobBatchId}/close`, { method: "POST" });
}

export async function listFiscalReconciliations(status) {
  const query = status ? `?status=${status}` : "";
  return apiFetch(`/fiscal/reconciliations${query}`);
}

export async function resolveFiscalReconciliation(reconciliationId, { reason }) {
  return apiFetch(`/fiscal/reconciliations/${reconciliationId}/resolve`, { method: "POST", body: { reason } });
}

// Workflow manual assistido (provider sem API), cancelamento e proposta do banco.
export async function registerManualStatus(id, payload) {
  return apiFetch(`/financing-cases/${id}/manual-status`, { method: "POST", body: payload });
}

export async function cancelFinancingCase(id, reason) {
  return apiFetch(`/financing-cases/${id}/cancel`, { method: "POST", body: { reason } });
}

export async function listFinancingProposals(id) {
  return apiFetch(`/financing-cases/${id}/proposals`);
}

// Parâmetros do correspondente (Motor de Regras): elegibilidade e comissão/split.
export async function getCorrespondentParameters() {
  return apiFetch("/parameters");
}

export async function updateEligibilityParameters(config, reason) {
  return apiFetch("/parameters/eligibility", { method: "PUT", body: { config, reason } });
}

export async function updateCommissionParameters(config, reason) {
  return apiFetch("/parameters/commission", { method: "PUT", body: { config, reason } });
}

// Fiscal: conferências, arquivos da NFS-e, export/retorno contábil e calendário de obrigações.
export async function runFiscalReconciliations() {
  return apiFetch("/fiscal/reconciliations/run", { method: "POST" });
}

export async function listDimobRecords(dimobBatchId) {
  return apiFetch(`/fiscal/dimob-batches/${dimobBatchId}/records`);
}

export async function listExportCandidates(period) {
  return apiFetch(`/fiscal/export-candidates?period=${encodeURIComponent(period)}`);
}

export async function createExportBatch({ referencePeriod, lines }) {
  return apiFetch("/fiscal/export-batches", { method: "POST", body: { referencePeriod, lines } });
}

export async function listExportBatches() {
  return apiFetch("/fiscal/export-batches");
}

export async function getExportBatch(batchId) {
  return apiFetch(`/fiscal/export-batches/${batchId}`);
}

export async function adjustExportLine(lineId, { deltaAmount, reason }) {
  return apiFetch(`/fiscal/export-lines/${lineId}/adjust`, { method: "POST", body: { deltaAmount, reason } });
}

export async function importAccountingReturn(batchId, { batchHash, fileName, lines }) {
  return apiFetch(`/fiscal/export-batches/${batchId}/return`, { method: "POST", body: { batchHash, fileName, lines } });
}

export async function listFiscalObligations() {
  return apiFetch("/fiscal/obligations");
}

export async function createFiscalObligation({ obligationType, referenceYear, dueAt }) {
  return apiFetch("/fiscal/obligations", { method: "POST", body: { obligationType, referenceYear, dueAt: dueAt || undefined } });
}

export async function completeFiscalObligation(obligationId, { note }) {
  return apiFetch(`/fiscal/obligations/${obligationId}/complete`, { method: "POST", body: { note } });
}

// Baixa o XML/PDF preservado da NFS-e (rota autenticada: precisa do token, por isso fetch + blob).
export async function downloadInvoiceFile(invoiceRequestId, kind) {
  const session = getSession();
  const response = await fetch(`${getBaseUrl()}/fiscal/invoices/${invoiceRequestId}/${kind}`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });
  if (!response.ok) {
    let message = "Não foi possível baixar o arquivo.";
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {
      // resposta sem corpo JSON: mantém a mensagem padrão
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = match ? match[1] : `nfse.${kind}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
