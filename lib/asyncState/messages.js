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

// Códigos de negócio conhecidos da API -> frase pronta em português (preferidos ao texto livre da resposta).
const CODE_MESSAGES = Object.freeze({
  PERSON_DUPLICATE: "Já existe um cadastro igual a este.",
  GOV_MODULE_DISABLED: "Este módulo está desativado para a sua empresa.",
});

const MAX_LENGTH = 200;
// Lista de PERMISSÃO: letras (com acento), dígitos, espaço e pontuação comum. Fora disso (aspas duplas, _ = { } [ ] \ | < > @ # * + ~ ` ^) não passa.
const ALLOWED_CHARS = /^[\p{L}\p{N}\p{M} .,;:!?()\-–—%/$'’“”«»º°ª]+$/u;
const SAFE_SLASH_TOKEN = /^\(?(\d{1,4}(\/\d{1,4}){1,2}|\p{L}{1,3}\/\p{L}{1,3})\)?[.,;:!?)]*$/u;
// Palavras de inglês técnico que denunciam mensagem de biblioteca/banco/servidor.
const ENGLISH = new Set(("the is are was were not does did exist exists relation column violates constraint duplicate key value unique failed fail error timeout connect connection null table query syntax input cannot unable request server refused denied found for of to with from must be and such file directory already missing required field unexpected failure database socket path host at by has have it this that access expired invalid unknown bad response status undefined").split(" "));

/**
 * Texto de negócio devolvido pela API (ex.: 409 "código interno já existe"). Lista de PERMISSÃO: só passa frase curta em português
 * (até 200 caracteres); nada que pareça stack, SQL, caminho, URL, código técnico (ECONNREFUSED, SQLSTATE) ou inglês técnico.
 * Quando a API informa um código de negócio conhecido, vale a frase mapeada.
 */
export function businessMessageOf(error) {
  if (!error) return "";
  if (typeof error.code === "string" && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];
  return safeText(error.message);
}

export function safeText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > MAX_LENGTH || !/\p{L}/u.test(text)) return "";
  const plain = text.replace(/R\$/g, "R");
  if (!ALLOWED_CHARS.test(plain) || plain.includes("$")) return "";
  if (/::|\.\.|\/\/|\\/.test(text)) return "";
  if (/\p{Ll}\p{Lu}/u.test(text)) return ""; // camelCase / nome de classe
  if (/\p{L}\.\p{L}/u.test(text) || /\d+\.\d+\.\d+\.\d+/.test(text)) return ""; // arquivo.ext, IP
  if (/\p{Lu}{5,}/u.test(text)) return ""; // ECONNREFUSED, SQLSTATE
  if (/:\S/.test(text.replace(/\d:\d/g, "0 0"))) return ""; // "http:", "a:b" (hora 10:30 passa)
  if (/\b(at \S+ \(|stack|undefined|object Object)\b|\b(SELECT|INSERT|UPDATE|DELETE)\b|\w*(Error|Exception)\b/i.test(text)) return "";
  if (/^algo deu errado/i.test(text)) return "";
  const words = text.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  for (const token of text.split(/\s+/)) {
    if (token.includes("/") && !SAFE_SLASH_TOKEN.test(token)) return "";
  }
  const english = words.filter((word) => ENGLISH.has(word)).length;
  if (english && english / words.length >= 0.25) return "";
  return text;
}
