// Autorização em duas pessoas do Financeiro (Guia M4 §8 e §15; Caderno §16): caso de estorno e pedido de reabertura de período.
// Contrato em src/modules/finance/presentation/http/finance.routes.js e finance-authorization.controller.js da API. As rotas que exigem
// MFA recente respondem 403 MFA_STEP_UP_REQUIRED e o <MfaStepUpHost/> pede o código e repete a chamada (lib/api/client.js).
import { apiFetch } from "@/lib/api/client";

function query(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, value);
  });
  const text = qs.toString();
  return text ? `?${text}` : "";
}

// --- Estorno: o pedido (POST /finance/entries/:id/reverse, 202) abre o caso; outra pessoa aprova ou recusa ---

export async function listReversalCases({ status, entryId } = {}) {
  return apiFetch(`/finance/reversal-cases${query({ status, entryId })}`);
}

export async function approveReversalCase(id) {
  return apiFetch(`/finance/reversal-cases/${id}/approve`, { method: "POST", body: {} });
}

export async function rejectReversalCase(id, reason) {
  return apiFetch(`/finance/reversal-cases/${id}/reject`, { method: "POST", body: reason ? { reason } : {} });
}

// --- Reabertura de período (fluxo CRITICAL): o pedido (POST /finance/period-closures/reopen, 202) não reabre; outra pessoa decide ---

export async function listPeriodReopenRequests({ status } = {}) {
  return apiFetch(`/finance/period-closures/reopen-requests${query({ status })}`);
}

export async function approvePeriodReopenRequest(id) {
  return apiFetch(`/finance/period-closures/reopen-requests/${id}/approve`, { method: "POST", body: {} });
}

export async function rejectPeriodReopenRequest(id) {
  return apiFetch(`/finance/period-closures/reopen-requests/${id}/reject`, { method: "POST", body: {} });
}
