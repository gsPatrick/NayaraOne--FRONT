// Locação no Jurídico: garantias (dados por tipo), vistorias (códigos do livro, mídia com SHA-256) e entrega de chaves.
// Contrato em wt/api-m5 src/features/legal (guarantees.service, guaranteeTypeData, guaranteeDetail.service,
// inspections.service, inspectionCompare, keyDeliveries.service, keyDeliveryGates, legal.routes.js).

import { apiFetch, getBaseUrl, ApiError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

// --- Garantias (Caderno §9) ---

// guaranteeType do livro: GUARANTOR | INSURANCE | SECURITY_DEPOSIT | CAPITALIZATION | OTHER. Com dado do tipo faltando,
// a garantia nasce PENDING (o GET devolve `missingForActivation`).
export async function createGuarantee(contractId, payload) {
  return apiFetch(`/legal/contracts/${contractId}/guarantees`, { method: "POST", body: payload });
}

export async function listGuarantees(filters = {}) {
  const query = new URLSearchParams();
  if (filters.contractId) query.set("contractId", filters.contractId);
  if (filters.status) query.set("status", filters.status);
  const qs = query.toString();
  return apiFetch(`/legal/guarantees${qs ? `?${qs}` : ""}`);
}

// Devolve a garantia com `missingForActivation` e, na caução, `depositTrail` (saldo calculado pelo Financeiro).
export async function getGuarantee(id) {
  return apiFetch(`/legal/guarantees/${id}`);
}

export async function updateGuarantee(id, payload) {
  return apiFetch(`/legal/guarantees/${id}`, { method: "PATCH", body: payload });
}

export async function deleteGuarantee(id) {
  return apiFetch(`/legal/guarantees/${id}`, { method: "DELETE" });
}

// Substituição sem perder histórico: a nova nasce no mesmo contrato e a antiga vira liberada, ligada à nova.
export async function replaceGuarantee(id, newGuaranteePayload) {
  return apiFetch(`/legal/guarantees/${id}/replace`, { method: "POST", body: newGuaranteePayload });
}

// Fluxos de "outra garantia" (OTHER) homologados pela empresa: [{ code, label, requiredFields }] (legal:create).
export async function listGuaranteeFlows() {
  return apiFetch("/legal/guarantee-flows");
}

// --- Vistorias (Caderno §11) ---

export async function createInspection(payload) {
  return apiFetch("/legal/inspections", { method: "POST", body: payload });
}

// Vistoria + itens numa transação só. inspectionType: ENTRY | EXIT | INTERMEDIATE | FINAL. Itens com roomCode/itemCode,
// description e condition NEW | GOOD | REGULAR | DAMAGED.
export async function createInspectionWithItems(payload) {
  return apiFetch("/legal/inspections/with-items", { method: "POST", body: payload });
}

export async function listInspections(filters = {}) {
  const query = new URLSearchParams();
  for (const key of ["contractId", "propertyId", "status", "inspectionType"]) if (filters[key]) query.set(key, filters[key]);
  const qs = query.toString();
  return apiFetch(`/legal/inspections${qs ? `?${qs}` : ""}`);
}

export async function getInspection(id) {
  return apiFetch(`/legal/inspections/${id}`);
}

// lockVersion: versão que o usuário estava vendo (409 LEGAL_INSPECTION_VERSION_CONFLICT se mudou).
export async function completeInspection(id, lockVersion) {
  const body = lockVersion === undefined || lockVersion === null ? {} : { lockVersion };
  return apiFetch(`/legal/inspections/${id}/complete`, { method: "POST", body });
}

export async function addInspectionItem(inspectionId, item) {
  const body = {};
  for (const key of ["itemName", "roomCode", "itemCode", "description", "condition", "notes", "damageDescription", "responsibleParty"]) {
    if (item[key]) body[key] = item[key];
  }
  if (item.estimatedBudget !== undefined && item.estimatedBudget !== null && item.estimatedBudget !== "") body.estimatedBudget = item.estimatedBudget;
  return apiFetch(`/legal/inspections/${inspectionId}/items`, { method: "POST", body });
}

export async function listInspectionItems(inspectionId) {
  return apiFetch(`/legal/inspections/${inspectionId}/items`);
}

// A mídia vira legal.inspection_media com o SHA-256 do arquivo enviado (arquivo sem hash é recusado).
export async function attachInspectionItemMedia(itemId, { fileId, mediaType }) {
  return apiFetch(`/legal/inspections/items/${itemId}/media`, { method: "POST", body: { fileId, mediaType } });
}

export async function listInspectionItemMedia(itemId) {
  return apiFetch(`/legal/inspections/items/${itemId}/media`);
}

export async function generateInspectionReport(inspectionId) {
  return apiFetch(`/legal/inspections/${inspectionId}/report`, { method: "POST" });
}

// GET .../report devolve os BYTES do PDF — fetch cru e Blob.
export async function getInspectionReportBlob(inspectionId) {
  const session = getSession();
  const headers = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const response = await fetch(`${getBaseUrl()}/legal/inspections/${inspectionId}/report`, { headers });
  if (!response.ok) {
    let message = "Erro ao baixar relatório da vistoria.";
    let code = "UNKNOWN_ERROR";
    try {
      const body = await response.json();
      message = body?.error?.message || message;
      code = body?.error?.code || code;
    } catch {
      // resposta não era JSON — mensagem genérica.
    }
    throw new ApiError(message, { code, status: response.status });
  }
  return response.blob();
}

// Pareamento por ambiente + código do item. `items[]` traz roomCode/itemCode/before/after/changed/mediaRefs e
// `requiresHumanValidation` (responsabilidade e cobrança continuam com validação humana).
export async function compareInspections(entryInspectionId, exitInspectionId) {
  const query = new URLSearchParams({ entryInspectionId, exitInspectionId });
  return apiFetch(`/legal/inspections/compare?${query.toString()}`);
}

// NAY compara entrada x saída (Caderno M5 §11): { mode: "AI"|"DETERMINISTIC", reason, comparison, nay, requiresHumanValidation }.
// Com a NAY desligada vem só a comparação item a item; ligada, a resposta com as fontes e as sugestões para a pessoa aceitar ou rejeitar.
export async function compareInspectionsWithNay(entryInspectionId, exitInspectionId) {
  return apiFetch("/legal/nay/inspections/compare", { method: "POST", body: { entryInspectionId, exitInspectionId } });
}

// Exige MFA recente (step-up): sem a verificação a API recusa (403).
export async function signInspection(inspectionId, { partyRole, signaturePayload }) {
  return apiFetch(`/legal/inspections/${inspectionId}/sign`, { method: "POST", body: { partyRole, signaturePayload } });
}

export async function listInspectionSignatures(inspectionId) {
  return apiFetch(`/legal/inspections/${inspectionId}/signatures`);
}

// --- Entrega de chaves (Caderno §10) ---

export async function createKeyDelivery(payload) {
  return apiFetch("/legal/key-deliveries", { method: "POST", body: payload });
}

export async function listKeyDeliveries() {
  return apiFetch("/legal/key-deliveries");
}

export async function getKeyDelivery(id) {
  return apiFetch(`/legal/key-deliveries/${id}`);
}

// Liberar exige a permissão lease.keys.deliver, o checklist da etapa KEY_DELIVERY, a vistoria de entrada assinada e a
// via assinada do termo (`termEvidenceFileId`, arquivo desta empresa). Fotos (`photosFileIds`) precisam ser imagens
// enviadas pela empresa. Política de fotos e texto do termo são do SERVIDOR (photosRequired/termText são recusados).
export async function releaseKeyDelivery(id, { keysCount, keysIdentification, termSignedByPersonId, termEvidenceFileId, photosFileIds }) {
  return apiFetch(`/legal/key-deliveries/${id}/release`, {
    method: "POST",
    body: {
      keysCount,
      keysIdentification,
      termSignedByPersonId,
      ...(termEvidenceFileId ? { termEvidenceFileId } : {}),
      ...(photosFileIds && photosFileIds.length ? { photosFileIds } : {}),
    },
  });
}

// Cancela uma entrega pendente com motivo (lease.keys.deliver).
export async function cancelKeyDelivery(id, reason) {
  return apiFetch(`/legal/key-deliveries/${id}/cancel`, { method: "POST", body: { reason } });
}

// Rota literal do livro: abre e libera a entrega do contrato na mesma transação, com os mesmos gates.
export async function deliverKeysForContract(contractId, payload) {
  return apiFetch(`/contracts/${contractId}/key-delivery`, { method: "POST", body: payload });
}

// Prévia do termo gerado pelo servidor (antes de liberar) ou o termo gravado (depois). Somente leitura.
export async function getKeyDeliveryTermPreview(id, { keysCount, keysIdentification, termSignedByPersonId } = {}) {
  const query = new URLSearchParams();
  if (keysCount) query.set("keysCount", String(keysCount));
  if (keysIdentification) query.set("keysIdentification", keysIdentification);
  if (termSignedByPersonId) query.set("termSignedByPersonId", termSignedByPersonId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/legal/key-deliveries/${id}/term-preview${suffix}`);
}
