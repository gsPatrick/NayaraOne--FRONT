// Chamadas ao módulo de Compras/Procurement (Marco 7) da API real.
// Contrato confirmado em NayaraOne--API/src/features/procurement/procurement.service.js.

import { apiFetch } from "@/lib/api/client";

export async function listPurchaseRequests(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/procurement/purchase-requests${suffix}`);
}
export async function getPurchaseRequest(id) {
  return apiFetch(`/procurement/purchase-requests/${id}`);
}
// BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 50, 2026-10-05): o backend aceita
// projectId/notes desde sempre, mas a tela de Compras nunca os encaminhava — perdendo a
// rastreabilidade de custo por obra que o fluxo RFQ->PO->recebimento deveria alimentar.
export async function createPurchaseRequest(payload) {
  return apiFetch("/procurement/purchase-requests", { method: "POST", body: payload });
}
export async function decidePurchaseRequest(id, decision) {
  return apiFetch(`/procurement/purchase-requests/${id}/decide`, { method: "POST", body: { decision } });
}

export async function createQuotation(purchaseRequestId) {
  return apiFetch(`/procurement/purchase-requests/${purchaseRequestId}/quotations`, { method: "POST" });
}
export async function submitSupplierOffer(quotationId, payload) {
  return apiFetch(`/procurement/quotations/${quotationId}/offers`, { method: "POST", body: payload });
}
export async function compareOffers(quotationId) {
  return apiFetch(`/procurement/quotations/${quotationId}/compare`);
}
export async function awardSupplierOffer(offerId) {
  return apiFetch(`/procurement/offers/${offerId}/award`, { method: "POST" });
}

export async function listPurchaseOrders(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/procurement/purchase-orders${suffix}`);
}
export async function getPurchaseOrder(id) {
  return apiFetch(`/procurement/purchase-orders/${id}`);
}
export async function confirmGoodsReceipt(purchaseOrderId, payload) {
  return apiFetch(`/procurement/purchase-orders/${purchaseOrderId}/goods-receipts`, { method: "POST", body: payload });
}
export async function listGoodsReceipts(purchaseOrderId) {
  return apiFetch(`/procurement/purchase-orders/${purchaseOrderId}/goods-receipts`);
}
export async function listDiscrepancies(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/procurement/discrepancies${suffix}`);
}

export async function resolveDiscrepancy(id, payload) {
  return apiFetch(`/procurement/discrepancies/${id}/resolve`, { method: "POST", body: payload });
}

export async function evaluateSupplier(payload) {
  return apiFetch("/procurement/supplier-evaluations", { method: "POST", body: payload });
}
export async function listSupplierEvaluations(supplierPersonId) {
  const query = supplierPersonId ? `?supplierPersonId=${supplierPersonId}` : "";
  return apiFetch(`/procurement/supplier-evaluations${query}`);
}

// Insurance Hub (Marco 7 — "COMPRAS/PROCUREMENT + SEGUROS").
export async function listInsurancePolicies(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/procurement/insurance-policies${suffix}`);
}
export async function getInsurancePolicy(id) {
  return apiFetch(`/procurement/insurance-policies/${id}`);
}
export async function createInsurancePolicy(payload) {
  return apiFetch("/procurement/insurance-policies", { method: "POST", body: payload });
}
export async function quoteInsurancePolicy(id, payload) {
  return apiFetch(`/procurement/insurance-policies/${id}/quote`, { method: "POST", body: payload });
}
export async function issueInsurancePolicy(id, payload) {
  return apiFetch(`/procurement/insurance-policies/${id}/issue`, { method: "POST", body: payload });
}
export async function openInsuranceClaim(policyId, payload) {
  return apiFetch(`/procurement/insurance-policies/${policyId}/claims`, { method: "POST", body: payload });
}
export async function submitInsuranceClaim(claimId) {
  return apiFetch(`/procurement/insurance-claims/${claimId}/submit`, { method: "POST" });
}
export async function attachInsurancePolicyDocument(policyId, fileId) {
  return apiFetch(`/procurement/insurance-policies/${policyId}/documents`, { method: "POST", body: { fileId } });
}
export async function listInsurancePolicyDocuments(policyId) {
  return apiFetch(`/procurement/insurance-policies/${policyId}/documents`);
}
export async function listInsurancePolicyInstallments(policyId) {
  return apiFetch(`/procurement/insurance-policies/${policyId}/installments`);
}
export async function payInsurancePolicyInstallment(installmentId, financialEntryId) {
  return apiFetch(`/procurement/insurance-installments/${installmentId}/pay`, { method: "POST", body: { financialEntryId } });
}
