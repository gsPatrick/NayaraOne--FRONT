// Campos obrigatórios do lançamento PRÓPRIO em aberto (segunda leva de 16/11/2026, DI-BI2-6), iguais aos da API
// (domain/open-entry-required.js e application/services/open-entry-guards.js):
//  - vencimento: conta a pagar ou a receber própria (não é dinheiro de terceiro) exige a data — Caderno M4 §19, contas e recebíveis
//    em 7/30/60 dias e inadimplência. Vale na criação, na edição (não apaga; a data gravada não troca, só se preenche quando falta),
//    no excedente classificado como despesa e na cobrança de perda do Estoque;
//  - centros: M4 §4, despesa com centro de custo e receita com centro de resultado (também no excedente classificado como receita).
// Regra pura: as telas só chamam estas funções.
import { dateOnlyInputToIso } from "@/lib/format";

export const OWN_OPEN_NATURES = Object.freeze(["PAYABLE", "RECEIVABLE"]);

export function isBlank(value) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

/** Conta a pagar ou a receber própria (dinheiro de terceiro fica fora). */
export function requiresDueDate({ nature, isThirdPartyFunds } = {}) {
  return OWN_OPEN_NATURES.includes(String(nature || "").toUpperCase()) && isThirdPartyFunds !== true;
}

/** Novo lançamento: falta o vencimento obrigatório. */
export function newEntryDueMissing(form) {
  return requiresDueDate(form) && isBlank(form?.dueAt);
}

export const DUE_REQUIRED_TEXT = "Obrigatório para conta a pagar ou a receber própria.";

/**
 * Edição: "locked" quando o lançamento já tem vencimento (a data gravada não troca); "required" quando é conta própria sem data
 * (lançamento antigo: a data é preenchida uma vez); "optional" nos demais (terceiro, ajuste).
 */
export function editDueAtMode(entry) {
  if (entry?.dueAt) return "locked";
  return requiresDueDate(entry) ? "required" : "optional";
}

/** Problemas da edição: vencimento obrigatório em branco e centro obrigatório apagado. */
export function editProblems(entry, form) {
  const problems = [];
  if (editDueAtMode(entry) === "required" && isBlank(form?.dueAt)) problems.push("Informe o vencimento: " + DUE_REQUIRED_TEXT.toLowerCase());
  if (entry?.nature === "PAYABLE" && isBlank(form?.costCenterId)) problems.push("Lançamento de despesa exige o centro de custo.");
  if (entry?.nature === "RECEIVABLE" && isBlank(form?.resultCenterId)) problems.push("Lançamento de receita exige o centro de resultado.");
  return problems;
}

/** O vencimento só vai no PATCH quando a data está sendo preenchida (nunca reenvia nem troca a gravada). */
export function editDueAtPayload(entry, dueInput) {
  if (editDueAtMode(entry) === "locked" || isBlank(dueInput)) return undefined;
  return dateOnlyInputToIso(dueInput);
}

/** Classificação do excedente: receita exige centro de resultado; despesa exige centro de custo e vencimento. */
export function classificationProblems(finalNature, { costCenterId, resultCenterId, dueAt } = {}) {
  const problems = [];
  if (finalNature === "RECEIVABLE" && isBlank(resultCenterId)) problems.push("Classificar como receita exige o centro de resultado.");
  if (finalNature === "PAYABLE" && isBlank(costCenterId)) problems.push("Classificar como despesa exige o centro de custo.");
  if (finalNature === "PAYABLE" && isBlank(dueAt)) problems.push("Classificar como despesa exige o vencimento (vira conta a pagar).");
  return problems;
}

/** Corpo da classificação: só os campos da classificação escolhida (data do formulário ao meio-dia de São Paulo). */
export function classificationPayload(finalNature, { costCenterId, resultCenterId, dueAt } = {}) {
  if (finalNature === "RECEIVABLE") return { finalNature, resultCenterId };
  if (finalNature === "PAYABLE") return { finalNature, costCenterId, dueAt: dateOnlyInputToIso(dueAt) };
  return { finalNature };
}

/** Cobrança de perda: cobrar o responsável exige o vencimento da cobrança. */
export function lossChargeDueMissing({ chargeResponsible, chargeDueAt } = {}) {
  return Boolean(chargeResponsible) && isBlank(chargeDueAt);
}

/** Corpo da cobrança de perda (o vencimento vai ao meio-dia de São Paulo, como as demais datas). */
export function lossChargePayload({ responsiblePersonId, chargeAmount, chargeDueAt }) {
  return { chargeResponsible: true, responsiblePersonId, chargeAmount, chargeDueAt: dateOnlyInputToIso(chargeDueAt) };
}

/** Mensagens dos códigos de erro destas regras (nunca o código cru na tela). */
export const OPEN_ENTRY_ERROR_MESSAGES = Object.freeze({
  FINANCE_ENTRY_DUE_DATE_REQUIRED: "Informe o vencimento: conta a pagar ou a receber própria exige a data de vencimento.",
  FINANCE_ENTRY_DUE_DATE_IMMUTABLE: "O vencimento já gravado não pode ser trocado. Para outra data, cancele este lançamento e crie outro.",
  FINANCE_ENTRY_COST_CENTER_REQUIRED: "Lançamento de despesa exige o centro de custo.",
  FINANCE_ENTRY_RESULT_CENTER_REQUIRED: "Lançamento de receita exige o centro de resultado.",
  LOSS_CASE_CHARGE_DUE_REQUIRED: "Informe o vencimento da cobrança: a conta a receber do responsável precisa da data de vencimento.",
});
