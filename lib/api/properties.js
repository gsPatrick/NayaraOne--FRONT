// Chamadas ao módulo de Imóveis da API real.
// Contrato confirmado em NayaraOne--API/src/features/properties/ (properties.service.js,
// propertyOwners/propertyOffers/propertyMedia/propertyDocuments/
// propertyInternalOccurrences.service.js e properties.routes.js).

import { apiFetch } from "@/lib/api/client";

// real_estate.properties.property_type é um enum em inglês; as telas (filtros e formulários)
// sempre trabalharam com os rótulos em português. A tradução mora só aqui, na fronteira.
const TYPE_TO_LABEL = {
  RESIDENTIAL: "Residencial",
  COMMERCIAL: "Comercial",
  LAND: "Terreno",
  RURAL: "Rural",
};
const LABEL_TO_TYPE = Object.fromEntries(Object.entries(TYPE_TO_LABEL).map(([k, v]) => [v, k]));

// property_documents.status (REGULARIZADO|EM_ANALISE|PENDENTE) <-> REGULARIZATION_OPTIONS do form.
const REGULARIZATION_TO_LABEL = {
  REGULARIZADO: "Regularizado",
  EM_ANALISE: "Em análise",
  PENDENTE: "Pendente",
};
const LABEL_TO_REGULARIZATION = Object.fromEntries(
  Object.entries(REGULARIZATION_TO_LABEL).map(([k, v]) => [v, k])
);

const MEDIA_TYPE_TO_LABEL = { IMAGE: "image", VIDEO: "video" };

export function toApiPropertyType(label) {
  return LABEL_TO_TYPE[label] || String(label || "").toUpperCase();
}

export function toApiRegularizationStatus(label) {
  return LABEL_TO_REGULARIZATION[label] || null;
}

// Reconstrói o bloco "documentação" da tela a partir das linhas de property_documents
// (um registro por tipo) somado às colunas próprias de matrícula que vivem em properties.
function buildDocumentation(apiProperty) {
  const documents = apiProperty.documents || [];
  const byType = (type) => documents.find((d) => d.documentType === type);
  const iptu = byType("IPTU");
  const condo = byType("CONDO_FEE");
  const registry = byType("REGISTRY");
  const regularization = byType("REGULARIZATION_CERTIFICATE");

  return {
    registryNumber: apiProperty.registryNumber || registry?.valueNumber || "",
    registryOffice: apiProperty.registryOffice || registry?.label || "",
    iptuNumber: iptu?.valueNumber || "",
    condoFee: condo?.valueAmount != null ? Number(condo.valueAmount) : "",
    regularizationStatus: REGULARIZATION_TO_LABEL[regularization?.status] || "Regularizado",
  };
}

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
    type: TYPE_TO_LABEL[apiProperty.propertyType] || apiProperty.propertyType || "",
    publicationStatus: apiProperty.publicationStatus,
    availabilityStatus: apiProperty.availabilityStatus,
    neighborhood: address?.neighborhood || "",
    // A lista mostra "Cidade, UF" numa string só.
    city: [address?.city || apiProperty.city, address?.state || apiProperty.state].filter(Boolean).join(", "),
    areaM2: apiProperty.areaTotalM2 != null ? Number(apiProperty.areaTotalM2) : null,
    bedrooms: apiProperty.bedrooms,
    parkingSpots: apiProperty.parkingSpots,
    description: apiProperty.description || "",
    features: apiProperty.attributesJson || {},
    documentation: buildDocumentation(apiProperty),
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
    media: (apiProperty.media || []).map((m) => ({
      id: m.id,
      type: MEDIA_TYPE_TO_LABEL[m.mediaType] || "image",
      label: m.originalName || "",
      storageKey: m.storageKey,
      position: m.position,
    })),
    owners: (apiProperty.owners || []).map((o) => ({
      id: o.id,
      personId: o.personId,
      roleCode: o.roleCode,
      percentage: o.ownershipPercent != null ? Number(o.ownershipPercent) : null,
      ownershipPercent: o.ownershipPercent != null ? Number(o.ownershipPercent) : null,
      validFrom: o.validFrom,
      validUntil: o.validUntil,
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

export function mapOccurrence(apiOccurrence) {
  return {
    id: apiOccurrence.id,
    occurrenceType: apiOccurrence.occurrenceType,
    description: apiOccurrence.description || "",
    visibility: apiOccurrence.visibility,
    createdBy: apiOccurrence.createdBy,
    createdAt: apiOccurrence.created_at || apiOccurrence.createdAt,
  };
}

export async function listProperties(filters = {}) {
  const query = new URLSearchParams();
  if (filters.propertyType) query.set("propertyType", toApiPropertyType(filters.propertyType));
  if (filters.publicationStatus) query.set("publicationStatus", filters.publicationStatus);
  if (filters.availabilityStatus) query.set("availabilityStatus", filters.availabilityStatus);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/properties${suffix}`);
  return (data || []).map(mapProperty);
}

export async function getProperty(id) {
  return mapProperty(await apiFetch(`/properties/${id}`));
}

export async function createProperty(payload) {
  return mapProperty(await apiFetch("/properties", { method: "POST", body: payload }));
}

export async function updateProperty(id, payload) {
  return mapProperty(await apiFetch(`/properties/${id}`, { method: "PATCH", body: payload }));
}

export async function deleteProperty(id) {
  return apiFetch(`/properties/${id}`, { method: "DELETE" });
}

// --- Proprietários ---

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

export async function removePropertyOwner(propertyId, ownerId) {
  return apiFetch(`/properties/${propertyId}/owners/${ownerId}`, { method: "DELETE" });
}

// --- Ofertas ---

export async function createOffer(propertyId, payload) {
  return mapOffer(await apiFetch(`/properties/${propertyId}/offers`, { method: "POST", body: payload }));
}

export async function updateOffer(propertyId, offerId, payload) {
  return mapOffer(await apiFetch(`/properties/${propertyId}/offers/${offerId}`, { method: "PATCH", body: payload }));
}

// POST /offers/:id/publish — aplica o motor de regras de publicação (REG-IMO-001 e afins) e
// só então publica a oferta; erros de regra voltam como ApiError com a mensagem da API.
export async function publishOffer(offerId) {
  return apiFetch(`/offers/${offerId}/publish`, { method: "POST" });
}

// --- Mídia ---

export async function addPropertyMedia(propertyId, { mediaType, storageKey, originalName, position }) {
  return apiFetch(`/properties/${propertyId}/media`, {
    method: "POST",
    body: { mediaType, storageKey, originalName, ...(position !== undefined ? { position } : {}) },
  });
}

export async function removePropertyMedia(propertyId, mediaId) {
  return apiFetch(`/properties/${propertyId}/media/${mediaId}`, { method: "DELETE" });
}

// --- Documentos (IPTU, condomínio, matrícula, certidão de regularização) ---

export async function addPropertyDocument(propertyId, payload) {
  return apiFetch(`/properties/${propertyId}/documents`, { method: "POST", body: payload });
}

// Grava o bloco de documentação da tela como as linhas correspondentes de property_documents.
// Só cria as linhas que o operador realmente preencheu.
export async function savePropertyDocumentation(propertyId, docs) {
  const rows = [];
  if (docs.iptuNumber) rows.push({ documentType: "IPTU", valueNumber: docs.iptuNumber });
  if (docs.condoFee !== "" && docs.condoFee != null) {
    rows.push({ documentType: "CONDO_FEE", valueAmount: Number(docs.condoFee) });
  }
  if (docs.registryNumber || docs.registryOffice) {
    rows.push({ documentType: "REGISTRY", valueNumber: docs.registryNumber || null, label: docs.registryOffice || null });
  }
  const status = toApiRegularizationStatus(docs.regularizationStatus);
  if (status) rows.push({ documentType: "REGULARIZATION_CERTIFICATE", status });

  for (const row of rows) {
    await addPropertyDocument(propertyId, row);
  }
  return rows.length;
}

// --- Histórico de preço ---
// O histórico é gravado por oferta; o endpoint devolve o de todas as ofertas do imóvel, já
// ordenado do mais recente para o mais antigo (é como a linha do tempo da ficha exibe).
export async function listPriceHistory(propertyId) {
  const data = await apiFetch(`/properties/${propertyId}/price-history`);
  return (data || []).map((h) => ({
    id: h.id,
    price: h.newPrice != null ? Number(h.newPrice) : null,
    recordedAt: h.changedAt,
    reason: h.reasonCode || "",
  }));
}

// --- Ocorrências internas (exigem a permissão properties:internal) ---

export async function listOccurrences(propertyId) {
  const data = await apiFetch(`/properties/${propertyId}/occurrences`);
  return (data || []).map(mapOccurrence);
}

export async function createOccurrence(propertyId, { occurrenceType, description }) {
  return mapOccurrence(await apiFetch(`/properties/${propertyId}/occurrences`, {
    method: "POST",
    body: { occurrenceType, description },
  }));
}
