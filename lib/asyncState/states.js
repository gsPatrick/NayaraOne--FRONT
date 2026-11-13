// Padrão de estados de UI (Marco 9, M9-D850): os sete estados do livro e o mapa de status HTTP -> estado.
// Lógica pura (sem React, sem rede): serve ao componente AsyncState, ao hook useAsyncState e aos testes.

export const UI_STATE = Object.freeze({
  LOADING: "LOADING",
  CONTENT: "CONTENT",
  EMPTY: "EMPTY",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  OFFLINE: "OFFLINE",
  RETRY: "RETRY",
  SUCCESS: "SUCCESS",
  // 401 (sessão ausente ou expirada): nunca é acesso negado; leva ao login com returnTo (decisão K12).
  SESSION_EXPIRED: "SESSION_EXPIRED",
  // Qualquer outro status sem mapeamento (404, 409 etc.): erro genérico com o código de rastreio.
  ERROR: "ERROR",
});

// Códigos de 401 que significam sessão ausente ou inválida (os mesmos que o apiFetch renova ou derruba).
export const SESSION_CODES = Object.freeze([
  "MISSING_ACCESS_TOKEN",
  "INVALID_ACCESS_TOKEN_CLAIMS",
  "SESSION_INVALID",
  "INVALID_ACCESS_TOKEN",
  "AUTH_CONTEXT_MISSING",
  "TENANT_CONTEXT_MISSING",
  "SESSION_EXPIRED",
]);

// Códigos de "provedor indisponível": contam como OFFLINE mesmo com outro status.
export const PROVIDER_UNAVAILABLE_CODES = Object.freeze(["PROVIDER_UNAVAILABLE", "INTEGRATION_PROVIDER_UNAVAILABLE", "GOV_UI_NETWORK_OFFLINE", "NETWORK_ERROR"]);

const OFFLINE_STATUSES = [502, 503, 504];

/**
 * Classifica uma FALHA (ApiError ou erro de rede) em um dos estados do livro. `online` vem de navigator.onLine.
 * Sem sobreposição: rede e 502/503/504 = OFFLINE; 429 e os demais 5xx (500 incluído) = RETRY.
 */
export function classifyFailure(error, { online = true } = {}) {
  const status = Number(error && error.status) || 0;
  const code = (error && error.code) || "";
  if (status === 401 && (SESSION_CODES.includes(code) || code === "")) return UI_STATE.SESSION_EXPIRED;
  if (status === 401) return UI_STATE.ERROR;
  if (online === false) return UI_STATE.OFFLINE;
  if (PROVIDER_UNAVAILABLE_CODES.includes(code) || status === 0 || OFFLINE_STATUSES.includes(status)) return UI_STATE.OFFLINE;
  if (status === 403) return UI_STATE.PERMISSION_DENIED;
  if (status === 400 || status === 422) return UI_STATE.VALIDATION_ERROR;
  if (status === 429 || status >= 500) return UI_STATE.RETRY;
  return UI_STATE.ERROR;
}

/** Resposta bem-sucedida (200): lista vazia = EMPTY; qualquer outra coisa com dado = CONTENT. */
export function defaultIsEmpty(data) {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object" && Array.isArray(data.items)) return data.items.length === 0;
  return false;
}

export function classifySuccess(data, isEmpty = defaultIsEmpty) {
  return isEmpty(data) ? UI_STATE.EMPTY : UI_STATE.CONTENT;
}

/**
 * Erros por campo de um 400/422: aceita { field, reason|message }, { problems: [...] }, { fields: { campo: "texto" } } e { fields: ["campo", ...] }
 * (lista de nomes, sem texto por campo: os erros da porta da API e do banco, rodada 8 da verificação do Marco 9). Na lista, a mensagem do campo é a
 * do próprio erro quando ela cita o campo, senão fica vazia (quem mostra usa o rótulo do campo e um texto padrão).
 */
export function fieldErrorsOf(error) {
  const details = error && error.details;
  if (!details) return [];
  const list = Array.isArray(details) ? details : Array.isArray(details.problems) ? details.problems : null;
  if (list) return list.filter((item) => item && (item.field || item.path)).map((item) => ({ field: String(item.field || item.path), message: String(item.reason || item.message || "") }));
  if (Array.isArray(details.fields)) {
    const raw = String((error && error.message) || "");
    return [...new Set(details.fields.filter((name) => typeof name === "string" && name.trim()))].map((field) => ({ field, message: raw.includes(`"${field}"`) ? raw : "" }));
  }
  if (details.fields && typeof details.fields === "object") return Object.entries(details.fields).map(([field, message]) => ({ field, message: String(message) }));
  return [];
}

/** Permissão que faltou (código), quando a API a informa em details.required. Nunca nome de recurso. */
export function missingPermissionOf(error) {
  const required = error && error.details && error.details.required;
  return typeof required === "string" && /^[a-z0-9:_-]+$/i.test(required) ? required : null;
}
