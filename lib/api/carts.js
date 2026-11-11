// Carrinho de imóveis da oportunidade (livro do Marco 3 §14). Contrato: NayaraOne--API/src/features/crm (carts.service.js,
// cartQueries.service.js) e a rota pública em src/routes/index.js.
import { apiFetch } from "@/lib/api/client";

// Carrinhos da oportunidade com versões (o que foi enviado), link, status efetivo e rastreio (visualizações e cliques).
export async function listOpportunityCarts(opportunityId) {
  return (await apiFetch(`/opportunities/${opportunityId}/carts`)) || [];
}

// expiresAt opcional: sem ele vale o prazo configurado pela empresa (Configurações > Imóveis e CRM).
export async function createCart(opportunityId, { propertyIds, expiresAt }) {
  return apiFetch(`/opportunities/${opportunityId}/carts`, { method: "POST", body: { propertyIds, ...(expiresAt ? { expiresAt } : {}) } });
}

// Cada mudança de imóveis cria uma nova versão (a anterior fica guardada).
export async function updateCartItems(cartId, propertyIds) {
  return apiFetch(`/carts/${cartId}/items`, { method: "PATCH", body: { propertyIds } });
}

export async function generateCartShareLink(cartId) {
  return apiFetch(`/carts/${cartId}/share-link`, { method: "POST" });
}

// --- Página pública (sem login) ---
export async function getPublicCart(token) {
  return apiFetch(`/crm/carts/public/${encodeURIComponent(token)}`, { skipAuth: true, skipRefresh: true });
}

export async function clickPublicCartProperty(token, propertyId) {
  return apiFetch(`/crm/carts/public/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/click`, { method: "POST", skipAuth: true, skipRefresh: true });
}
