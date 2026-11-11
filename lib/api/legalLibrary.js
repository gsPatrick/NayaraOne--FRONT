// Modelos de contrato versionados (legal.template_versions) e biblioteca de cláusulas (legal.clause_library +
// clause_versions). Contrato em wt/api-m5 src/features/legal (contractTemplates.service, templateVersions.service,
// contractClauses.service, legal.routes.js).

import { apiFetch } from "@/lib/api/client";

// --- Modelos ---

export async function listContractTemplates(params = {}) {
  const query = new URLSearchParams();
  if (params.contractType) query.set("contractType", params.contractType);
  const qs = query.toString();
  return apiFetch(`/legal/contract-templates${qs ? `?${qs}` : ""}`);
}

export async function getContractTemplate(id) {
  return apiFetch(`/legal/contract-templates/${id}`);
}

// Nasce com a versão 1 em rascunho; o responsável jurídico padrão é quem cria.
export async function createContractTemplate({ name, contractType, legalResponsibleUserId }) {
  return apiFetch("/legal/contract-templates", {
    method: "POST",
    body: { name, contractType, ...(legalResponsibleUserId ? { legalResponsibleUserId } : {}) },
  });
}

// Mexer num modelo publicado cria a próxima versão em rascunho (publicado nunca é editado).
export async function addClauseToContractTemplate(templateId, payload) {
  return apiFetch(`/legal/contract-templates/${templateId}/clauses`, { method: "POST", body: payload });
}

export async function upgradeTemplateClause(templateId, contractClauseId) {
  return apiFetch(`/legal/contract-templates/${templateId}/clauses/${contractClauseId}/upgrade`, { method: "POST" });
}

// Publicar a versão em rascunho: alçada jurídica (legal:approve); a publicada anterior vira substituída.
export async function publishContractTemplate(templateId) {
  return apiFetch(`/legal/contract-templates/${templateId}/publish`, { method: "POST" });
}

export async function listContractTemplateVersions(templateId) {
  return apiFetch(`/legal/contract-templates/${templateId}/versions`);
}

// Preview (não persiste): contexto das condições derivado de `contractId` ou `draftContract`. Por padrão a prévia usa a
// versão PUBLICADA (a que gera contrato); `source.draft` pede a do rascunho. A resposta traz templateVersionStatus/Number.
export async function renderContractTemplate(id, variables, source = {}) {
  return apiFetch(`/legal/contract-templates/${id}/render${source.draft ? "?versao=rascunho" : ""}`, {
    method: "POST",
    body: {
      variables: variables || {},
      ...(source.contractId ? { contractId: source.contractId } : {}),
      ...(source.draftContract ? { draftContract: source.draftContract } : {}),
    },
  });
}

// --- Biblioteca de cláusulas ---

export async function listClauses(filters = {}) {
  const query = new URLSearchParams();
  if (filters.category) query.set("category", filters.category);
  if (filters.activeOnly === false) query.set("activeOnly", "false");
  const qs = query.toString();
  return apiFetch(`/legal/clauses${qs ? `?${qs}` : ""}`);
}

// A cláusula entra na biblioteca com responsável jurídico (padrão: quem cria).
export async function createClause(payload) {
  return apiFetch("/legal/clauses", { method: "POST", body: payload });
}

export async function listClauseVersions(code) {
  return apiFetch(`/legal/clauses/${encodeURIComponent(code)}/versions`);
}

export async function createClauseVersion(code, payload) {
  return apiFetch(`/legal/clauses/${encodeURIComponent(code)}/versions`, { method: "POST", body: payload });
}

export async function getClauseTemplateUsage(code) {
  return apiFetch(`/legal/clauses/${encodeURIComponent(code)}/template-usage`);
}

// F01: aprova a regra declarativa de uma versão de cláusula (quem criou a versão não aprova).
export async function approveClauseCondition(id) {
  return apiFetch(`/legal/clauses/${id}/approve-condition`, { method: "POST" });
}

export async function deactivateClause(id) {
  return apiFetch(`/legal/clauses/${id}/deactivate`, { method: "POST" });
}
