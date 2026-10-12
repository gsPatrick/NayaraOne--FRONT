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
