// Retorno ao login (M9-D850, decisão K12): 401 leva a /entrar?returnTo=<rota>&motivo=sessao-expirada e, depois de entrar, volta à rota.
// Só aceita caminho interno do próprio painel (nunca URL externa nem "//").

export const SESSION_EXPIRED_REASON = "sessao-expirada";
export const SESSION_EXPIRED_TEXT = "Sua sessão expirou. Entre novamente.";

/** Caminho interno seguro ou null. */
export function safeReturnTo(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  if (value === "/entrar" || value.startsWith("/entrar?") || value.startsWith("/entrar/")) return null;
  return value;
}

/** URL do login para a rota atual (path + query), com o motivo. */
export function buildLoginUrl(currentPath) {
  const target = safeReturnTo(currentPath);
  const params = new URLSearchParams();
  if (target) params.set("returnTo", target);
  params.set("motivo", SESSION_EXPIRED_REASON);
  return `/entrar?${params.toString()}`;
}

/** Lê returnTo e motivo da query string do login. */
export function readLoginParams(search) {
  const params = new URLSearchParams(search || "");
  return { returnTo: safeReturnTo(params.get("returnTo")), expired: params.get("motivo") === SESSION_EXPIRED_REASON };
}
