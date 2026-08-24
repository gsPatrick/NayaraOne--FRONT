// Chamadas ao módulo Financeiro da API real.
// Contrato confirmado em NayaraOne--API/src/features/finance/ (financialEntries.service.js,
// bankAccounts.service.js, bankTransactions.service.js, reconciliation.service.js,
// approvals.service.js, commissions.service.js, ownerRepasses.service.js, finance.routes.js).

import { apiFetch } from "@/lib/api/client";

// --- Centros de custo/resultado ---

export async function listCostCenters() {
  return apiFetch("/finance/cost-centers");
}

export async function createCostCenter(payload) {
  return apiFetch("/finance/cost-centers", { method: "POST", body: payload });
}

export async function updateCostCenter(id, payload) {
  return apiFetch(`/finance/cost-centers/${id}`, { method: "PATCH", body: payload });
}

export async function deleteCostCenter(id) {
  return apiFetch(`/finance/cost-centers/${id}`, { method: "DELETE" });
}

export async function listResultCenters() {
  return apiFetch("/finance/result-centers");
}

export async function createResultCenter(payload) {
  return apiFetch("/finance/result-centers", { method: "POST", body: payload });
}

export async function updateResultCenter(id, payload) {
  return apiFetch(`/finance/result-centers/${id}`, { method: "PATCH", body: payload });
}

export async function deleteResultCenter(id) {
  return apiFetch(`/finance/result-centers/${id}`, { method: "DELETE" });
}

// --- Contas bancárias ---
// status nasce PENDING_COOLDOWN (conta nova ou dado sensível alterado) e só fica elegível a
// pagamento 48h depois — mesma regra que já existia no mock (financeAntifraud.service.js).

export async function listBankAccounts() {
  return apiFetch("/finance/bank-accounts");
}

export async function getBankAccount(id) {
  return apiFetch(`/finance/bank-accounts/${id}`);
}

export async function createBankAccount(payload) {
  return apiFetch("/finance/bank-accounts", { method: "POST", body: payload });
}

export async function updateBankAccount(id, payload) {
  return apiFetch(`/finance/bank-accounts/${id}`, { method: "PATCH", body: payload });
}

export async function blockBankAccount(id, reason) {
  return apiFetch(`/finance/bank-accounts/${id}/block`, { method: "POST", body: { reason } });
}

export async function deleteBankAccount(id) {
  return apiFetch(`/finance/bank-accounts/${id}`, { method: "DELETE" });
}

// --- Lançamentos financeiros (ledger — contas a pagar/receber) ---

export async function listFinancialEntries(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.nature) query.set("nature", filters.nature);
  if (filters.bankAccountId) query.set("bankAccountId", filters.bankAccountId);
  if (filters.costCenterId) query.set("costCenterId", filters.costCenterId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/finance/entries${suffix}`);
}

export async function getFinancialEntry(id) {
  return apiFetch(`/finance/entries/${id}`);
}

export async function createFinancialEntry(payload) {
  return apiFetch("/finance/entries", { method: "POST", body: payload });
}

export async function updateFinancialEntry(id, payload) {
  return apiFetch(`/finance/entries/${id}`, { method: "PATCH", body: payload });
}

export async function settleFinancialEntry(id) {
  return apiFetch(`/finance/entries/${id}/settle`, { method: "POST" });
}

export async function reverseFinancialEntry(id, reason) {
  return apiFetch(`/finance/entries/${id}/reverse`, { method: "POST", body: { reason } });
}

// --- Extrato bancário (bank transactions) ---

export async function listBankTransactions(filters = {}) {
  const query = new URLSearchParams();
  if (filters.bankAccountId) query.set("bankAccountId", filters.bankAccountId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/finance/bank-transactions${suffix}`);
}

export async function createBankTransaction(payload) {
  return apiFetch("/finance/bank-transactions", { method: "POST", body: payload });
}

// --- Conciliação ---

export async function listReconciliations() {
  return apiFetch("/finance/reconciliations");
}

export async function matchReconciliation({ financialEntryId, bankTransactionId }) {
  return apiFetch("/finance/reconciliations", {
    method: "POST",
    body: { financialEntryId, bankTransactionId },
  });
}

// --- Aprovações (maker-checker) ---

export async function listApprovalRequests() {
  return apiFetch("/finance/approval-requests");
}

export async function createApprovalRequest({ relatedEntityType, relatedEntityId, riskLevel }) {
  return apiFetch("/finance/approval-requests", {
    method: "POST",
    body: { relatedEntityType, relatedEntityId, ...(riskLevel ? { riskLevel } : {}) },
  });
}

export async function decideApprovalStep(id, { decision, expectedLockVersion }) {
  return apiFetch(`/finance/approval-requests/${id}/decide`, {
    method: "POST",
    body: { decision, ...(expectedLockVersion !== undefined ? { expectedLockVersion } : {}) },
  });
}

// --- Comissões ---

export async function listCommissions() {
  return apiFetch("/finance/commissions");
}

export async function createCommission(payload) {
  return apiFetch("/finance/commissions", { method: "POST", body: payload });
}

export async function listCommissionInstallments(commissionId) {
  return apiFetch(`/finance/commissions/${commissionId}/installments`);
}

// payCommissionInstallment exige um financialEntryId — a baixa da comissão precisa estar
// vinculada a um lançamento real do ledger (não gera dinheiro novo, só registra contra um
// lançamento já criado/liquidado em /finance/entries).
export async function payCommissionInstallment(installmentId, financialEntryId) {
  return apiFetch(`/finance/commission-installments/${installmentId}/pay`, {
    method: "POST",
    body: { financialEntryId },
  });
}

// --- Repasses a proprietários ---

export async function listOwnerRepasses() {
  return apiFetch("/finance/owner-repasses");
}

export async function createOwnerRepasse(payload) {
  return apiFetch("/finance/owner-repasses", { method: "POST", body: payload });
}

export async function payOwnerRepasse(id) {
  return apiFetch(`/finance/owner-repasses/${id}/pay`, { method: "POST" });
}
