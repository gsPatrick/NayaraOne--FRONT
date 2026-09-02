// Chamadas ao módulo de Contatos (Pessoas) da API real.
// Contrato confirmado em NayaraOne--API/src/features/people/ (person.service.js,
// personContacts/personDocuments/personRoles/personAddresses.service.js e people.routes.js).

import { apiFetch } from "@/lib/api/client";
import { formatTaxId } from "@/lib/format";

// A API guarda o documento só com dígitos em persons.tax_id_normalized; as telas mostram
// (e buscam por) o valor formatado, então a formatação acontece na fronteira do mapeamento.
// `taxIdRaw` fica disponível para quem precisa reenviar o valor à API.
export function mapPerson(apiPerson) {
  if (!apiPerson) return null;

  const addresses = apiPerson.addresses || [];
  const currentAddress = addresses.find((a) => a.isCurrent) || addresses[0] || null;

  return {
    id: apiPerson.id,
    personType: apiPerson.personType,
    legalName: apiPerson.legalName,
    preferredName: apiPerson.preferredName || "",
    taxIdRaw: apiPerson.taxIdNormalized || "",
    taxIdNormalized: formatTaxId(apiPerson.taxIdNormalized, apiPerson.personType),
    birthOrFoundationDate: apiPerson.birthOrFoundationDate,
    status: apiPerson.status,
    mergedInto: apiPerson.mergedIntoId || null,
    createdAt: apiPerson.created_at || apiPerson.createdAt,
    roles: (apiPerson.roles || []).map((r) => r.roleCode),
    contacts: (apiPerson.contacts || []).map((c) => ({
      id: c.id,
      type: c.contactType,
      value: c.valueNormalized,
      primary: !!c.isPrimary,
      // person_contacts.consent_status é nullable no banco; as telas só distinguem
      // CONSENTED de "ainda não consentido", então null vira PENDING na exibição.
      consentStatus: c.consentStatus || "PENDING",
    })),
    // person_documents não guarda o número do documento em coluna própria — guarda a
    // referência do arquivo (file_id) e os metadados de verificação. É o file_id que as
    // telas exibem como identificação do documento anexado.
    documents: (apiPerson.documents || []).map((d) => ({
      id: d.id,
      type: d.documentType,
      value: d.fileId,
      verificationStatus: d.verificationStatus,
      issuedAt: d.issuedAt,
      expiresAt: d.expiresAt,
    })),
    address: currentAddress
      ? {
          zipCode: currentAddress.zipCode || "",
          street: currentAddress.street || "",
          number: currentAddress.number || "",
          complement: currentAddress.complement || "",
          neighborhood: currentAddress.neighborhood || "",
          city: currentAddress.city || "",
          state: currentAddress.state || "",
        }
      : null,
  };
}

export async function listPeople(filters = {}) {
  const query = new URLSearchParams();
  if (filters.personType && filters.personType !== "todos") query.set("personType", filters.personType);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/people${suffix}`);
  return (data || []).map(mapPerson);
}

export async function getPerson(id) {
  return mapPerson(await apiFetch(`/people/${id}`));
}

// GET /people/duplicates devolve [{contactType, value, personIds:[...]}] — pares de cadastros
// que compartilham o mesmo contato primário (critério de dedup "match médio" da API).
export async function listDuplicatePairs() {
  const data = await apiFetch("/people/duplicates");
  return (data || []).map((group) => group.personIds);
}

export async function createPerson(payload) {
  return mapPerson(await apiFetch("/people", { method: "POST", body: payload }));
}

export async function updatePerson(id, payload) {
  return mapPerson(await apiFetch(`/people/${id}`, { method: "PATCH", body: payload }));
}

export async function deletePerson(id) {
  return apiFetch(`/people/${id}`, { method: "DELETE" });
}

// POST /people/:id/merge — :id é o cadastro canônico (o que permanece) e o body traz o
// absorvido, que passa a status MERGED com as referências remapeadas pela API.
export async function mergePeople(canonicalId, absorbedId) {
  return apiFetch(`/people/${canonicalId}/merge`, { method: "POST", body: { absorbedId } });
}

// --- Sub-recursos (roles/contacts/documents) — updatePerson só cobre os campos do próprio
// Person; papéis, contatos e documentos são geridos por esses endpoints dedicados (usados pela
// tela de edição, que faz diff contra o estado carregado em vez de recriar tudo). ---

// mapPerson só devolve roleCode (string) — os outros lugares que já usam person.roles fazem
// .includes(code), então preservamos esse formato lá. A edição precisa do id de cada papel pra
// poder remover um específico, daí esse fetch à parte em vez de mudar o mapper compartilhado.
export async function listPersonRoles(personId) {
  const data = await apiFetch(`/people/${personId}/roles`);
  return (data || []).map((r) => ({ id: r.id, roleCode: r.roleCode }));
}

export async function createRole(personId, payload) {
  return apiFetch(`/people/${personId}/roles`, { method: "POST", body: payload });
}

export async function removeRole(personId, roleId) {
  return apiFetch(`/people/${personId}/roles/${roleId}`, { method: "DELETE" });
}

export async function createContact(personId, payload) {
  return apiFetch(`/people/${personId}/contacts`, { method: "POST", body: payload });
}

export async function updateContact(personId, contactId, payload) {
  return apiFetch(`/people/${personId}/contacts/${contactId}`, { method: "PATCH", body: payload });
}

export async function removeContact(personId, contactId) {
  return apiFetch(`/people/${personId}/contacts/${contactId}`, { method: "DELETE" });
}

export async function createDocument(personId, payload) {
  return apiFetch(`/people/${personId}/documents`, { method: "POST", body: payload });
}

export async function updateDocument(personId, documentId, payload) {
  return apiFetch(`/people/${personId}/documents/${documentId}`, { method: "PATCH", body: payload });
}

export async function removeDocument(personId, documentId) {
  return apiFetch(`/people/${personId}/documents/${documentId}`, { method: "DELETE" });
}
