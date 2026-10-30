// Anúncios do imóvel nos portais (Marco 9, M9-D232 e M9-D233) da API real.
// Contrato: GET /properties/:id/portal-listings (properties:read), POST .../publish e .../unpublish (properties:update, resposta 202 com a lista por portal).

import { apiFetch } from "@/lib/api/client";

export async function listPortalListings(propertyId) {
  return apiFetch(`/properties/${encodeURIComponent(propertyId)}/portal-listings`);
}

export async function publishToPortals(propertyId) {
  return apiFetch(`/properties/${encodeURIComponent(propertyId)}/portal-listings/publish`, { method: "POST", body: {} });
}

export async function unpublishFromPortals(propertyId) {
  return apiFetch(`/properties/${encodeURIComponent(propertyId)}/portal-listings/unpublish`, { method: "POST", body: {} });
}
