// Texto da região viva do padrão de estados (M9-D851): o que o leitor de tela anuncia quando o estado muda.
// Carregando, conteúdo (ex.: "12 contatos encontrados"), vazio e cada erro. Função pura: o componente e os testes leem daqui.
import { UI_STATE } from "./states";
import { MESSAGES, titleOf, businessMessageOf } from "./messages";

export const LOADED_TEXT = "Conteúdo carregado.";

/** `contentAnnouncement`: texto ou função(dado) -> texto, para o estado CONTENT (padrão: "Conteúdo carregado."). */
export function announcementOf(result, { loadingLabel, emptyTitle, contentAnnouncement } = {}) {
  const { status, data, error, traceId } = result || {};
  switch (status) {
    case UI_STATE.LOADING: return loadingLabel || MESSAGES.loading;
    case UI_STATE.CONTENT: {
      const custom = typeof contentAnnouncement === "function" ? contentAnnouncement(data) : contentAnnouncement;
      return custom || LOADED_TEXT;
    }
    case UI_STATE.EMPTY: return emptyTitle || MESSAGES.emptyTitle;
    case UI_STATE.SUCCESS: return ""; // o próprio aviso de sucesso já é role=status (não anuncia duas vezes)
    case UI_STATE.ERROR: return businessMessageOf(error) || titleOf(UI_STATE.ERROR, traceId);
    case UI_STATE.RETRY:
    case UI_STATE.OFFLINE:
    case UI_STATE.PERMISSION_DENIED:
    case UI_STATE.VALIDATION_ERROR:
    case UI_STATE.SESSION_EXPIRED: return titleOf(status, traceId);
    default: return "";
  }
}

/** "1 contato encontrado" / "N contatos encontrados" / "Nenhum contato encontrado". */
export function countAnnouncement(count, singular, plural) {
  if (!count) return `Nenhum ${singular} encontrado`;
  return count === 1 ? `1 ${singular} encontrado` : `${count} ${plural} encontrados`;
}
