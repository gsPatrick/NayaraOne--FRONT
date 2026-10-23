// Chamadas ao módulo de Billing/Locação da API real.
// Backend confirmado em NayaraOne--API/src/features/billing/ (billingSchedule.service.js,
// rentAdjustment.service.js, utilities.service.js, billing.routes.js). Existia pronto e
// testado desde antes, mas nenhuma tela o expunha — gap real achado na auditoria externa
// (11/10/2026, "Billing mensal automático... não foi encontrado").

import { apiFetch } from "@/lib/api/client";

// --- Cronogramas de cobrança (competências) ---

export async function listBillingSchedules(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/schedules${qs ? `?${qs}` : ""}`);
}

export async function getBillingSchedule(id) {
  return apiFetch(`/billing/schedules/${id}`);
}

export async function generateBillingSchedule(payload) {
  return apiFetch("/billing/schedules", { method: "POST", body: payload });
}

export async function registerBillingSchedulePayment(id, amountPaid) {
  return apiFetch(`/billing/schedules/${id}/payments`, { method: "POST", body: { amountPaid } });
}

// --- Reajuste de aluguel (IGPM/IPCA) ---

export async function listRentAdjustments(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/rent-adjustments${qs ? `?${qs}` : ""}`);
}

export async function getRentAdjustment(id) {
  return apiFetch(`/billing/rent-adjustments/${id}`);
}

export async function requestRentAdjustment(payload) {
  return apiFetch("/billing/rent-adjustments", { method: "POST", body: payload });
}

// --- Obrigações locatícias (água/luz/condomínio/IPTU — comprovante de transferência) ---

export async function listUtilityObligations(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/utility-obligations${qs ? `?${qs}` : ""}`);
}

export async function getUtilityObligation(id) {
  return apiFetch(`/billing/utility-obligations/${id}`);
}

export async function createUtilityObligation(payload) {
  return apiFetch("/billing/utility-obligations", { method: "POST", body: payload });
}

export async function createUtilityAccount(payload) {
  return apiFetch("/billing/utility-accounts", { method: "POST", body: payload });
}

export async function recordUtilityPayment(id, payload) {
  return apiFetch(`/billing/utility-obligations/${id}/payments`, { method: "POST", body: payload });
}

// --- Cobrança em atraso ---

export async function listCollectionCases(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/collection-cases${qs ? `?${qs}` : ""}`);
}

export async function openCollectionCase(payload) {
  return apiFetch("/billing/collection-cases", { method: "POST", body: payload });
}

export async function createCollectionAgreement(id, payload) {
  return apiFetch(`/billing/collection-cases/${id}/agreements`, { method: "POST", body: payload });
}

// GAP REAL CORRIGIDO (varredura completa do Marco 5 contra o addendum "Cobrança de locação +
// utilidades" do Caderno, 12/10/2026): guaranteed-rent, rent-advances, ownership-transfer-tasks
// e closeout tinham service + rota completos desde o mesmo gap de origem do billing mensal,
// mas NENHUMA das 4 features tinha função de cliente nem tela — invisíveis para qualquer
// usuário fora de chamada direta à API.

// --- Aluguel garantido (obrigação da empresa ao proprietário + crédito a recuperar) ---

export async function listGuaranteedRentContracts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/guaranteed-rent${qs ? `?${qs}` : ""}`);
}

export async function enrollGuaranteedRent(payload) {
  return apiFetch("/billing/guaranteed-rent", { method: "POST", body: payload });
}

export async function payGuaranteedRent(id, payload) {
  return apiFetch(`/billing/guaranteed-rent/${id}/pay`, { method: "POST", body: payload });
}

// --- Antecipação de aluguel (produto separado: elegibilidade/proposta/aceite/pagamento/recuperação) ---

export async function listRentAdvances(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/billing/rent-advances${qs ? `?${qs}` : ""}`);
}

export async function requestRentAdvance(payload) {
  return apiFetch("/billing/rent-advances", { method: "POST", body: payload });
}

export async function proposeRentAdvance(id) {
  return apiFetch(`/billing/rent-advances/${id}/propose`, { method: "POST" });
}

export async function acceptRentAdvance(id) {
  return apiFetch(`/billing/rent-advances/${id}/accept`, { method: "POST" });
}

export async function payRentAdvance(id) {
  return apiFetch(`/billing/rent-advances/${id}/pay`, { method: "POST" });
}

export async function recoverRentAdvance(id, amountRecovered) {
  return apiFetch(`/billing/rent-advances/${id}/recover`, { method: "POST", body: { amountRecovered } });
}

// --- Encerramento de contrato (closeout) ---

export async function checkCloseoutEligibility(contractId) {
  return apiFetch(`/billing/contracts/${contractId}/closeout-eligibility`);
}

export async function closeoutContract(contractId) {
  return apiFetch(`/billing/contracts/${contractId}/closeout`, { method: "POST" });
}

// --- Troca de titularidade de utilidade ---

export async function requestOwnershipTransfer(utilityObligationId, payload = {}) {
  return apiFetch(`/billing/utility-obligations/${utilityObligationId}/ownership-transfer`, { method: "POST", body: payload });
}

export async function completeOwnershipTransferTask(id, payload) {
  return apiFetch(`/billing/ownership-transfer-tasks/${id}/complete`, { method: "POST", body: payload });
}

// --- Régua de cobrança (REG-LOC-004, Motor de Regras) ---

export async function getCollectionCadence() {
  return apiFetch("/billing/collection-cadence");
}

export async function publishCollectionCadence(steps) {
  return apiFetch("/billing/collection-cadence/versions", { method: "POST", body: { steps } });
}

export async function listCollectionCadenceSteps(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`/billing/collection-cadence/steps${qs ? `?${qs}` : ""}`);
}
