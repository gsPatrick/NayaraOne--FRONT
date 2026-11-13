// Recusas da autorização do Financeiro (pagamento, estorno em duas pessoas, reabertura de período e aprovações) em português claro,
// por código de erro da API. Código desconhecido usa a mensagem da própria API (já em português), sem termo técnico.
import { formatBRL, humanizeText } from "@/lib/format";
import { fieldNamesText } from "@/lib/finance/paymentIntents";

const FIXED = {
  FINANCE_PAYMENT_INTENT_NOT_PAYABLE: "Intenção de pagamento só vale para lançamento a pagar: dinheiro não sai para quem deve à empresa.",
  FINANCE_PAYMENT_INTENT_VALIDATION: "Informe um valor a pagar maior que zero, com até 2 casas decimais.",
  FINANCE_PAYMENT_INTENT_INVALID_ENTRY_STATUS: "Só é possível preparar o pagamento de um lançamento pendente ou parcialmente pago.",
  FINANCE_PAYMENT_INTENT_ALREADY_OPEN: "Já existe uma intenção de pagamento em aberto para este lançamento. Acompanhe em Financeiro → Intenções de pagamento.",
  FINANCE_PAYMENT_INTENT_SNAPSHOT_OUTDATED:
    "Esta intenção foi preparada antes de o favorecido fazer parte do retrato aprovado. Cancele-a e prepare uma nova.",
  FINANCE_PAYMENT_INTENT_SELF_APPROVAL_FORBIDDEN: "Quem preparou a intenção não pode aprová-la: a aprovação precisa ser de outra pessoa.",
  FINANCE_APPROVAL_SELF_APPROVAL_FORBIDDEN: "Quem fez o pedido não pode decidi-lo: a decisão precisa ser de outra pessoa.",
  FINANCE_APPROVAL_DUPLICATE_DECISION: "Você já registrou sua decisão neste pedido. Falta a decisão de outra pessoa.",
  FINANCE_APPROVAL_ALREADY_DECIDED: "Este pedido já foi decidido. Atualize a tela para ver a situação atual.",
  FINANCE_APPROVAL_STALE: "O que foi pedido mudou depois do pedido, então ele foi invalidado. Faça um novo pedido sobre a versão atual.",
  FINANCE_APPROVAL_USE_DEDICATED_FLOW: "Este pedido é decidido na própria tela do assunto (intenção de pagamento, estorno ou reabertura de período).",
  FINANCE_REVERSAL_ALREADY_REQUESTED: "Já existe um pedido de estorno aguardando aprovação para este lançamento.",
  FINANCE_REVERSAL_REASON_REQUIRED: "Informe o motivo do estorno.",
  FINANCE_ENTRY_ALREADY_REVERSED: "Este lançamento já foi estornado.",
  FINANCE_PERIOD_REOPEN_ALREADY_REQUESTED: "Já existe um pedido de reabertura aguardando aprovação para este período.",
  FINANCE_PERIOD_REOPEN_REASON_REQUIRED: "Informe o motivo da reabertura: ele é obrigatório e fica auditado.",
  FINANCE_PERIOD_NOT_CLOSED: "O período não está fechado, então não há o que reabrir.",
  MFA_REQUIRED_NOT_ENABLED: "Esta ação exige a verificação em duas etapas (MFA) de quem a faz. Ative o MFA no seu perfil e tente de novo.",
  MFA_STEP_UP_CANCELLED: "Nada foi feito: a verificação em duas etapas não foi concluída.",
  PERMISSION_DENIED: "Você não tem permissão para esta ação.",
};

export function financeAuthErrorMessage(err, fallback = "Não foi possível concluir a ação.") {
  if (!err) return fallback;
  const details = err.details || {};
  switch (err.code) {
    case "FINANCE_PAYMENT_INTENT_AMOUNT_EXCEEDS_BALANCE":
      return `O valor escolhido (${formatBRL(details.amount)}) passa do saldo em aberto do lançamento (${formatBRL(details.openBalance)}).`;
    case "FINANCE_PAYMENT_INTENT_STALE":
      return `Os dados mudaram depois que a intenção foi preparada (${fieldNamesText(details.changedFields)}). Nada foi aprovado: prepare uma nova intenção sobre os dados atuais.`;
    case "FINANCE_PERIOD_REOPEN_REASON_TOO_SHORT":
      return `Explique a reabertura com pelo menos ${details.minChars || "o mínimo de"} caracteres.`;
    default:
      break;
  }
  if (FIXED[err.code]) return FIXED[err.code];
  const raw = String(err.message || "").trim();
  if (!raw) return fallback;
  if (/failed to fetch|load failed|networkerror/i.test(raw)) return "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
  return humanizeText(raw);
}
