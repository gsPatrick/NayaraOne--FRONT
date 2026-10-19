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

// filters opcionais: { ownerPersonId, status } — usados pela tela de fornecedor (Compras) para
// mostrar as contas do fornecedor e o estado de resfriamento/reverificação de cada uma.
export async function listBankAccounts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.ownerPersonId) query.set("ownerPersonId", filters.ownerPersonId);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/finance/bank-accounts${suffix}`);
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

// F03 (conferência Nayara 18/10/2026): pagamento com conta bancária só é dado como pago sem
// confirmação do banco por exceção formal — comprovante (arquivo já enviado) + motivo.
function manualSettlementBody(manual) {
  if (!manual) return {};
  return { settlementEvidenceFileId: manual.evidenceFileId, settlementReason: manual.reason };
}

// Revisão 18/10/2026 (A4): o comprovante da baixa manual é ANEXADO ao lançamento antes da
// aprovação (quem aprova vê o arquivo); a aprovação precisa vir depois, de outra pessoa. Anexar
// invalida aprovações anteriores. A baixa em si não envia mais o arquivo — usa o anexado.
export async function attachSettlementEvidence(id, { evidenceFileId, reason }) {
  return apiFetch(`/finance/entries/${id}/settlement-evidence`, {
    method: "POST",
    body: { settlementEvidenceFileId: evidenceFileId, settlementReason: reason },
  });
}

export async function settleFinancialEntry(id, manual = null) {
  return apiFetch(`/finance/entries/${id}/settle`, { method: "POST", body: manualSettlementBody(manual) });
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

// FIN-TS-007 (auditoria externa Abacus AI, 11/10/2026): importação de extrato em lote (CSV),
// idempotente por linha — reimportar o mesmo arquivo nunca duplica, cada linha já existente
// volta marcada "duplicate" na resposta em vez de abortar o lote. Ver
// NayaraOne--API/src/features/finance/bankTransactions.service.js#importBankStatement.
export async function importBankStatement(payload) {
  return apiFetch("/finance/bank-transactions/import", { method: "POST", body: payload });
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

// GAP REAL (verificação cética adicional, Marco 4, 12/10/2026): a engine de classificação
// EXATO/FORTE/PROVÁVEL/AMBÍGUO/SEM CORRESPONDÊNCIA (Caderno §11) já existia inteira no backend
// mas sem rota — a tela de conciliação bypassava com match ingênuo só por valor. Agora exposta.
export async function suggestReconciliationMatches(bankTransactionId) {
  return apiFetch(`/finance/bank-transactions/${bankTransactionId}/reconciliation-suggestions`);
}

// GAP REAL CORRIGIDO (ciclo de verificação adicional, Marco 4, 12/10/2026 — varredura função
// por função do backend): autoReconcileSuggestion existia no service mas nunca era chamada de
// lugar nenhum — classe EXATO/FORTE do motor (§11 "Exato: auto confirmado") nunca conciliava
// sozinha, mesmo quando deveria.
export async function autoReconcileSuggestion(bankTransactionId) {
  return apiFetch(`/finance/bank-transactions/${bankTransactionId}/auto-reconcile`, { method: "POST", body: {} });
}

// --- Recebimento parcial e pendências de classificação (M4-contrato §10) ---

export async function settleFinancialEntryPartial(id, partialAmount, manual = null) {
  return apiFetch(`/finance/entries/${id}/settle-partial`, { method: "POST", body: { partialAmount, ...manualSettlementBody(manual) } });
}

export async function listClassificationPendings(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  return apiFetch(`/finance/entries/classification-pendings${qs ? `?${qs}` : ""}`);
}

// Revisão 18/10/2026 (A3): classificar o excedente como despesa (PAYABLE) cria uma obrigação a
// pagar (PENDING) e exige centro de custo — nunca uma saída de caixa automática.
export async function resolveClassificationPending(id, finalNature, { costCenterId } = {}) {
  return apiFetch(`/finance/entries/classification-pendings/${id}/resolve`, {
    method: "POST",
    body: { finalNature, ...(costCenterId ? { costCenterId } : {}) },
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

// --- Intenções de pagamento (snapshot/hash, Caderno §8 ponto 4) ---
// Caminho alternativo e mais rigoroso ao par "Solicitar aprovação" + "Liquidar": trava o
// conteúdo do lançamento num hash no momento da intenção, e recusa aprovar/executar se o
// lançamento mudou entre uma etapa e outra.

export async function listPaymentIntents() {
  return apiFetch("/finance/payment-intents");
}

export async function createPaymentIntent({ financialEntryId, approvalRequestId }) {
  return apiFetch("/finance/payment-intents", {
    method: "POST",
    body: { financialEntryId, ...(approvalRequestId ? { approvalRequestId } : {}) },
  });
}

export async function approvePaymentIntent(id) {
  return apiFetch(`/finance/payment-intents/${id}/approve`, { method: "POST" });
}

export async function executePaymentIntent(id, manual = null) {
  return apiFetch(`/finance/payment-intents/${id}/execute`, { method: "POST", body: manualSettlementBody(manual) });
}

// B2 (revisão 18/10/2026): intenção com resposta incerta do banco (SUBMITTING) ou em trânsito
// (SUBMITTED) — consultar o banco agora, ou resolver a incerteza (só dá como falha com resposta
// final do banco; exige motivo e MFA recente).
export async function reconcilePaymentIntent(id) {
  return apiFetch(`/finance/payment-intents/${id}/reconcile`, { method: "POST" });
}

export async function resolveUncertainPaymentIntent(id, reason) {
  return apiFetch(`/finance/payment-intents/${id}/resolve-uncertainty`, { method: "POST", body: { reason } });
}

export async function cancelPaymentIntent(id, reason) {
  return apiFetch(`/finance/payment-intents/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

// --- Comissões ---

export async function listCommissions(options = {}) {
  return apiFetch(options.includeInstallments ? "/finance/commissions?include=installments" : "/finance/commissions");
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

export async function cancelCommission(commissionId, reason) {
  return apiFetch(`/finance/commissions/${commissionId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

// GAP REAL CORRIGIDO: histórico de ajustes (cancelamentos) de uma comissão existia no backend,
// sem rota — a tela de comissões não tinha como mostrar o que já foi ajustado.
export async function getCommissionAdjustments(commissionId) {
  return apiFetch(`/finance/commissions/${commissionId}/adjustments`);
}

export async function listAnomalyCases(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/finance/anomaly-cases${query ? `?${query}` : ""}`);
}

export async function resolveAnomalyCase(id, resolutionNote) {
  return apiFetch(`/finance/anomaly-cases/${id}/resolve`, {
    method: "POST",
    body: { resolutionNote },
  });
}

// --- Repasses a proprietários ---

export async function listOwnerRepasses() {
  return apiFetch("/finance/owner-repasses");
}

// M45 F4: recebimentos que podem compor o repasse (mesma regra que a API valida na criação).
export async function listEligibleRepasseSources({ propertyId, contractId, referenceMonth }) {
  const qs = new URLSearchParams({ propertyId });
  if (contractId) qs.set("contractId", contractId);
  if (referenceMonth) qs.set("referenceMonth", referenceMonth);
  return apiFetch(`/finance/owner-repasses/eligible-sources?${qs.toString()}`);
}

export async function createOwnerRepasse(payload) {
  return apiFetch("/finance/owner-repasses", { method: "POST", body: payload });
}

export async function payOwnerRepasse(id) {
  return apiFetch(`/finance/owner-repasses/${id}/pay`, { method: "POST" });
}

// GAP REAL CORRIGIDO: Caderno §12 — "extrato do proprietário mostra composição, não apenas
// valor líquido". Existia no backend, sem rota — a tela só mostrava o valor final.
export async function getOwnerRepasseComposition(id) {
  return apiFetch(`/finance/owner-repasses/${id}/composition`);
}

// --- Plano de contas ---
// GAP REAL CORRIGIDO (auditoria externa Abacus AI, 11/10/2026): "Telas obrigatórias ausentes
// — Plano de Contas e Relatório Financeiro autônomos" — o backend já existia
// (chartOfAccounts.service.js, financialHealthReport.service.js), só não havia telas/menu.

export async function listChartAccounts() {
  return apiFetch("/finance/chart-of-accounts");
}

export async function createChartAccount(payload) {
  return apiFetch("/finance/chart-of-accounts", { method: "POST", body: payload });
}

export async function updateChartAccount(id, payload) {
  return apiFetch(`/finance/chart-of-accounts/${id}`, { method: "PATCH", body: payload });
}

export async function deactivateChartAccount(id) {
  return apiFetch(`/finance/chart-of-accounts/${id}`, { method: "DELETE" });
}

// --- Relatório financeiro semanal ---

export async function getWeeklyHealthReport() {
  return apiFetch("/finance/reports/weekly-health");
}

// --- Intercompany (transferências entre empresas do grupo) ---
// GAP REAL CORRIGIDO (verificação cética final do Marco 4, 11/10/2026): FIN-TS-016 do relatório
// original ("Intercompany — Funcionalidade não encontrada") nunca ganhou tela — o backend
// (createIntercompanyTransfer, 2 lançamentos vinculados nas duas empresas, step-up MFA) já
// existia. Ver NayaraOne--API/src/features/finance/intercompanyTransfers.service.js.

export async function listIntercompanyTransfers() {
  return apiFetch("/finance/intercompany-transfers");
}

export async function createIntercompanyTransfer(payload) {
  return apiFetch("/finance/intercompany-transfers", { method: "POST", body: payload });
}

export async function reconcileIntercompanyTransfer(id) {
  return apiFetch(`/finance/intercompany-transfers/${id}/reconcile`, { method: "POST" });
}

// --- Frente 3 (Regras do Financeiro, Marco 4): §15 maker-checker, §14 regra de comissão,
// §12 aprovação/confirmação do repasse, §4 versões do plano de contas ---
export async function listIntercompanyDestinationAccounts(toCompanyId) {
  return apiFetch(`/finance/intercompany-transfers/destination-bank-accounts?toCompanyId=${encodeURIComponent(toCompanyId)}`);
}

// M45 F8: empresas do grupo com o indicador canReadFinance (destino só onde o usuário tem acesso).
export async function listIntercompanyDestinationCompanies() {
  return apiFetch(`/finance/intercompany-transfers/destination-companies`);
}

export async function approveIntercompanyTransfer(id) {
  return apiFetch(`/finance/intercompany-transfers/${id}/approve`, { method: "POST", body: {} });
}

export async function rejectIntercompanyTransfer(id, reason) {
  return apiFetch(`/finance/intercompany-transfers/${id}/reject`, { method: "POST", body: { reason } });
}

export async function getGroupConsolidatedReport(referenceMonth) {
  const qs = referenceMonth ? `?referenceMonth=${encodeURIComponent(referenceMonth)}` : "";
  return apiFetch(`/finance/reports/group-consolidated${qs}`);
}

export async function getCommissionRule() {
  return apiFetch("/finance/commission-rule");
}

export async function listCommissionRuleVersions() {
  return apiFetch("/finance/commission-rule/versions");
}

export async function publishCommissionRule(componentPercentages) {
  return apiFetch("/finance/commission-rule", { method: "POST", body: { componentPercentages } });
}

export async function getCommissionRelease(commissionId) {
  return apiFetch(`/finance/commissions/${commissionId}/release`);
}

export async function approveOwnerRepasse(id, payload) {
  return apiFetch(`/finance/owner-repasses/${id}/approve`, { method: "POST", body: payload });
}

export async function listChartAccountVersions(id) {
  return apiFetch(`/finance/chart-of-accounts/${id}/versions`);
}

// --- Fechamento de período ---
// GAP REAL CORRIGIDO (verificação cética final do Marco 4, 11/10/2026): FIN-TS-010 do
// relatório da auditoria original ("Fechamento de período — Tela não encontrada") nunca foi
// fechado de verdade — rodadas anteriores só confirmaram o backend via teste de service, sem
// construir a tela. Ver NayaraOne--API/src/features/finance/periodClosures.service.js.

export async function listPeriodClosures() {
  return apiFetch("/finance/period-closures");
}

export async function closePeriod(referenceMonth) {
  return apiFetch("/finance/period-closures", { method: "POST", body: { referenceMonth } });
}

// F02 (conferência Nayara 18/10/2026): checklist de pré-condições do fechamento (Caderno §16),
// as duas conferências humanas e a aprovação REVIEW -> CLOSED (outro usuário + MFA recente).
export async function getPeriodPreconditions(referenceMonth) {
  return apiFetch(`/finance/period-closures/${encodeURIComponent(referenceMonth)}/preconditions`);
}

export async function confirmPeriodCheck(referenceMonth, checkType, note) {
  return apiFetch("/finance/period-closures/checks", { method: "POST", body: { referenceMonth, checkType, note } });
}

export async function approvePeriodClosure(referenceMonth) {
  return apiFetch("/finance/period-closures/approve", { method: "POST", body: { referenceMonth } });
}

export async function reopenPeriod(referenceMonth, reason) {
  return apiFetch("/finance/period-closures/reopen", { method: "POST", body: { referenceMonth, reason } });
}

// F02 (2ª rodada): devolve um pedido de fechamento em REVIEW para OPEN, com motivo obrigatório
// (auditado). Exige finance:approve e verificação em duas etapas recente.
export async function returnPeriodToOpen(referenceMonth, reason) {
  return apiFetch("/finance/period-closures/return-to-open", { method: "POST", body: { referenceMonth, reason } });
}

// --- Orçamento/projeção (budgets x realizado) ---
// GAP REAL CORRIGIDO (verificação cética final do Marco 4, 11/10/2026): finance.budgets_forecasts
// (service, model, migration, rotas) foi implementado na varredura do Caderno, mas ficou sem
// tela — mesma classe de problema do extrato bancário (FIN-TS-007). Ver
// NayaraOne--API/src/features/finance/budgetsForecasts.service.js.

export async function listBudgetForecasts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.competenceMonth) query.set("competenceMonth", filters.competenceMonth);
  if (filters.nature) query.set("nature", filters.nature);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/finance/budget-forecasts${suffix}`);
}

export async function createBudgetForecast(payload) {
  return apiFetch("/finance/budget-forecasts", { method: "POST", body: payload });
}

export async function compareBudgetForecastToRealized(competenceMonth) {
  const query = new URLSearchParams({ competenceMonth });
  return apiFetch(`/finance/budget-forecasts/compare?${query.toString()}`);
}
