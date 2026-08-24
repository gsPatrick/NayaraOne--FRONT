// Chamadas ao módulo de Imóveis da API real.
// Contrato confirmado em NayaraOne--API/src/features/properties/ (properties.service.js,
// propertyOwners/propertyOffers/propertyInternalOccurrences.service.js e properties.routes.js).

import { apiFetch } from "@/lib/api/client";

// A API guarda o endereço em real_estate.property_addresses (relação `address`) e repete
// city/state/zip_code desnormalizados na própria linha do imóvel — as telas usam o endereço
// completo quando existe e caem no desnormalizado como fallback.
export function mapProperty(apiProperty) {
  if (!apiProperty) return null;

  const address = apiProperty.address || null;

  return {
    id: apiProperty.id,
    createdBy: apiProperty.createdBy,
    companyId: apiProperty.companyId,
    internalCode: apiProperty.internalCode || "",
    // real_estate.properties guarda o nome do anúncio em `title`; as telas chamam de `name`.
    name: apiProperty.title || "",
    type: apiProperty.propertyType || "",
    publicationStatus: apiProperty.publicationStatus,
    availabilityStatus: apiProperty.availabilityStatus,
    neighborhood: address?.neighborhood || "",
    city: [address?.city || apiProperty.city, address?.state || apiProperty.state].filter(Boolean).join(", "),
    areaM2: apiProperty.areaTotalM2 != null ? Number(apiProperty.areaTotalM2) : null,
    address: address
      ? {
          zipCode: address.zipCode || "",
          street: address.street || "",
          number: address.number || "",
          complement: address.complement || "",
          neighborhood: address.neighborhood || "",
          city: address.city || "",
          state: address.state || "",
          latitude: apiProperty.latitude != null ? Number(apiProperty.latitude) : null,
          longitude: apiProperty.longitude != null ? Number(apiProperty.longitude) : null,
        }
      : null,
    owners: (apiProperty.owners || []).map((o) => ({
      id: o.id,
      personId: o.personId,
      roleCode: o.roleCode,
      ownershipPercent: o.ownershipPercent != null ? Number(o.ownershipPercent) : null,
    })),
    offers: (apiProperty.offers || []).map(mapOffer),
    activeOffer: (apiProperty.offers || []).map(mapOffer).find((o) => o.status === "ACTIVE") || null,
  };
}

export function mapOffer(apiOffer) {
  if (!apiOffer) return null;
  return {
    id: apiOffer.id,
    offerType: apiOffer.offerType,
    askingPrice: apiOffer.askingPrice != null ? Number(apiOffer.askingPrice) : null,
    confidentialMinPrice: apiOffer.confidentialMinPrice != null ? Number(apiOffer.confidentialMinPrice) : null,
    acceptsFinancing: !!apiOffer.acceptsFinancing,
    acceptsTrade: !!apiOffer.acceptsTrade,
    status: apiOffer.status,
    startsAt: apiOffer.startsAt,
    endsAt: apiOffer.endsAt,
  };
}

export async function listProperties(filters = {}) {
  const query = new URLSearchParams();
  if (filters.propertyType) query.set("propertyType", filters.propertyType);
  if (filters.publicationStatus) query.set("publicationStatus", filters.publicationStatus);
  if (filters.availabilityStatus) query.set("availabilityStatus", filters.availabilityStatus);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/properties${suffix}`);
  return (data || []).map(mapProperty);
}

export async function getProperty(id) {
  return mapProperty(await apiFetch(`/properties/${id}`));
}

// POST /properties/:id/owners — vincula uma pessoa ao imóvel (real_estate.property_owners).
export async function addPropertyOwner(propertyId, { personId, roleCode, ownershipPercent }) {
  return apiFetch(`/properties/${propertyId}/owners`, {
    method: "POST",
    body: {
      personId,
      ...(roleCode ? { roleCode } : {}),
      ...(ownershipPercent !== undefined && ownershipPercent !== "" ? { ownershipPercent } : {}),
    },
  });
}
