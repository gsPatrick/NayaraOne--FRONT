// Helpers para sintetizar rótulos de exibição que existem no mock (lib/mock/finance.js) mas
// NÃO existem como coluna real na API:
//   - BankAccount não tem `label` (schema real só guarda bankCode/agency/accountNumber/pixKey);
//   - Commission não tem `description` (schema real só guarda baseAmount/percentage/totalAmount).
// Em vez de inventar o campo no payload enviado à API, montamos o rótulo aqui, na fronteira de
// exibição, a partir dos campos reais.

import { getBankName } from "@/lib/mock/banks";

export function bankAccountLabel(account, ownerName) {
  if (!account) return "—";
  if (ownerName) return `${ownerName} — ${account.pixKey ? "PIX" : getBankName(account.bankCode) || account.bankCode || "conta"}`;
  if (account.bankCode) return `${getBankName(account.bankCode) || account.bankCode} · Ag. ${account.agency || "—"} · Conta ${account.accountNumber || "—"}`;
  if (account.pixKey) return `Chave PIX — ${account.pixKey}`;
  return `Conta ${String(account.id || "").slice(0, 8)}`;
}

export function commissionDescription(commission) {
  if (!commission) return "—";
  return `Comissão — ${commission.percentage}% sobre ${commission.baseAmount}`;
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

// ApprovalRequest também não tem `label` — sintetiza um rótulo genérico a partir do tipo e do
// id da entidade relacionada (a tela de aprovações não tem acesso fácil ao registro completo
// de todo tipo de entidade possível, então não tentamos resolver a descrição real aqui).
export function approvalRequestLabel(request) {
  if (!request) return "—";
  return `${entityTypeLabel(request.relatedEntityType)} — ${String(request.relatedEntityId || "").slice(0, 8)}`;
}
