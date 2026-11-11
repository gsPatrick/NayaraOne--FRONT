// Decisões em duas pessoas do Financeiro (Guia M4 §8 e §15, Caderno §16): caso de estorno, pedido de reabertura de período e o
// encaminhamento, na tela de Aprovações, dos pedidos que têm fluxo próprio (a API recusa /decide com FINANCE_APPROVAL_USE_DEDICATED_FLOW).
import { formatBRL } from "@/lib/format";
import { requiredApprovalsOf, toCents, centsToDecimalText } from "@/lib/finance/paymentIntents";

// Pedido de aprovação com fluxo próprio: onde a pessoa decide e o texto do botão que leva até lá.
export const DEDICATED_FLOWS = {
  PaymentIntent: {
    href: "/painel/financeiro/intencoes-pagamento",
    action: "Aprovar em Intenções de pagamento",
    note: "A aprovação confere o favorecido congelado e o retrato do pagamento: é feita na tela de Intenções de pagamento.",
  },
  LedgerReversal: {
    href: "#estornos-pendentes",
    action: "Decidir em Estornos pendentes",
    note: "O estorno só é lançado quando outra pessoa aprova o caso, na lista de Estornos pendentes desta tela.",
  },
  PeriodReopen: {
    href: "/painel/financeiro/fechamento",
    action: "Decidir no Fechamento de período",
    note: "A reabertura de período é decidida no Fechamento, por outra pessoa com a permissão de reabrir período.",
  },
};

export const isDedicatedFlow = (request) => Boolean(request && DEDICATED_FLOWS[request.relatedEntityType]);
export const dedicatedFlowOf = (request) => (request ? DEDICATED_FLOWS[request.relatedEntityType] || null : null);

/** Nº de aprovações do pedido (o que a API gravou) e quantas já houve, a partir das decisões quando vierem na lista. */
export function decisionProgress(request) {
  const required = requiredApprovalsOf(request);
  const decisions = Array.isArray(request?.decisions) ? request.decisions : [];
  const approved = decisions.filter((d) => d.decision === "APPROVED").length;
  return { approved, required, text: `${approved} de ${required} ${required === 1 ? "aprovação" : "aprovações"}` };
}

/**
 * Quem pode decidir um pedido em duas pessoas: nunca quem pediu (a API recusa com FINANCE_APPROVAL_SELF_APPROVAL_FORBIDDEN) e nunca
 * quem já decidiu. Devolve { allowed, reason } para a tela explicar por que o botão não aparece.
 */
export function decisionBlock(request, userId) {
  if (!request || request.status !== "PENDING") return { allowed: false, reason: "Pedido já decidido." };
  if (userId && String(request.requestedByUserId) === String(userId)) {
    return { allowed: false, reason: "Você fez este pedido: a decisão precisa ser de outra pessoa." };
  }
  const decisions = Array.isArray(request.decisions) ? request.decisions : [];
  if (userId && decisions.some((d) => String(d.approverUserId) === String(userId))) {
    return { allowed: false, reason: "Você já decidiu: falta a decisão de outra pessoa." };
  }
  return { allowed: true, reason: "" };
}

// Mínimo de caracteres do motivo da reabertura: parâmetro fechamento.reabertura_motivo_minimo_caracteres (padrão 20). A tela começa com o
// padrão e passa a usar o número que a API devolver na recusa (details.minChars).
export const DEFAULT_REOPEN_MIN_CHARS = 20;

export function reasonCounter(reason, minChars = DEFAULT_REOPEN_MIN_CHARS) {
  const length = String(reason || "").trim().length;
  const missing = Math.max(0, minChars - length);
  return {
    length,
    missing,
    ok: missing === 0,
    text: missing === 0 ? `${length} caracteres (mínimo de ${minChars} atingido).` : `${length} de ${minChars} caracteres mínimos — faltam ${missing}.`,
  };
}

/** Pedidos de reabertura pendentes de um mês (a tabela de fechamentos mostra "Reabertura pedida" no lugar do botão). */
export function pendingReopenFor(requests, referenceMonth) {
  return (requests || []).find((r) => r.status === "PENDING" && r.payloadJson?.referenceMonth === referenceMonth) || null;
}

/** Valor do estorno parcial: vazio = estorno do valor total; senão maior que zero e no máximo o valor do lançamento (assertCanReverse). */
export function validateReversalAmount(raw, entryAmount) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return { amount: null, error: null };
  const cents = toCents(raw);
  if (Number.isNaN(cents)) return { amount: null, error: "Informe um valor válido para o estorno, como 150,00." };
  if (cents <= 0) return { amount: null, error: "O valor do estorno precisa ser maior que zero." };
  if (cents > toCents(entryAmount)) return { amount: null, error: `O estorno não pode passar do valor do lançamento (${formatBRL(entryAmount)}).` };
  return { amount: centsToDecimalText(cents), error: null };
}

export const REQUEST_STATUS_LABELS ={ PENDING: "Aguardando aprovação", APPROVED: "Aprovado", REJECTED: "Recusado", STALE: "Invalidado" };
export const REQUEST_STATUS_TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", STALE: "neutral" };
