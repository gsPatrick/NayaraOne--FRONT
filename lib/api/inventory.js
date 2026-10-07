// Chamadas ao módulo de Estoque/Patrimônio (Marco 7) da API real.
// Contrato confirmado em NayaraOne--API/src/features/inventory/ (items.service.js,
// movements.service.js, receipts.service.js, requisitions.service.js, assets.service.js,
// toolLoans.service.js, maintenance.service.js, lossCases.service.js, counts.service.js).

import { apiFetch } from "@/lib/api/client";

// --- Itens ---
export async function listInventoryItems(filters = {}) {
  const query = new URLSearchParams();
  if (filters.itemType) query.set("itemType", filters.itemType);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/inventory/items${suffix}`);
}
export async function getInventoryItem(id) {
  return apiFetch(`/inventory/items/${id}`);
}
export async function createInventoryItem(payload) {
  return apiFetch("/inventory/items", { method: "POST", body: payload });
}
export async function getItemBalances(id) {
  return apiFetch(`/inventory/items/${id}/balances`);
}

// --- Locais ---
export async function listInventoryLocations() {
  return apiFetch("/inventory/locations");
}
export async function createInventoryLocation(payload) {
  return apiFetch("/inventory/locations", { method: "POST", body: payload });
}

// --- Movimentos ---
export async function recordInventoryMovement(payload) {
  return apiFetch("/inventory/movements", { method: "POST", body: payload });
}

// --- Recebimentos (NF) ---
export async function listReceipts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/inventory/receipts${suffix}`);
}
export async function getReceipt(id) {
  return apiFetch(`/inventory/receipts/${id}`);
}
export async function createReceipt(payload) {
  return apiFetch("/inventory/receipts", { method: "POST", body: payload });
}
export async function reviewReceipt(id) {
  return apiFetch(`/inventory/receipts/${id}/review`, { method: "POST" });
}
export async function confirmReceipt(id) {
  return apiFetch(`/inventory/receipts/${id}/confirm`, { method: "POST" });
}

// --- Requisições ---
export async function listRequisitions(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.projectId) query.set("projectId", filters.projectId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/inventory/requisitions${suffix}`);
}
export async function getRequisition(id) {
  return apiFetch(`/inventory/requisitions/${id}`);
}
export async function createRequisition(payload) {
  return apiFetch("/inventory/requisitions", { method: "POST", body: payload });
}
export async function decideRequisition(id, decision) {
  return apiFetch(`/inventory/requisitions/${id}/decide`, { method: "POST", body: { decision } });
}
export async function issueRequisition(id) {
  return apiFetch(`/inventory/requisitions/${id}/issue`, { method: "POST" });
}

// --- Patrimônio / QR ---
export async function listAssets(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/assets${suffix}`);
}
export async function createAsset(payload) {
  return apiFetch("/assets", { method: "POST", body: payload });
}
export async function getAssetByTag(tag) {
  return apiFetch(`/assets/by-tag/${encodeURIComponent(tag)}`);
}
export async function transferAsset(id, payload) {
  return apiFetch(`/assets/${id}/transfer`, { method: "POST", body: payload });
}
// BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 52, 2026-10-05): toda transferência já
// gerava um AssetMovement, mas não existia forma de ler esse histórico de volta.
export async function listAssetMovements(id) {
  return apiFetch(`/assets/${id}/movements`);
}
export async function updateAsset(id, payload) {
  return apiFetch(`/assets/${id}`, { method: "PATCH", body: payload });
}

// --- Empréstimo de ferramenta ---
export async function listToolLoans(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.assetId) query.set("assetId", filters.assetId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/tool-loans${suffix}`);
}
export async function loanTool(assetId, payload) {
  return apiFetch(`/assets/${assetId}/loan`, { method: "POST", body: payload });
}
export async function returnTool(loanId, payload) {
  return apiFetch(`/tool-loans/${loanId}/return`, { method: "POST", body: payload });
}

// --- Manutenção ---
export async function listMaintenanceOrders(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.assetId) query.set("assetId", filters.assetId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/maintenance-orders${suffix}`);
}
// BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 33, 2026-10-05): o endpoint
// POST /maintenance-orders (abertura manual/preventiva, listado no contrato) existia na API
// desde a rodada 14, mas nenhuma função do client chamava — a única forma de uma OS existir
// era indiretamente, via devolução de ferramenta danificada.
export async function openMaintenanceOrder(payload) {
  return apiFetch(`/maintenance-orders`, { method: "POST", body: payload });
}
export async function closeMaintenanceOrder(id) {
  return apiFetch(`/maintenance-orders/${id}/close`, { method: "POST" });
}

// --- Perdas/quebras/extravios ---
export async function listLossCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/inventory/loss-cases${suffix}`);
}
export async function openLossCase(payload) {
  return apiFetch("/inventory/loss-cases", { method: "POST", body: payload });
}
export async function decideLossCase(id, decision) {
  return apiFetch(`/inventory/loss-cases/${id}/decide`, { method: "POST", body: { decision } });
}

// --- Inventário físico (contagem) ---
export async function listCounts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/inventory/counts${suffix}`);
}
export async function getCount(id) {
  return apiFetch(`/inventory/counts/${id}`);
}
export async function openCount(payload) {
  return apiFetch("/inventory/counts", { method: "POST", body: payload });
}
export async function addCountItem(countId, payload) {
  return apiFetch(`/inventory/counts/${countId}/items`, { method: "POST", body: payload });
}
export async function completeCount(id) {
  return apiFetch(`/inventory/counts/${id}/complete`, { method: "POST" });
}
export async function applyCountAdjustment(countItemId) {
  return apiFetch(`/inventory/count-items/${countItemId}/apply-adjustment`, { method: "POST" });
}
