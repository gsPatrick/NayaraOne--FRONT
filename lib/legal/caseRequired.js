// Risco e valor estimado do processo (Caderno M5:244 "Processo tem número, órgão, classe, status, partes, valor, risco e
// responsável"): obrigatórios na criação e nunca apagados na edição, igual à API (legalCaseRequired.js). Valor 0 é aceito:
// o processo consultivo não tem valor em disputa (DI-BI2-1). Arquivo puro, usado pela criação e pelo detalhe do processo.
import { toNumber } from "@/lib/format";
import { CASE_RISK_LABELS } from "@/lib/labels/juridico";

export const CASE_RISK_OPTIONS = Object.keys(CASE_RISK_LABELS);

/** O risco escolhido é um dos níveis da lista. */
export function isValidRisk(riskLevel) {
  return CASE_RISK_OPTIONS.includes(riskLevel);
}

/** O valor estimado foi informado e é um número ≥ 0 (0 vale). Vazio não vale. */
export function isValidEstimatedAmount(text) {
  if (text === null || text === undefined || String(text).trim() === "") return false;
  const n = toNumber(text);
  return Number.isFinite(n) && n >= 0;
}

/** Valor do campo da tela (com vírgula) no formato da API ("1234.50"). Só chamar com valor válido. */
export function amountPayload(text) {
  return toNumber(text).toFixed(2);
}

/** Valor opcional (o confirmado): vazio vira null, preenchido vira "1234.50". */
export function optionalAmountPayload(text) {
  if (text === null || text === undefined || String(text).trim() === "") return null;
  return amountPayload(text);
}

/** Problemas do formulário de abertura, em português (lista vazia quando pode criar). */
export function newCaseProblems(form) {
  const problems = [];
  if (!isValidRisk(form.riskLevel)) problems.push("Escolha o risco do processo.");
  if (!isValidEstimatedAmount(form.estimatedAmount)) problems.push("Informe o valor estimado do processo (use 0 quando não houver valor em disputa).");
  return problems;
}

/** Campos de risco e valor do POST /legal/cases. */
export function newCaseRiskValuePayload(form) {
  return { riskLevel: form.riskLevel, estimatedAmount: amountPayload(form.estimatedAmount) };
}

/** PATCH dos valores: a estimativa nunca vai como null; o confirmado só quando não está travado pelo Financeiro. */
export function caseValuesPayload(form, locked) {
  const payload = { estimatedAmount: amountPayload(form.estimatedAmount) };
  if (!locked) payload.confirmedAmount = optionalAmountPayload(form.confirmedAmount);
  return payload;
}

/** O formulário de valores pode ser gravado: estimativa obrigatória (≥ 0) e confirmado vazio ou ≥ 0. */
export function caseValuesValid(form) {
  const confirmed = form.confirmedAmount;
  const confirmedOk = confirmed === null || confirmed === undefined || String(confirmed).trim() === "" || isValidEstimatedAmount(confirmed);
  return isValidEstimatedAmount(form.estimatedAmount) && confirmedOk;
}
