// Helpers para sintetizar rótulos de exibição que existem no mock (lib/mock/finance.js) mas
// NÃO existem como coluna real na API:
//   - BankAccount não tem `label` (schema real só guarda bankCode/agency/accountNumber/pixKey);
//   - Commission não tem `description` (schema real só guarda baseAmount/percentage/totalAmount).
// Em vez de inventar o campo no payload enviado à API, montamos o rótulo aqui, na fronteira de
// exibição, a partir dos campos reais.

import { getBankName } from "@/lib/mock/banks";
import { formatBRL, formatPercent } from "@/lib/format";

export function bankAccountLabel(account, ownerName) {
  if (!account) return "—";
  if (ownerName) return `${ownerName} — ${account.pixKey ? "PIX" : getBankName(account.bankCode) || account.bankCode || "conta"}`;
  if (account.bankCode) return `${getBankName(account.bankCode) || account.bankCode} · Ag. ${account.agency || "—"} · Conta ${account.accountNumber || "—"}`;
  if (account.pixKey) return `Chave PIX — ${account.pixKey}`;
  return `Conta ${String(account.id || "").slice(0, 8)}`;
}

export function commissionDescription(commission) {
  if (!commission) return "—";
  // O3 (auditoria M45): "5.000000% sobre 2000.00" → "5% sobre R$ 2.000,00".
  return `Comissão — ${formatPercent(commission.percentage)} sobre ${formatBRL(commission.baseAmount)}`;
}

const ENTITY_LABELS = {
  BankAccount: "Conta bancária",
  FinancialEntry: "Lançamento",
  Commission: "Comissão",
  CommissionInstallment: "Parcela de comissão",
  OwnerRepass: "Repasse a proprietário",
};

export function entityTypeLabel(type) {
  return ENTITY_LABELS[type] || type;
}

// ACHADO REAL (auditoria Nayara, rodada 4, 14/10/2026, M4-R01): a lista de Aprovações mostrava
// só "Lançamento — <id curto>" (sem descrição real) e a busca por texto não achava nada digitando
// um trecho do nome do lançamento — porque o rótulo era só tipo+id, nunca a descrição real. A API
// agora resolve `relatedEntityLabel` (descrição real da entidade relacionada) em
// `listApprovalRequests`; usamos ele quando vier, e só caímos no rótulo sintético tipo+id como
// fallback (ex: entidade sem campo de descrição, ou ainda não migrada).
export function approvalRequestLabel(request) {
  if (!request) return "—";
  if (request.relatedEntityLabel) return `${entityTypeLabel(request.relatedEntityType)} — ${request.relatedEntityLabel}`;
  return `${entityTypeLabel(request.relatedEntityType)} — ${String(request.relatedEntityId || "").slice(0, 8)}`;
}
