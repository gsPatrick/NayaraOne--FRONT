// Comparação entrada x saída pela NAY (Caderno M5 §11 "NAY pode comparar entrada x saída e sugerir diferenças; humano valida
// responsabilidade/cobrança"). A resposta de POST /legal/nay/inspections/compare vira o que a tela mostra: a resposta da NAY com as
// fontes citadas e as sugestões para uma pessoa aceitar ou rejeitar, ou — com a NAY desligada — só a comparação item a item.
export const NAY_HUMAN_NOTICE = "Sugestão da NAY — a responsabilidade e a cobrança são decididas por uma pessoa.";

const DETERMINISTIC_TEXT = {
  AI_OFF: "A NAY está desligada; abaixo a comparação item a item.",
  NO_AI_PERMISSION: "Você não tem permissão para usar a NAY; abaixo a comparação item a item.",
};
const DETERMINISTIC_FALLBACK = "A NAY não respondeu agora; abaixo a comparação item a item.";

export const RECOMMENDATION_STATUS_LABELS = {
  PENDING: "Aguardando decisão",
  ACCEPTED: "Aceita",
  REJECTED: "Rejeitada",
  STALE: "Desatualizada",
  EXECUTED: "Aceita",
  EXECUTION_FAILED: "Falhou ao registrar",
  EXPIRED: "Expirada",
};
export const RECOMMENDATION_STATUS_TONE = {
  PENDING: "warning", ACCEPTED: "success", REJECTED: "neutral", STALE: "neutral", EXECUTED: "success", EXECUTION_FAILED: "danger", EXPIRED: "neutral",
};

/** Normaliza a resposta da API para a tela. */
export function nayComparisonView(data) {
  const body = data || {};
  const comparison = body.comparison || {};
  const nay = body.nay || null;
  const aiMode = body.mode === "AI" && Boolean(nay);
  return {
    aiMode,
    runId: aiMode ? nay.runId || null : null,
    notice: aiMode ? null : DETERMINISTIC_TEXT[body.reason] || DETERMINISTIC_FALLBACK,
    answer: aiMode ? String(nay.answer || "").trim() : "",
    sources: aiMode && Array.isArray(nay.sources) ? nay.sources : [],
    recommendations: aiMode && Array.isArray(nay.recommendations) ? nay.recommendations : [],
    blocked: aiMode && !String(nay.answer || "").trim(),
    comparison,
  };
}

/** Texto curto de uma fonte citada (título, cláusula/item e trecho), sem referência técnica. */
export function sourceText(source) {
  const head = [source.title, source.clause].filter((part) => part && String(part).trim()).join(" — ");
  return { head: head || "Item da vistoria", excerpt: source.excerpt ? String(source.excerpt).trim() : "" };
}

/** Motivo da rejeição de uma sugestão: entre 5 e 500 caracteres (sem contar espaços nas pontas). "" quando está bom. */
export function rejectReasonProblem(reason) {
  const size = String(reason || "").trim().length;
  if (size < 5) return "Escreva o motivo da rejeição (no mínimo 5 caracteres).";
  if (size > 500) return "O motivo pode ter no máximo 500 caracteres.";
  return "";
}

/** Situação da sugestão depois da decisão (a resposta traz a recomendação atualizada; sem ela, a decisão pedida). */
export function decidedStatus(response, fallback) {
  const status = response && response.recommendation && response.recommendation.status;
  return status || fallback;
}

/**
 * Linhas da comparação: a resposta nova (items[]: ambiente/item, antes, depois, mudou, mídias); vistorias antigas sem `items` caem nas
 * divergências. Usada pela comparação da vistoria e pela comparação item a item da NAY desligada.
 */
export function comparisonRows(comparison) {
  const body = comparison || {};
  if (Array.isArray(body.items)) return body.items;
  return (body.divergences || []).map((d) => ({ itemName: d.itemName, roomCode: d.roomCode, itemCode: d.itemCode, before: d.entryCondition, after: d.exitCondition, changed: true, mediaRefs: [] }));
}
