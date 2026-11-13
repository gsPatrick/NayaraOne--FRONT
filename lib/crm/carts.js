// Carrinho de imóveis (livro do Marco 3 §14). Funções puras da tela: rótulos, link público e resumo do rastreio.

export const CART_STATUS_LABELS = { ACTIVE: "Ativo", EXPIRED: "Expirado", REVOKED: "Revogado" };
export const CART_STATUS_TONE = { ACTIVE: "success", EXPIRED: "warning", REVOKED: "neutral" };

/** Endereço público do carrinho (página sem login do Front). `origin` vem do navegador. */
export function publicCartUrl(origin, token) {
  if (!token) return "";
  return `${String(origin || "").replace(/\/$/, "")}/carrinho/${encodeURIComponent(token)}`;
}

/** Imóveis da versão atual (o que está enviado agora). */
export function currentVersionOf(cart) {
  return (cart?.versions || []).find((v) => v.versionNumber === cart.currentVersion) || null;
}

/** Linhas do rastreio por imóvel da versão atual: cliques recebidos em cada um. */
export function clicksByProperty(cart) {
  const version = currentVersionOf(cart);
  const clicks = cart?.tracking?.clicksByProperty || {};
  return (version?.properties || []).map((p) => ({ ...p, clicks: clicks[p.id] || 0 }));
}

/** Validação da seleção: ao menos um imóvel e sem repetição. */
export function selectionError(propertyIds) {
  const ids = (propertyIds || []).filter(Boolean);
  if (ids.length === 0) return "Selecione ao menos um imóvel.";
  if (new Set(ids).size !== ids.length) return "O mesmo imóvel foi selecionado duas vezes.";
  return "";
}
