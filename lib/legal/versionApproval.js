// Aprovação da versão do contrato com a permissão do livro (Guia M5 §6 assertPermission(ctx, 'contracts.version.approve'),
// DEC-073): a API exige esta permissão em POST /contract-versions/:id/approve e na transição para APPROVED. A tela só mostra
// os botões para quem tem a permissão; a decisão real continua sendo da API.
export const VERSION_APPROVE_PERMISSION = "contracts.version.approve";

/** A transição genérica para este destino exige a permissão de aprovação da versão? */
export function transitionNeedsVersionApprove(target) {
  return String(target || "").toUpperCase() === "APPROVED";
}

/** Pode mostrar "Aprovar versão" para o status do contrato e a permissão da sessão? */
export function canShowVersionApproval(contractStatus, hasPermission) {
  return Boolean(hasPermission) && ["LEGAL_REVIEW", "APPROVED"].includes(contractStatus);
}
