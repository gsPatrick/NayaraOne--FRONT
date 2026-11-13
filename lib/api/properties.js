// Chamadas ao módulo de Imóveis da API real.
// Contrato confirmado em NayaraOne--API/src/features/properties/ (properties.service.js,
// propertyOwners/propertyOffers/propertyMedia/propertyDocuments/
// propertyInternalOccurrences.service.js e properties.routes.js).

import { apiFetch } from "@/lib/api/client";
import { planDocumentation } from "@/lib/properties/documentPlan";

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
    regularizationStatus: REGULARIZATION_TO_LABEL[regularization?.status] || "",
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
    publicAddressPolicy: apiProperty.publicAddressPolicy || "SO_BAIRRO",
    addressVisibility: apiProperty.addressVisibility || "RESTRICTED",
    descriptionPublic: apiProperty.descriptionPublic || "",
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
    media: (apiProperty.media || []).map(mapMedia),
    // Documentos com o arquivo (Marco 3 §6): só o documento com arquivo conta para publicar.
    documents: (apiProperty.documents || []).map(mapDocument),
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

export function mapMedia(m) {
  return {
    id: m.id,
    type: MEDIA_TYPE_TO_LABEL[m.mediaType] || "image",
    mediaType: m.mediaType,
    label: m.originalName || "",
    storageKey: m.storageKey,
    fileId: m.fileId || null,
    position: m.position,
    qualityStatus: m.qualityStatus || "PENDING",
  };
}

export function mapDocument(d) {
  return {
    id: d.id,
    documentType: d.documentType,
    fileId: d.fileId || null,
    label: d.label || "",
    valueNumber: d.valueNumber || "",
    valueAmount: d.valueAmount != null ? Number(d.valueAmount) : null,
    status: d.status || null,
    createdAt: d.createdAt || d.created_at || null,
  };
}

// confidentialMinPrice só vem da API para quem tem properties:internal (Marco 3, M3-07); sem a permissão a chave não existe.
export function mapOffer(apiOffer) {
  if (!apiOffer) return null;
  return {
    id: apiOffer.id,
    offerType: apiOffer.offerType,
    askingPrice: apiOffer.askingPrice != null ? Number(apiOffer.askingPrice) : null,
    confidentialMinPrice: apiOffer.confidentialMinPrice != null ? Number(apiOffer.confidentialMinPrice) : null,
    acceptsFinancing: !!apiOffer.acceptsFinancing,
    acceptsTrade: !!apiOffer.acceptsTrade,
    conditions: apiOffer.conditions || "",
    status: apiOffer.status,
    supersededByOfferId: apiOffer.supersededByOfferId || null,
    supersededAt: apiOffer.supersededAt || null,
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

// FIX (homologação 23/09/2026, tela de edição de imóvel): property_owners só guarda o
// `personId` — o nome do proprietário mora no cadastro de Pessoas. mapProperty() não resolvia
// esse nome, então `owner.name` vinha `undefined`. A ficha do imóvel resolvia por conta
// própria, mas a tela de edição não: ela faz `owners.some((o) => o.name.trim())` pra calcular o
// preenchimento da etapa, o que estourava "Cannot read properties of undefined (reading
// 'trim')" e deixava a tela de edição COMPLETAMENTE EM BRANCO pra qualquer imóvel que tivesse
// ao menos um proprietário cadastrado. Resolver o nome aqui, na fronteira da API, conserta a
// causa raiz pra todos os consumidores de getProperty() de uma vez (e faz o PersonPicker da
// edição vir pré-preenchido com o proprietário atual, como esperado numa tela de edição).
export async function getProperty(id) {
  const property = mapProperty(await apiFetch(`/properties/${id}`));
  if (!property) return property;

  const personIds = [...new Set(property.owners.map((o) => o.personId).filter(Boolean))];
  if (personIds.length === 0) return property;

  const names = new Map();
  await Promise.all(
    personIds.map(async (personId) => {
      try {
        const person = await apiFetch(`/people/${personId}`);
        names.set(personId, person?.legalName || "");
      } catch {
        names.set(personId, "");
      }
    })
  );

  property.owners = property.owners.map((o) => ({ ...o, name: names.get(o.personId) || "" }));
  return property;
}

// `idempotencyKey` (M9-D850): o reenvio da criação usa a mesma chave e a API não cria outro imóvel.
export async function createProperty(payload, { idempotencyKey } = {}) {
  return mapProperty(await apiFetch("/properties", { method: "POST", body: payload, ...(idempotencyKey ? { idempotencyKey } : {}) }));
}

export async function updateProperty(id, payload) {
  return mapProperty(await apiFetch(`/properties/${id}`, { method: "PATCH", body: payload }));
}

// `confirmation` (M9-D852, linha 4): corpo de confirmação do ConfirmAction (understood + impactToken).
export async function deleteProperty(id, confirmation) {
  return apiFetch(`/properties/${id}`, { method: "DELETE", ...(confirmation ? { body: { confirmation } } : {}) });
}

// --- Proprietários ---

export async function addPropertyOwner(propertyId, { personId, roleCode, ownershipPercent }, { idempotencyKey } = {}) {
  return apiFetch(`/properties/${propertyId}/owners`, {
    method: "POST",
    ...(idempotencyKey ? { idempotencyKey } : {}),
    body: {
      personId,
      ...(roleCode ? { roleCode } : {}),
      ...(ownershipPercent !== undefined && ownershipPercent !== "" ? { ownershipPercent } : {}),
    },
  });
}

export async function updatePropertyOwner(propertyId, ownerId, { roleCode, ownershipPercent, validFrom, validUntil, changeEvidence }) {
  const body = {};
  if (changeEvidence) body.changeEvidence = changeEvidence; // M9-D807: origem da alteração do vínculo
  if (roleCode !== undefined) body.roleCode = roleCode;
  if (ownershipPercent !== undefined) body.ownershipPercent = ownershipPercent === "" ? null : ownershipPercent;
  if (validFrom !== undefined) body.validFrom = validFrom || null;
  if (validUntil !== undefined) body.validUntil = validUntil || null;
  return apiFetch(`/properties/${propertyId}/owners/${ownerId}`, { method: "PATCH", body });
}

export async function removePropertyOwner(propertyId, ownerId, changeEvidence) {
  return apiFetch(`/properties/${propertyId}/owners/${ownerId}`, { method: "DELETE", ...(changeEvidence ? { body: { changeEvidence } } : {}) });
}

// --- Ofertas ---

export async function createOffer(propertyId, payload, { idempotencyKey } = {}) {
  return mapOffer(await apiFetch(`/properties/${propertyId}/offers`, { method: "POST", body: payload, ...(idempotencyKey ? { idempotencyKey } : {}) }));
}

export async function updateOffer(propertyId, offerId, payload) {
  return mapOffer(await apiFetch(`/properties/${propertyId}/offers/${offerId}`, { method: "PATCH", body: payload }));
}

// POST /offers/:id/publish — aplica o motor de regras de publicação (REG-IMO-001 e afins) e
// só então publica a oferta; erros de regra voltam como ApiError com a mensagem da API.
export async function publishOffer(offerId) {
  return apiFetch(`/offers/${offerId}/publish`, { method: "POST" });
}

// --- Arquivo real (Marco 3 §6, verificação de 11/11/2026) ---
// O arquivo sobe primeiro (POST /files, antivírus na API) e o documento/mídia aponta para ele por fileId.
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop());
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

export async function uploadPropertyFile(file, category) {
  const contentBase64 = await readFileAsBase64(file);
  return apiFetch("/files", {
    method: "POST",
    body: { fileName: file.name, mimeType: file.type || "application/octet-stream", contentBase64, category },
  });
}

// --- Mídia ---

// A qualidade nunca vai no envio: toda mídia nasce PENDENTE e só a revisão aprova (a API recusa qualityStatus no corpo).
export async function addPropertyMedia(propertyId, { mediaType, fileId, originalName, position }) {
  return apiFetch(`/properties/${propertyId}/media`, {
    method: "POST",
    body: { mediaType, fileId, ...(originalName ? { originalName } : {}), ...(position !== undefined ? { position } : {}) },
  });
}

// Sobe o arquivo e anexa como mídia do imóvel (foto = IMAGE, vídeo = VIDEO).
export async function uploadPropertyMedia(propertyId, file, { mediaType, position } = {}) {
  const type = mediaType || (String(file.type || "").startsWith("video/") ? "VIDEO" : "IMAGE");
  const uploaded = await uploadPropertyFile(file, "property-media");
  return addPropertyMedia(propertyId, { mediaType: type, fileId: uploaded.id, originalName: file.name, position });
}

// Revisão de qualidade (livro do Marco 3 §7): só foto APROVADA conta para publicar; recusar exige motivo.
export async function reviewPropertyMediaQuality(propertyId, mediaId, { qualityStatus, reason }) {
  return apiFetch(`/properties/${propertyId}/media/${mediaId}/quality`, {
    method: "PATCH",
    body: { qualityStatus, ...(reason ? { reason } : {}) },
  });
}

export async function removePropertyMedia(propertyId, mediaId) {
  return apiFetch(`/properties/${propertyId}/media/${mediaId}`, { method: "DELETE" });
}

// --- Documentos (IPTU, condomínio, matrícula, certidão de regularização) ---

export async function addPropertyDocument(propertyId, payload) {
  return apiFetch(`/properties/${propertyId}/documents`, { method: "POST", body: payload });
}

export async function listPropertyDocuments(propertyId) {
  return apiFetch(`/properties/${propertyId}/documents`);
}

export async function removePropertyDocument(propertyId, documentId) {
  return apiFetch(`/properties/${propertyId}/documents/${documentId}`, { method: "DELETE" });
}

// Grava o bloco de documentação da tela como documentos do imóvel COM ARQUIVO (Marco 3 §6: o documento é o arquivo real,
// passado pelo antivírus). `files` = { IPTU: File, CONDO_FEE: File, REGISTRY: File, REGULARIZATION_CERTIFICATE: File }.
// Regras (lib/properties/documentPlan.js): o tipo com dado e sem arquivo (novo ou já anexado) não é salvo e volta em
// `missingFiles` para a tela avisar; o tipo já anexado e sem arquivo novo reaproveita o arquivo atual; a API não tem PATCH
// de documento, então o "upsert" apaga a linha anterior do tipo e recria.
export async function savePropertyDocumentation(propertyId, docs, files = {}) {
  const existing = (await listPropertyDocuments(propertyId)) || [];
  const plan = planDocumentation(docs, files, existing);
  if (plan.missingFiles.length > 0) {
    const error = new Error(`Anexe o arquivo de: ${plan.missingFiles.map((m) => m.label).join(", ")}. O documento só é salvo com o arquivo.`);
    error.code = "PROPERTY_FILE_REQUIRED";
    throw error;
  }
  for (const row of plan.rows) {
    let fileId = row.reuseFileId;
    if (row.file) fileId = (await uploadPropertyFile(row.file, "property-documents")).id;
    for (const old of row.replaceIds) await removePropertyDocument(propertyId, old);
    await addPropertyDocument(propertyId, { ...row.payload, fileId });
  }
  return plan.rows.length;
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
