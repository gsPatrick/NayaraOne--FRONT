// Notificação formal (Caderno M5 §13 "canal, destinatário, conteúdo/arquivo"): o destinatário é obrigatório — a pessoa cadastrada
// ou uma descrição de quem recebe. A API recusa criar, versionar e enviar sem ele (400 LEGAL_NOTICE_RECIPIENT_REQUIRED); a tela
// segura o envio do formulário antes.
export const NOTICE_RECIPIENT_MESSAGE = "Informe o destinatário: escolha a pessoa ou descreva quem vai receber a notificação.";

/** Tem destinatário: pessoa escolhida ou descrição que não seja só espaço. */
export function hasNoticeRecipient({ recipientPersonId, recipientDescription } = {}) {
  return Boolean(recipientPersonId) || String(recipientDescription || "").trim().length > 0;
}
