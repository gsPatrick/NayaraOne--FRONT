// Minuta sugerida pela NAY Jurídica (Caderno M5 §17): rótulos e regra de exibição das ações. A API decide (aceite e descarte
// só de minuta pendente; texto nunca editado).
export const DRAFT_STATUS_LABELS = { PENDING_REVIEW: "Aguardando revisão", ACCEPTED: "Aceita (virou versão)", DISCARDED: "Descartada" };
export const DRAFT_STATUS_TONE = { PENDING_REVIEW: "warning", ACCEPTED: "success", DISCARDED: "neutral" };
const MODE_TEXT = {
  IA_DESLIGADA: "IA desligada na empresa",
  AGENTE_DESLIGADO: "NAY Jurídica desligada",
  IA_SEM_ATERRAMENTO: "resposta da IA fora da biblioteca homologada",
  AI_BUDGET_EXHAUSTED: "orçamento da IA esgotado",
  AI_BUDGET_NOT_CONFIGURED: "orçamento da IA não configurado",
};

/** Como a minuta foi montada, em português. */
export function draftMethodLabel(s) {
  if (!s) return "";
  if (s.metodo === "AI") return "Escolhida pela IA entre as cláusulas homologadas";
  const why = MODE_TEXT[s.motivoDoModo] || "IA indisponível";
  return `Montada pela regra (${why})`;
}

export function canDecideDraft(s, canCreate) {
  return Boolean(canCreate) && Boolean(s) && s.status === "PENDING_REVIEW";
}
