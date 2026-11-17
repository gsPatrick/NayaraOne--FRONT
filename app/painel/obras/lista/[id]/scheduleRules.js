// Prazos obrigatórios da obra (segunda leva de 16/11/2026, DI-BI2-3) — regras puras, testadas em
// test/obras.prazoObrigatorio.test.mjs. A API aplica as mesmas regras (scheduleRequired.js):
// - Etapa: "Etapas possuem ... prazo" (Caderno de Obras, M6:16). O término previsto é obrigatório ao criar e,
//   ao editar, pode ser trocado mas nunca apagado (422 PROJECT_STAGE_END_DATE_REQUIRED). Custo, código e
//   responsável continuam exigidos só para iniciar a etapa.
// - Obra: a previsão de término é exigida para iniciar a execução (READY -> ACTIVE). Depois disso não pode ser
//   apagada (422 PROJECT_PLANNED_END_REQUIRED). Antes, a obra é preenchida aos poucos e o campo pode ficar vazio.
// - DI-BI2-9: o mesmo vale para os outros campos do gate READY -> ACTIVE: orçamento, início e responsável da obra
//   (422 PROJECT_BUDGET_AMOUNT_REQUIRED, PROJECT_START_DATE_REQUIRED, PROJECT_RESPONSIBLE_REQUIRED).
import { dateOnlyInputToIso, toNumber } from "@/lib/format";

export const PLANNED_END_LOCKED_STATUSES = Object.freeze(["ACTIVE", "PAUSED", "FINAL_INSPECTION", "DELIVERED", "WARRANTY", "CLOSED"]);

export const STAGE_END_HELPER = "Obrigatório: toda etapa tem prazo";
export const STAGE_END_REQUIRED_MESSAGE = "Informe o término previsto: toda etapa tem prazo.";
export const PLANNED_END_HELPER_OPEN = "Opcional agora — obrigatório para iniciar a execução da obra";
export const PLANNED_END_HELPER_LOCKED = "Obrigatório: a obra está em execução";
export const PLANNED_END_REQUIRED_MESSAGE = "A obra já está em execução: a previsão de término pode ser alterada, mas não apagada.";

const isBlank = (value) => value == null || String(value).trim() === "";

/** A obra já passou por READY -> ACTIVE: a previsão de término não pode mais ficar vazia. */
export function isPlannedEndLocked(status) {
  return PLANNED_END_LOCKED_STATUSES.includes(status);
}

/** Mensagem de erro do término previsto da etapa ("" quando ok). Só aparece depois que o usuário tocou no campo. */
export function stageEndError(endsAt, touched) {
  return touched && isBlank(endsAt) ? STAGE_END_REQUIRED_MESSAGE : "";
}

/** O botão de salvar a etapa só habilita com nome, sequência, prazo e datas válidas. */
export function canSaveStage(form, dateErrors = {}) {
  return Boolean(
    form && !isBlank(form.name) && form.sequence !== "" && form.sequence != null && !isBlank(form.endsAt) && !dateErrors.startsAt && !dateErrors.endsAt
  );
}

/** Prazo da etapa no pedido: sempre a data (nunca null). Sem data, devolve undefined e o envio é barrado antes. */
export function stageEndsAtPayload(endsAt) {
  return isBlank(endsAt) ? undefined : dateOnlyInputToIso(endsAt) || undefined;
}

/** Mensagem de erro da previsão de término da obra ("" quando ok). */
export function plannedEndError(status, endsAtPlanned) {
  return isPlannedEndLocked(status) && isBlank(endsAtPlanned) ? PLANNED_END_REQUIRED_MESSAGE : "";
}

export function plannedEndHelper(status) {
  return isPlannedEndLocked(status) ? PLANNED_END_HELPER_LOCKED : PLANNED_END_HELPER_OPEN;
}

/**
 * Campo de previsão de término no PATCH da obra. Com data: a data. Vazio antes da execução: null (apaga, como
 * sempre foi). Vazio com a obra em execução: o campo não vai no pedido (o botão já fica desabilitado por
 * plannedEndError; isto é a segunda trava, para nunca mandar null).
 */
export function plannedEndPatch(status, endsAtPlanned) {
  const iso = isBlank(endsAtPlanned) ? undefined : dateOnlyInputToIso(endsAtPlanned);
  if (iso) return { endsAtPlanned: iso };
  return isPlannedEndLocked(status) ? {} : { endsAtPlanned: null };
}

// DI-BI2-9: os outros campos do gate READY -> ACTIVE. Mensagem quando o usuário esvazia o campo com a obra em execução.
export const EXECUTION_FIELD_MESSAGES = Object.freeze({
  budgetAmount: "A obra já está em execução: o orçamento pode ser alterado, mas não apagado.",
  startsAt: "A obra já está em execução: a data de início pode ser alterada, mas não apagada.",
  endsAtPlanned: PLANNED_END_REQUIRED_MESSAGE,
  responsibleUserId: "A obra já está em execução: o responsável pode ser trocado, mas não retirado.",
});

/** Mensagem de erro de um campo do gate ("" quando ok). */
export function executionFieldError(status, field, value) {
  return isPlannedEndLocked(status) && isBlank(value) ? EXECUTION_FIELD_MESSAGES[field] || "" : "";
}

/** Algum campo do gate vazio com a obra em execução (o salvar fica desabilitado). `fields` = { campo: valor }. */
export function hasExecutionFieldError(status, fields) {
  return Object.entries(fields).some(([field, value]) => Boolean(executionFieldError(status, field, value)));
}

/** O mesmo texto do helper de prazo serve para os outros campos do gate. */
export const executionFieldHelper = plannedEndHelper;

const toApi = {
  budgetAmount: (v) => toNumber(v),
  startsAt: (v) => dateOnlyInputToIso(v),
  endsAtPlanned: (v) => dateOnlyInputToIso(v),
  responsibleUserId: (v) => v,
};

/**
 * Campo do gate no PATCH da obra. Com valor: o valor convertido. Vazio (ou que não converte) antes da execução:
 * null, como sempre foi. Vazio com a obra em execução: o campo não vai no pedido (nunca null).
 */
export function executionFieldPatch(status, field, value) {
  const converted = isBlank(value) ? undefined : toApi[field](value);
  if (converted !== undefined && converted !== null && converted !== "" && !Number.isNaN(converted)) return { [field]: converted };
  return isPlannedEndLocked(status) ? {} : { [field]: null };
}
