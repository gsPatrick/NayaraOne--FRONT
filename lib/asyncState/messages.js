// Textos do padrão de estados de UI (M9-D850 §4), em português. Um só lugar: o componente e os testes leem daqui.
import { UI_STATE } from "./states";

export const MESSAGES = Object.freeze({
  loading: "Carregando...",
  permissionTitle: "Você não tem acesso a esta área.",
  permissionHelp: "Peça ao administrador da sua empresa",
  offlineTitle: "Sem conexão ou serviço indisponível",
  offlineText: "Sem conexão. Verifique a internet e tente novamente.",
  offlineCode: "GOV_UI_NETWORK_OFFLINE",
  retryTitle: "Não foi possível concluir agora",
  retryButton: "Tentar novamente",
  offlineRetryButton: "Tentar de novo",
  sessionExpired: "Sua sessão expirou. Entre novamente.",
  validationTitle: "Revise os campos indicados",
  staleBadge: "desatualizado",
  emptyTitle: "Nada por aqui ainda",
});

/** "Algo deu errado. Informe o código <traceId> ao suporte." (sem stack; sem traceId, o texto sem o código). */
export function genericErrorText(traceId) {
  return traceId ? `Algo deu errado. Informe o código ${traceId} ao suporte.` : "Algo deu errado. Tente novamente em instantes e, se persistir, fale com o suporte.";
}

/** Texto curto do estado, para leitores de tela e títulos. */
export function titleOf(state, traceId) {
  switch (state) {
    case UI_STATE.PERMISSION_DENIED: return MESSAGES.permissionTitle;
    case UI_STATE.OFFLINE: return MESSAGES.offlineTitle;
    case UI_STATE.RETRY: return MESSAGES.retryTitle;
    case UI_STATE.VALIDATION_ERROR: return MESSAGES.validationTitle;
    case UI_STATE.SESSION_EXPIRED: return MESSAGES.sessionExpired;
    case UI_STATE.LOADING: return MESSAGES.loading;
    default: return genericErrorText(traceId);
  }
}
