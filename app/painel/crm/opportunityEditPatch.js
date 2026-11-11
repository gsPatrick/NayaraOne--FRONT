// Edição da oportunidade (Marco 3, livro §18 "Trocar responsável — Permissão específica + audit"; CAD-18). A API só troca o responsável
// pelo PATCH com a permissão de troca de responsável e um motivo (mínimo 5 caracteres), e audita; por isso a tela só manda
// `ownerUserId` quando ele MUDOU, junto com `ownerChangeReason`, e sem a permissão o campo fica travado.
import { dateTimeLocalInputToIso } from "@/lib/format";
import { toNumber } from "@/lib/format";

export const REASSIGN_PERMISSION = "crm:opportunities:reassign";
export const OWNER_REASON_MIN = 5;

/** O responsável do formulário é diferente do atual? */
export function ownerChanged(form, opportunity) {
  return (form?.ownerUserId || "") !== (opportunity?.ownerUserId || "");
}

/** Mensagem de validação da troca de responsável ("" quando está tudo certo ou não houve troca). */
export function ownerChangeError(form, opportunity) {
  if (!ownerChanged(form, opportunity)) return "";
  if (!form.ownerUserId) return "Escolha o novo responsável: a oportunidade aberta não fica sem responsável.";
  if ((form.ownerChangeReason || "").trim().length < OWNER_REASON_MIN) return `Informe o motivo da troca de responsável (mínimo ${OWNER_REASON_MIN} caracteres).`;
  return "";
}

/** Corpo do PATCH /opportunities/:id a partir do formulário de edição. */
export function buildOpportunityEditPatch(form, opportunity) {
  const patch = {
    nextAction: (form.nextAction || "").trim() || null,
    nextActionDueAt: dateTimeLocalInputToIso(form.nextActionDueAt) || null,
    temperature: form.temperature || null,
    expectedValue: form.expectedValue !== "" && form.expectedValue != null ? toNumber(form.expectedValue) : null,
  };
  if (ownerChanged(form, opportunity)) {
    patch.ownerUserId = form.ownerUserId || null;
    patch.ownerChangeReason = (form.ownerChangeReason || "").trim();
  }
  return patch;
}
