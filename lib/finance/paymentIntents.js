// Intenção de pagamento (Guia M4 §3 e §4, Caderno §8 e §9): estados do livro, fase do envio ao banco, favorecido congelado,
// invalidação, progresso da aprovação e o valor escolhido no preparo (parcela até o saldo em aberto). Regra de exibição pura,
// sem chamada de API — a API (src/modules/finance) continua sendo a fonte de verdade.
import { formatBRL, toNumber } from "@/lib/format";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber, maskPixKey } from "@/lib/mask";
import { REQUIRED_STEPS_BY_RISK } from "@/lib/mock/finance";

// Estados do Guia §3 (DEC-056).
export const INTENT_STATUS_LABELS = {
  DRAFT: "Em preparação",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovada",
  EXECUTING: "Em execução",
  CONFIRMED: "Paga",
  FAILED: "Falhou no banco",
  CANCELED: "Cancelada",
};

export const INTENT_STATUS_TONE = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  EXECUTING: "warning",
  CONFIRMED: "success",
  FAILED: "danger",
  CANCELED: "neutral",
};

// Fase do envio ao banco: só faz sentido enquanto a intenção está EXECUTING.
export const SUBMISSION_PHASE_LABELS = {
  NOT_STARTED: "registrando o pagamento",
  SUBMITTING: "enviando ao banco",
  SUBMITTED: "enviado ao banco, aguardando confirmação",
  // M9-D237: a resposta do banco não foi conclusiva — nunca é dado como pago nem como falha sem o status final do banco.
  UNCERTAIN: "resposta do banco incerta",
};

// Em aberto: impede preparar uma segunda intenção para o mesmo lançamento (a API recusa com FINANCE_PAYMENT_INTENT_ALREADY_OPEN).
export const OPEN_INTENT_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "EXECUTING"];

export const isOpenIntent = (intent) => Boolean(intent) && OPEN_INTENT_STATUSES.includes(intent.status);
export const isInFlight = (intent) => intent?.status === "EXECUTING";

export function intentStatusLabel(intent) {
  if (!intent) return "Situação não reconhecida";
  const base = INTENT_STATUS_LABELS[intent.status];
  if (!base) return "Situação não reconhecida";
  const phase = intent.status === "EXECUTING" ? SUBMISSION_PHASE_LABELS[intent.submissionPhase] : null;
  return phase ? `${base}: ${phase}` : base;
}

export function intentStatusTone(intent) {
  if (intent?.status === "EXECUTING" && intent.submissionPhase === "UNCERTAIN") return "danger";
  return INTENT_STATUS_TONE[intent?.status] || "neutral";
}

// --- Invalidação (Caderno §9): favorecido ou lançamento mudou depois da preparação -----------------------------------

// Nomes técnicos que a API cita no motivo (campos da conta e do retrato) viram o termo em português.
const FIELD_NAMES = {
  bankCode: "banco",
  agency: "agência",
  accountNumber: "conta",
  pixKey: "chave PIX",
  ownerPersonId: "titular",
  "beneficiary.bankCode": "banco",
  "beneficiary.branch": "agência",
  "beneficiary.account": "conta",
  "beneficiary.pixKey": "chave PIX",
  "beneficiary.name": "nome do favorecido",
  "beneficiary.personId": "titular",
  "beneficiary.bankAccountId": "conta de destino",
  bankAccountId: "conta de destino",
  amount: "valor",
  entryAmount: "valor do lançamento",
  dueAt: "vencimento",
  description: "descrição",
  status: "situação do lançamento",
  costCenterId: "centro de custo",
};

export function fieldNamesText(fields = []) {
  const names = [...new Set((fields || []).map((f) => FIELD_NAMES[f] || "outro dado do lançamento"))];
  return names.length ? names.join(", ") : "dados do lançamento";
}

/** Motivo da invalidação com os campos em português ("Favorecido alterado (pixKey, agency)" -> "(chave PIX, agência)"). */
export function plainCancelReason(reason) {
  return String(reason || "").replace(/\(([A-Za-z.,\s]+)\)/, (match, list) => {
    const fields = list.split(",").map((f) => f.trim()).filter(Boolean);
    return fields.every((f) => FIELD_NAMES[f]) ? `(${fieldNamesText(fields)})` : match;
  });
}

/**
 * Intenção invalidada pela API (não um cancelamento pedido por alguém): CANCELED com o motivo que começa por "Favorecido alterado"
 * (dados bancários da conta de destino mudaram) ou "Lançamento alterado". Devolve null para os demais casos.
 */
export function intentInvalidation(intent) {
  if (intent?.status !== "CANCELED") return null;
  const reason = String(intent.cancelReason || "").trim();
  if (/^favorecido alterado/i.test(reason)) {
    return { kind: "BENEFICIARY", title: "Intenção invalidada: os dados bancários do favorecido mudaram", reason: plainCancelReason(reason) };
  }
  if (/^lan[çc]amento alterado/i.test(reason)) {
    return { kind: "ENTRY", title: "Intenção invalidada: o lançamento mudou", reason: plainCancelReason(reason) };
  }
  return null;
}

// --- Favorecido congelado (beneficiarySnapshot) ---------------------------------------------------------------------

/** Retrato anterior à regra do favorecido: a API recusa aprovar/executar (FINANCE_PAYMENT_INTENT_SNAPSHOT_OUTDATED). */
export function isLegacySnapshot(intent) {
  return Number(intent?.snapshotJson?.snapshotVersion) !== 2;
}

export function frozenBeneficiary(intent) {
  return intent?.beneficiarySnapshot || intent?.snapshotJson?.beneficiary || null;
}

/** Linhas [rótulo, valor] do favorecido congelado; conta e chave PIX mascaradas, nunca célula vazia. */
export function beneficiaryRows(beneficiary) {
  if (!beneficiary) return [["Favorecido", "Não congelado nesta intenção (preparada antes da regra)"]];
  const hasAccount = Boolean(beneficiary.bankCode || beneficiary.account);
  return [
    ["Nome", beneficiary.name || "Sem nome cadastrado"],
    ["Banco", beneficiary.bankCode ? `${getBankName(beneficiary.bankCode)} (${beneficiary.bankCode})` : "Sem banco"],
    ["Agência", beneficiary.branch || "Sem agência"],
    ["Conta", hasAccount ? maskAccountNumber(beneficiary.account) : "Sem conta"],
    ["Chave PIX", maskPixKey(beneficiary.pixKey)],
  ];
}

// --- Aprovação (regra REG-FIN-002 ou faixas de valor) ---------------------------------------------------------------

export const RISK_SOURCE_LABELS = {
  RULE: "Regra REG-FIN-002 do Motor de Regras",
  PARAMETERS: "Faixas de valor das Configurações do Financeiro",
};

export function riskSourceLabel(source) {
  return RISK_SOURCE_LABELS[source] || "Origem do risco não informada";
}

/** Nº de aprovações exigidas: o que a API gravou no pedido; só pedido antigo, sem o número, cai na tabela de antes. */
export function requiredApprovalsOf(request) {
  const n = Number(request?.requiredApprovals);
  if (Number.isInteger(n) && n >= 1) return n;
  return REQUIRED_STEPS_BY_RISK[request?.riskLevel] || 1;
}

export function approvalProgress(approval) {
  if (!approval) return null;
  const required = requiredApprovalsOf(approval);
  const fromList = Array.isArray(approval.approvers) ? approval.approvers.filter((a) => a.decision === "APPROVED").length : null;
  const approved = Number.isInteger(approval.approvedCount) ? approval.approvedCount : fromList || 0;
  return { approved, required, done: approved >= required, text: `${approved} de ${required} ${required === 1 ? "aprovação" : "aprovações"}` };
}

/** A pessoa já aprovou esta intenção (a API recusa a segunda decisão com FINANCE_APPROVAL_DUPLICATE_DECISION). */
export function hasApproved(approval, userId) {
  if (!approval || !userId || !Array.isArray(approval.approvers)) return false;
  return approval.approvers.some((a) => String(a.approverUserId) === String(userId));
}

// --- Valor escolhido no preparo (parcela até o saldo em aberto) -----------------------------------------------------

export function toCents(value) {
  const n = toNumber(value);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function centsToDecimalText(cents) {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Saldo em aberto do lançamento: valor menos as baixas parciais (filhas) já liquidadas — o mesmo cálculo da API. */
export function openBalanceCents(entry, allEntries = []) {
  if (!entry) return 0;
  const settled = (allEntries || []).filter((x) => x.parentEntryId === entry.id && x.status === "SETTLED");
  const paid = settled.reduce((sum, child) => sum + toCents(child.amount), 0);
  return Math.max(0, toCents(entry.amount) - paid);
}

export function nextInstallmentNumber(entry, allEntries = []) {
  if (!entry) return 1;
  return (allEntries || []).filter((x) => x.parentEntryId === entry.id && x.status === "SETTLED").length + 1;
}

/**
 * Confere o valor digitado contra o saldo em aberto. Vazio = paga o saldo inteiro (a API faz o mesmo sem `amount`).
 * Devolve { amount (texto "40.00" para a API, ou null), cents, full, error }.
 */
export function validateIntentAmount(raw, balanceCents) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    if (balanceCents <= 0) return { amount: null, cents: 0, full: true, error: "Este lançamento não tem saldo em aberto para pagar." };
    return { amount: null, cents: balanceCents, full: true, error: null };
  }
  const cents = toCents(raw);
  if (Number.isNaN(cents)) return { amount: null, cents: NaN, full: false, error: "Informe um valor válido, como 1.500,00." };
  if (cents <= 0) return { amount: null, cents, full: false, error: "O valor a pagar precisa ser maior que zero." };
  if (cents > balanceCents) {
    return { amount: null, cents, full: false, error: `O valor passa do saldo em aberto do lançamento (${formatBRL(balanceCents / 100)}).` };
  }
  return { amount: centsToDecimalText(cents), cents, full: cents === balanceCents, error: null };
}

/** Linha do valor da intenção: o valor desta intenção e, quando é parte do lançamento, o total dele e a parcela. */
export function intentAmountText(intent) {
  const amount = intent?.amount ?? intent?.snapshotJson?.amount;
  const total = intent?.snapshotJson?.entryAmount;
  const installment = intent?.installmentNumber ?? intent?.snapshotJson?.installmentNumber;
  const parts = [formatBRL(amount)];
  const partial = Boolean(total) && toCents(total) !== toCents(amount);
  if (partial) parts.push(`parte do lançamento de ${formatBRL(total)}`);
  if (installment && (partial || Number(installment) > 1)) parts.push(`parcela ${installment}`);
  return parts.join(" · ");
}
