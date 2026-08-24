// Dados 100% mockados — alinhado ao schema real "finance".* (11 tabelas) implementado no
// backend (src/features/finance/*.service.js, NayaraOne--API), testado ponta a ponta contra
// Postgres antes deste front ser construído. Nomes de campo em camelCase espelham 1:1 os
// nomes reais dos models Sequelize — nenhum campo aqui foi inventado.

export const COST_CENTERS = [
  { id: "cc-1", code: "ADM-01", name: "Administrativo" },
  { id: "cc-2", code: "COM-01", name: "Comercial" },
  { id: "cc-3", code: "MAN-01", name: "Manutenção" },
];

export const RESULT_CENTERS = [
  { id: "rc-1", code: "LOC-01", name: "Locação" },
  { id: "rc-2", code: "VEN-01", name: "Venda" },
];

// status: PENDING_COOLDOWN | ACTIVE | BLOCKED — conta nova (ou com dado sensível alterado)
// nasce em PENDING_COOLDOWN e só fica elegível a pagamento após 48h (mesma regra do backend,
// ver financeAntifraud.service.js — derivada de updatedAt, sem coluna extra no schema).
export const BANK_ACCOUNTS = [
  {
    id: "ba-1", ownerPersonId: null, bankCode: "341", agency: "0021", accountNumber: "88213-4", pixKey: null,
    status: "ACTIVE", label: "Conta operacional — Nayara Imóveis", updatedAt: "2026-06-01T10:00:00Z",
  },
  {
    id: "ba-2", ownerPersonId: "person-1", bankCode: "001", agency: "1234", accountNumber: "56789-0", pixKey: "marina.costa@gmail.com",
    status: "ACTIVE", label: "Marina Costa — repasse", updatedAt: "2026-07-10T09:00:00Z",
  },
  {
    id: "ba-3", ownerPersonId: "person-5", bankCode: "237", agency: "0456", accountNumber: "12345-6", pixKey: null,
    status: "PENDING_COOLDOWN", label: "Fernando Lima — repasse", updatedAt: "2026-08-20T08:00:00Z",
  },
  {
    id: "ba-4", ownerPersonId: null, bankCode: "104", agency: "3321", accountNumber: "99001-2", pixKey: "financeiro@nayaraimoveis.com.br",
    status: "BLOCKED", label: "Conta antiga (bloqueada)", updatedAt: "2026-05-15T12:00:00Z",
  },
];

// entryType: DEBIT | CREDIT — nature: PAYABLE | RECEIVABLE | TRANSFER | ADJUSTMENT —
// status: PENDING | SETTLED | REVERSED | CANCELLED
export const FINANCIAL_ENTRIES = [
  {
    id: "fe-1", bankAccountId: "ba-1", costCenterId: "cc-2", resultCenterId: "rc-1", entryType: "CREDIT", nature: "RECEIVABLE",
    amount: 3850, dueAt: "2026-08-05T00:00:00Z", settledAt: "2026-08-05T14:00:00Z", status: "SETTLED",
    idempotencyKey: "aluguel-prop-1-ago", reversalOfEntryId: null, description: "Aluguel — Edifício Aurora Apto 302 (Ago/2026)",
  },
  {
    id: "fe-2", bankAccountId: "ba-1", costCenterId: "cc-2", resultCenterId: "rc-1", entryType: "CREDIT", nature: "RECEIVABLE",
    amount: 2200, dueAt: "2026-08-10T00:00:00Z", settledAt: null, status: "PENDING",
    idempotencyKey: "aluguel-prop-3-ago", reversalOfEntryId: null, description: "Aluguel — Sala Comercial Centro 12B (Ago/2026)",
  },
  {
    id: "fe-3", bankAccountId: "ba-1", costCenterId: "cc-1", resultCenterId: null, entryType: "DEBIT", nature: "PAYABLE",
    amount: 1450, dueAt: "2026-08-15T00:00:00Z", settledAt: null, status: "PENDING",
    idempotencyKey: null, reversalOfEntryId: null, description: "Manutenção elétrica — Galpão Industrial Zona Sul",
  },
  {
    id: "fe-4", bankAccountId: "ba-1", costCenterId: "cc-1", resultCenterId: null, entryType: "DEBIT", nature: "PAYABLE",
    amount: 890, dueAt: "2026-08-01T00:00:00Z", settledAt: null, status: "PENDING",
    idempotencyKey: null, reversalOfEntryId: null, description: "Condomínio — Loja Shopping Vale L34",
  },
  {
    id: "fe-5", bankAccountId: "ba-2", costCenterId: null, resultCenterId: "rc-2", entryType: "DEBIT", nature: "PAYABLE",
    amount: 2700, dueAt: "2026-08-25T00:00:00Z", settledAt: null, status: "PENDING",
    idempotencyKey: "repasse-marina-ago", reversalOfEntryId: null, description: "Repasse proprietária — Marina Costa (Ago/2026)",
  },
  {
    id: "fe-6", bankAccountId: "ba-1", costCenterId: "cc-2", resultCenterId: "rc-1", entryType: "CREDIT", nature: "RECEIVABLE",
    amount: 38000, dueAt: "2026-07-30T00:00:00Z", settledAt: "2026-07-30T11:00:00Z", status: "SETTLED",
    idempotencyKey: "aluguel-prop-4-jul", reversalOfEntryId: null, description: "Aluguel — Galpão Industrial Zona Sul (Jul/2026)",
  },
  {
    id: "fe-7", bankAccountId: "ba-1", costCenterId: "cc-1", resultCenterId: null, entryType: "DEBIT", nature: "ADJUSTMENT",
    amount: 38000, dueAt: null, settledAt: "2026-08-02T09:00:00Z", status: "SETTLED",
    idempotencyKey: null, reversalOfEntryId: "fe-6", description: "Estorno — cobrança em duplicidade (Jul/2026)",
  },
];

export const BANK_TRANSACTIONS = [
  {
    id: "bt-1", bankAccountId: "ba-1", externalTransactionId: "EXT-001-AGO", amount: 3850,
    transactionDate: "2026-08-05T00:00:00Z", description: "PIX RECEBIDO — MARINA COSTA",
  },
  {
    id: "bt-2", bankAccountId: "ba-1", externalTransactionId: "EXT-002-JUL", amount: 38000,
    transactionDate: "2026-07-30T00:00:00Z", description: "TED RECEBIDA — GRUPO HABITAR",
  },
  {
    id: "bt-3", bankAccountId: "ba-1", externalTransactionId: "EXT-003-AGO", amount: 2200,
    transactionDate: "2026-08-11T00:00:00Z", description: "PIX RECEBIDO — SALA COMERCIAL",
  },
];

export const RECONCILIATIONS = [
  { id: "rec-1", financialEntryId: "fe-1", bankTransactionId: "bt-1", matchedAt: "2026-08-05T14:05:00Z", matchedByUserId: "user-4" },
  { id: "rec-2", financialEntryId: "fe-6", bankTransactionId: "bt-2", matchedAt: "2026-07-30T11:10:00Z", matchedByUserId: "user-4" },
];

// relatedEntityType espelha o mesmo registry usado no backend (approvals.service.js
// ENTITY_MODELS): BankAccount | FinancialEntry | Commission | CommissionInstallment | OwnerRepass
export const APPROVAL_REQUESTS = [
  {
    id: "ar-1", relatedEntityType: "FinancialEntry", relatedEntityId: "fe-5", requestedByUserId: "user-4",
    status: "PENDING", riskLevel: "HIGH", createdAt: "2026-08-19T10:00:00Z",
    label: "Repasse — Marina Costa (R$ 2.700,00)",
  },
  {
    id: "ar-2", relatedEntityType: "BankAccount", relatedEntityId: "ba-3", requestedByUserId: "user-2",
    status: "PENDING", riskLevel: "MEDIUM", createdAt: "2026-08-20T08:30:00Z",
    label: "Nova conta bancária — Fernando Lima",
  },
  {
    id: "ar-3", relatedEntityType: "FinancialEntry", relatedEntityId: "fe-3", requestedByUserId: "user-4",
    status: "APPROVED", riskLevel: "LOW", createdAt: "2026-08-14T09:00:00Z",
    label: "Manutenção elétrica — R$ 1.450,00",
  },
  {
    // Solicitada pelo próprio usuário da sessão mockada (user-8, ver lib/mock/session.js) —
    // demonstra a trava de maker-checker (FIN-005): quem pede não pode aprovar a própria solicitação.
    id: "ar-4", relatedEntityType: "OwnerRepass", relatedEntityId: "or-1", requestedByUserId: "user-8",
    status: "PENDING", riskLevel: "MEDIUM", createdAt: "2026-08-20T16:00:00Z",
    label: "Repasse — Marina Costa (solicitado por você)",
  },
];

export const APPROVAL_STEPS = [
  { id: "as-1", approvalRequestId: "ar-1", approverUserId: "user-2", stepOrder: 1, decision: "APPROVED", decidedAt: "2026-08-19T15:00:00Z" },
  { id: "as-2", approvalRequestId: "ar-3", approverUserId: "user-1", stepOrder: 1, decision: "APPROVED", decidedAt: "2026-08-14T10:00:00Z" },
];

export const COMMISSIONS = [
  {
    id: "com-1", opportunityId: "opp-3", contractId: null, beneficiaryUserId: "user-2",
    baseAmount: 2450000, percentage: 5, totalAmount: 122500, status: "PENDING",
    description: "Comissão — venda Cobertura Vista Verde",
  },
  {
    id: "com-2", opportunityId: null, contractId: null, beneficiaryUserId: "user-3",
    baseAmount: 3850, percentage: 10, totalAmount: 385, status: "PAID",
    description: "Comissão — locação Edifício Aurora Apto 302",
  },
];

export const COMMISSION_INSTALLMENTS = [
  { id: "ci-1", commissionId: "com-1", installmentNumber: 1, amount: 40833.33, dueAt: "2026-09-01T00:00:00Z", paidAt: null, status: "PENDING" },
  { id: "ci-2", commissionId: "com-1", installmentNumber: 2, amount: 40833.33, dueAt: "2026-10-01T00:00:00Z", paidAt: null, status: "PENDING" },
  { id: "ci-3", commissionId: "com-1", installmentNumber: 3, amount: 40833.34, dueAt: "2026-11-01T00:00:00Z", paidAt: null, status: "PENDING" },
  { id: "ci-4", commissionId: "com-2", installmentNumber: 1, amount: 385, dueAt: "2026-08-10T00:00:00Z", paidAt: "2026-08-10T09:00:00Z", status: "PAID" },
];

export const OWNER_REPASSES = [
  {
    id: "or-1", propertyId: "prop-1", ownerPersonId: "person-1", bankAccountId: "ba-2",
    grossAmount: 3850, deductionsAmount: 1150, netAmount: 2700, referenceMonth: "2026-08",
    status: "PENDING", idempotencyKey: "repasse-marina-ago",
  },
  {
    id: "or-2", propertyId: "prop-4", ownerPersonId: "person-5", bankAccountId: "ba-3",
    grossAmount: 38000, deductionsAmount: 3800, netAmount: 34200, referenceMonth: "2026-07",
    status: "PAID", idempotencyKey: "repasse-fernando-jul",
  },
];

// ---- Labels / tones (padrão já usado em todos os outros módulos do sistema) ----

export const BANK_ACCOUNT_STATUS_LABELS = { PENDING_COOLDOWN: "Em resfriamento", ACTIVE: "Ativa", BLOCKED: "Bloqueada" };
export const BANK_ACCOUNT_STATUS_TONE = { PENDING_COOLDOWN: "warning", ACTIVE: "success", BLOCKED: "danger" };

export const ENTRY_NATURE_LABELS = { PAYABLE: "A pagar", RECEIVABLE: "A receber", TRANSFER: "Transferência", ADJUSTMENT: "Ajuste/Estorno" };
export const ENTRY_NATURE_TONE = { PAYABLE: "danger", RECEIVABLE: "success", TRANSFER: "info", ADJUSTMENT: "neutral" };
export const ENTRY_NATURE_ICON = { PAYABLE: "arrowUpCircle", RECEIVABLE: "arrowDownCircle", TRANSFER: "swapHorizontal", ADJUSTMENT: "refreshCcw" };
export const ENTRY_STATUS_LABELS = { PENDING: "Pendente", SETTLED: "Liquidado", REVERSED: "Estornado", CANCELLED: "Cancelado" };
export const ENTRY_STATUS_TONE = { PENDING: "warning", SETTLED: "success", REVERSED: "neutral", CANCELLED: "danger" };

export const APPROVAL_STATUS_LABELS = { PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Rejeitado" };
export const APPROVAL_STATUS_TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" };
export const RISK_LEVEL_LABELS = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto", CRITICAL: "Crítico" };
export const RISK_LEVEL_TONE = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", CRITICAL: "danger" };
export const REQUIRED_STEPS_BY_RISK = { LOW: 1, MEDIUM: 1, HIGH: 2, CRITICAL: 2 };

export const COMMISSION_STATUS_LABELS = { PENDING: "Pendente", APPROVED: "Aprovada", PAID: "Paga", CANCELLED: "Cancelada" };
export const COMMISSION_STATUS_TONE = { PENDING: "warning", APPROVED: "info", PAID: "success", CANCELLED: "danger" };

export const REPASSE_STATUS_LABELS = { PENDING: "Pendente", PAID: "Pago", CANCELLED: "Cancelado" };
export const REPASSE_STATUS_TONE = { PENDING: "warning", PAID: "success", CANCELLED: "danger" };

// ---- Helpers (mesma regra do backend, aplicada client-side sobre os dados mockados) ----

const COOLDOWN_HOURS = 48;

export function bankAccountCooldownRemainingHours(account) {
  if (account.status !== "PENDING_COOLDOWN") return 0;
  const elapsedHours = (Date.now() - new Date(account.updatedAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.ceil(COOLDOWN_HOURS - elapsedHours));
}

export function isBankAccountEligibleForPayment(account) {
  if (!account) return true;
  if (account.status === "BLOCKED") return false;
  if (account.status === "PENDING_COOLDOWN") return bankAccountCooldownRemainingHours(account) === 0;
  return true;
}

export function isEntryOverdue(entry) {
  return entry.status === "PENDING" && entry.dueAt && new Date(entry.dueAt).getTime() < Date.now();
}

export function approvalStepsFor(approvalRequestId) {
  return APPROVAL_STEPS.filter((s) => s.approvalRequestId === approvalRequestId);
}
