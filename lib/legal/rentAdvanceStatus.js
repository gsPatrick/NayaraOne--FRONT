// Antecipação de aluguel (livro M5, bloco de cobrança: "Rent advance: produto separado, eligibility/proposal/acceptance/payment/recovery").
// A tela segue a máquina de estados da API (src/features/billing/rentAdvance.service.js STATUS_FLOW): a antecipação nasce em
// ELIGIBILITY_PENDING; ELIGIBILITY_PENDING -> PROPOSED | REJECTED; PROPOSED -> ACCEPTED | REJECTED; ACCEPTED -> PAID; PAID -> RECOVERING
// -> RECOVERED. Cada estado tem rótulo legível e a ação que a tela oferece (rota da API correspondente) ou o texto de "nada a fazer".
export const RENT_ADVANCE_STATUS_LABEL = {
  ELIGIBILITY_PENDING: "Elegibilidade em análise",
  PROPOSED: "Proposto",
  ACCEPTED: "Aceito",
  PAID: "Pago",
  RECOVERING: "Recuperando",
  RECOVERED: "Recuperado",
  REJECTED: "Recusado",
};
export const RENT_ADVANCE_STATUS_TONE = {
  ELIGIBILITY_PENDING: "neutral", PROPOSED: "warning", ACCEPTED: "info", PAID: "success", RECOVERING: "warning", RECOVERED: "success", REJECTED: "danger",
};

// Ação de cada estado: `kind` diz qual chamada a tela faz (propose/accept/pay/recover) e `label` o texto do botão.
const ACTIONS = {
  ELIGIBILITY_PENDING: { kind: "propose", label: "Propor" },
  PROPOSED: { kind: "accept", label: "Aceitar" },
  ACCEPTED: { kind: "pay", label: "Pagar" },
  PAID: { kind: "recover", label: "Registrar recuperação" },
  RECOVERING: { kind: "recover", label: "Registrar recuperação" },
};
const FINAL_TEXT = { RECOVERED: "Recuperada — nada a fazer", REJECTED: "Recusada — nada a fazer" };

/** Rótulo do estado (estado desconhecido aparece como "Situação desconhecida", nunca o código cru). */
export function rentAdvanceStatusLabel(status) {
  return RENT_ADVANCE_STATUS_LABEL[status] || "Situação desconhecida";
}

/** A ação da linha: { kind, label } ou { text } quando não há o que fazer. */
export function rentAdvanceAction(status) {
  if (ACTIONS[status]) return ACTIONS[status];
  return { text: FINAL_TEXT[status] || "Nenhuma ação disponível" };
}
