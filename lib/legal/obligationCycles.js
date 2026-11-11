// Vencimentos (ciclos) das obrigações da locação (Caderno M5 §12 "periodicidade, comprovante e status"): rótulos, quais estão em
// aberto e o que falta no pagamento antes de mandar para a API (comprovante e vencimento obrigatórios; valor pelo toNumber).
import { toNumber } from "@/lib/format";

export const CYCLE_STATUS_LABELS = { OPEN: "Em aberto", OVERDUE: "Vencido sem comprovante", PAID: "Pago", WAIVED: "Dispensado" };
export const CYCLE_STATUS_TONE = { OPEN: "info", OVERDUE: "danger", PAID: "success", WAIVED: "neutral" };
export const PAID_BY_LABELS = { TENANT: "Locatário", LANDLORD: "Locador", COMPANY: "Imobiliária" };
const OPEN_STATUSES = ["OPEN", "OVERDUE"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Vencimentos que ainda recebem pagamento ou dispensa, do mais antigo para o mais novo. */
export function openCycles(cycles) {
  return (cycles || []).filter((c) => OPEN_STATUSES.includes(c.status)).sort((a, b) => String(a.dueOn).localeCompare(String(b.dueOn)));
}

export const isOpenCycle = (cycle) => Boolean(cycle) && OPEN_STATUSES.includes(cycle.status);

/** Data "AAAA-MM-DD" que existe no calendário. */
export function isIsoDate(value) {
  if (!ISO_DATE.test(String(value || ""))) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Pendências do pagamento em português (lista vazia = pode enviar). Com vencimento em aberto, escolhe-se um; sem nenhum, informa-se a data. */
export function paymentProblems({ amount, proofFileId, cycleId, referenceDueOn, hasOpenCycles }) {
  const problems = [];
  const value = toNumber(amount);
  if (Number.isNaN(value) || value <= 0) problems.push("Informe o valor pago (maior que zero).");
  if (hasOpenCycles && !cycleId) problems.push("Escolha o vencimento que está sendo pago.");
  if (!hasOpenCycles && !isIsoDate(referenceDueOn)) problems.push("Informe a data do vencimento que está sendo pago.");
  if (!proofFileId) problems.push("Anexe o comprovante do pagamento.");
  return problems;
}

/** Corpo do POST de pagamento: o vencimento escolhido tem preferência; sem ele, a data informada. */
export function paymentPayload({ amount, paidByParty, proofFileId, cycleId, referenceDueOn }) {
  const payload = { amount: toNumber(amount), paidByParty, proofFileId };
  if (cycleId) payload.cycleId = cycleId;
  else payload.referenceDueOn = referenceDueOn;
  return payload;
}

/** Motivo da dispensa: no mínimo 10 caracteres sem contar espaços nas pontas. "" quando está bom. */
export function waiveReasonProblem(reason) {
  return String(reason || "").trim().length >= 10 ? "" : "Informe o motivo da dispensa (no mínimo 10 caracteres).";
}
