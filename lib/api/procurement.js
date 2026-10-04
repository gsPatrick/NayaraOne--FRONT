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
export async function listDiscrepancies(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/procurement/discrepancies${suffix}`);
}

export async function evaluateSupplier(payload) {
  return apiFetch("/procurement/supplier-evaluations", { method: "POST", body: payload });
}
