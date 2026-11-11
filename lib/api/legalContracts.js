// Contratos: máquina de estados, partes, versões (aprovação por versão), assinaturas, aditivos e checklist.
// Contrato confirmado em wt/api-m5 src/features/legal (contracts.service, contractVersionActions.service,
// contractAmendments.service, signatures.service, requirements.service, legal.routes.js).

import { apiFetch, getBaseUrl, ApiError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

// --- Upload de arquivo (POST /files): devolve { id, fileName, mimeType, checksumSha256, ... } ---
export async function uploadFile(file) {
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop());
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
  return apiFetch("/files", {
    method: "POST",
    body: { fileName: file.name, mimeType: file.type || "application/octet-stream", contentBase64 },
  });
}

// --- Contratos ---

export async function listContracts() {
  return apiFetch("/legal/contracts");
}

export async function getContract(id) {
  return apiFetch(`/legal/contracts/${id}`);
}

// ADDENDUM/KEY_DELIVERY/USED_PROPERTY_DELIVERY exigem `parentContractId` (contrato principal).
export async function createContract(payload) {
  return apiFetch("/legal/contracts", { method: "POST", body: payload });
}

// Máquina de estados do livro (Guia §3). CANCELLED deixou de ser alvo: a API devolve 409.
// `confirmation` (M9-D852): obrigatório quando o alvo é TERMINATED; vem do ConfirmAction.
export async function transitionContract(id, targetStatus, confirmation) {
  return apiFetch(`/legal/contracts/${id}/transition`, { method: "POST", body: { targetStatus, ...(confirmation ? { confirmation } : {}) } });
}

export async function suspendContract(id, reason) {
  return apiFetch(`/legal/contracts/${id}/suspend`, { method: "POST", body: { reason } });
}

export async function reactivateContract(id, reason) {
  return apiFetch(`/legal/contracts/${id}/reactivate`, { method: "POST", body: { reason } });
}

export async function terminateContract(id, reason, confirmation) {
  return apiFetch(`/legal/contracts/${id}/terminate`, { method: "POST", body: { reason, ...(confirmation ? { confirmation } : {}) } });
}

export async function closeContract(id, reason) {
  return apiFetch(`/legal/contracts/${id}/close`, { method: "POST", body: { reason } });
}

// Correção auditada (MFA recente + motivo). A partir de APPROVED, valor/vigência/imóvel/número são recusados
// com 409 LEGAL_CONTRACT_TERMS_LOCKED_USE_ADDENDUM: a alteração vira aditivo.
export async function correctContractData(id, { fields, reason }) {
  return apiFetch(`/legal/contracts/${id}/correct`, { method: "PATCH", body: { ...fields, reason } });
}

// `representedByPersonId`: procurador da parte — é o cadastro da parte que faz o checklist exigir procuração.
export async function addContractParty(contractId, { personId, partyRole, representedByPersonId }) {
  return apiFetch(`/legal/contracts/${contractId}/parties`, {
    method: "POST",
    body: { personId, partyRole, ...(representedByPersonId ? { representedByPersonId } : {}) },
  });
}

export async function listContractParties(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/parties`);
}

export async function getContractTimeline(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/timeline`);
}

// --- Versões do documento (aprovação POR versão, Guia §6) ---

// Com `templateId`, o servidor monta o documento a partir do modelo (a versão do modelo usada fica congelada).
// Versão criada depois da aprovação nasce DRAFT e exige nova aprovação.
export async function createContractVersion(contractId, { content, documentFileId, effectiveFrom, templateId, variables, requireDocument }) {
  return apiFetch(`/legal/contracts/${contractId}/versions`, {
    method: "POST",
    body: {
      ...(content !== undefined ? { content } : {}),
      ...(variables ? { variables } : {}),
      ...(documentFileId ? { documentFileId } : {}),
      ...(effectiveFrom ? { effectiveFrom } : {}),
      ...(templateId ? { templateId } : {}),
      ...(typeof requireDocument === "boolean" ? { requireDocument } : {}),
    },
  });
}

export async function listContractVersions(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/versions`);
}

// POST /contract-versions/:id/approve (legal:approve): confere o hash, marca a versão APPROVED e, com o contrato em
// análise jurídica, leva o contrato a APPROVED. Só a versão vigente é aprovada.
export async function approveContractVersion(versionId) {
  return apiFetch(`/contract-versions/${versionId}/approve`, { method: "POST" });
}

// POST /contract-versions/:id/send-signature (legal:sign): só a versão APROVADA vigente vai para assinatura.
export async function sendContractVersionForSignature(versionId, signerPersonIds) {
  return apiFetch(`/contract-versions/${versionId}/send-signature`, { method: "POST", body: { signerPersonIds } });
}

// GET .../generate-pdf devolve os BYTES do PDF (sem envelope JSON) — fetch cru e Blob.
export async function getContractVersionPdfBlob(contractId, versionId) {
  const session = getSession();
  const headers = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const response = await fetch(`${getBaseUrl()}/legal/contracts/${contractId}/versions/${versionId}/generate-pdf`, { headers });
  if (!response.ok) {
    let message = "Erro ao gerar o PDF da versão do contrato.";
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

// --- Assinaturas ---

export async function initiateSignature(contractVersionId, signerPersonIds) {
  return apiFetch(`/legal/contract-versions/${contractVersionId}/signatures`, { method: "POST", body: { signerPersonIds } });
}

export async function listSignatures(contractVersionId) {
  return apiFetch(`/legal/contract-versions/${contractVersionId}/signatures`);
}

// Caderno §8: assinatura MANUAL com a via assinada (arquivo da empresa) e o coletor identificado (quem registra).
export async function recordManualSignature(contractVersionId, { personId, evidenceFileId, signedAt }) {
  return apiFetch(`/legal/contract-versions/${contractVersionId}/manual-signatures`, {
    method: "POST",
    body: { personId, evidenceFileId, ...(signedAt ? { signedAt } : {}) },
  });
}

export async function cancelSignature(id) {
  return apiFetch(`/legal/signatures/${id}/cancel`, { method: "POST" });
}

// --- Aditivos (Caderno §13) ---
// Nasce em rascunho, com versão base, vigência e cláusulas alteradas; fica assinado pela assinatura de cada signatário.
export async function createContractAmendment(contractId, { reason, changes, changedClauses, baseContractVersionId, effectiveFrom, effectiveUntil, documentFileId }) {
  return apiFetch(`/legal/contracts/${contractId}/amendments`, {
    method: "POST",
    body: {
      reason,
      changes,
      ...(changedClauses && changedClauses.length ? { changedClauses } : {}),
      ...(baseContractVersionId ? { baseContractVersionId } : {}),
      ...(effectiveFrom ? { effectiveFrom } : {}),
      ...(effectiveUntil ? { effectiveUntil } : {}),
      ...(documentFileId ? { documentFileId } : {}),
    },
  });
}

export async function listContractAmendments(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/amendments`);
}

export async function getContractAmendment(id) {
  return apiFetch(`/legal/amendments/${id}`);
}

// Uma assinatura por signatário (parte do contrato) com a via assinada.
export async function signContractAmendment(id, { personId, evidenceFileId }) {
  return apiFetch(`/legal/amendments/${id}/sign`, { method: "POST", body: { personId, evidenceFileId } });
}

// --- Checklist de documentos (Motor de Regras REG-JUR-001; gate por etapa) ---

export async function listContractRequirements(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/requirements`);
}

// O checklist sai da regra vigente (REG-JUR-001) pelo tipo do contrato e do cadastro das partes e do imóvel: a tela não escolhe
// o modelo (a API recusa "templateKey" com 400).
export async function generateContractRequirements(contractId) {
  return apiFetch(`/legal/contracts/${contractId}/requirements/generate`, { method: "POST", body: {} });
}

export async function satisfyRequirement(requirementId, payload) {
  return apiFetch(`/legal/requirements/${requirementId}`, { method: "PATCH", body: payload });
}

// Dispensa exige a permissão própria legal:waive (403 sem ela).
export async function waiveRequirement(requirementId, reason) {
  return apiFetch(`/legal/requirements/${requirementId}/waive`, { method: "POST", body: { reason } });
}
