// Regras de formulário da oportunidade (Marco 3, correções M3CA) — puras, testadas em test/m3ca.oportunidadeRegras.test.mjs.
// - Motivos de ganho, perda e desistência vêm da API (GET /crm/outcome-reasons), configurados pelo administrador
//   (Configurações > CRM). A desistência é perda (LOST) com motivo de desistência: aparece na lista do "perdido".
// - Toda oportunidade tem responsável (livro do Marco 3, CRMX-006): sem ele o formulário não envia; na edição o
//   responsável troca, mas não fica vazio, e só vai no pedido quando mudou.

export const OUTCOME_REASON_FIELD = { ganho: "wonReason", perdido: "lostReason" };
export const OWNER_REQUIRED_MESSAGE = "Selecione o responsável: toda oportunidade precisa de um responsável.";

export function toReasonOptions(catalog) {
  const asOption = (prefix) => (r) => ({ value: r.code, label: prefix ? `${prefix}${r.label}` : r.label });
  return {
    ganho: (catalog?.won || []).map(asOption("")),
    perdido: [...(catalog?.lost || []).map(asOption("")), ...(catalog?.withdrawal || []).map(asOption("Desistência: "))],
  };
}

export function ownerError(ownerUserId) {
  return ownerUserId ? "" : OWNER_REQUIRED_MESSAGE;
}

/** Campo de responsável do PATCH: só quando mudou (e nunca vazio — vazio é barrado antes por ownerError). */
export function ownerPatch(originalOwnerUserId, editedOwnerUserId) {
  if (!editedOwnerUserId || editedOwnerUserId === originalOwnerUserId) return {};
  return { ownerUserId: editedOwnerUserId };
}

/** Código -> rótulo dos motivos de perda e de desistência da empresa (painel de indicadores). */
export function lostReasonLabels(catalog) {
  return Object.fromEntries([...(catalog?.lost || []), ...(catalog?.withdrawal || [])].map((r) => [r.code, r.label]));
}

export const PROPOSAL_PROPERTY_REQUIRED_MESSAGE = "Selecione o imóvel: a proposta é sempre de uma oportunidade e de um imóvel.";

/** Imóvel inicial da proposta: o imóvel de interesse da oportunidade escolhida (vazio se ela não tem). */
export function proposalPropertyFor(opportunityId, opportunities) {
  return (opportunities || []).find((o) => o.id === opportunityId)?.propertyId || "";
}

export function proposalPropertyError(propertyId) {
  return propertyId ? "" : PROPOSAL_PROPERTY_REQUIRED_MESSAGE;
}
