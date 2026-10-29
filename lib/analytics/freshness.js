// M9-D609 (BI-013, Guia §14) — como a freshness que a API devolve vira texto na tela. Só descreve: a idade, o estado e o rótulo já vêm
// prontos do servidor (`freshness: { state, label, ageMinutes, ... }`); nenhum cálculo de indicador mora no Front.
// Regra: dado velho nunca se passa por atual. STALE mostra o valor com o selo "Desatualizado há X"; EXPIRED nunca mostra o número, só
// "Dado antigo, não use para decidir"; nunca atualizado mostra "Ainda sem atualização" e nenhum valor.

export const FRESHNESS_TONES = {
  FRESH: "ok",
  STALE: "warning",
  EXPIRED: "danger",
  UNKNOWN: "danger",
};

/** { tone, text, showValue }: o que o card/tabela mostra ao lado (ou no lugar) do valor. Sem bloco de freshness, não inventa selo. */
export function freshnessDisplay(metric) {
  const freshness = metric && metric.freshness;
  if (!freshness || !freshness.state) return { tone: "danger", text: "Sem informação de atualização", showValue: false };
  const hasValue = metric.value !== null && metric.value !== undefined;
  if (freshness.historical) return { tone: "ok", text: freshness.label || "", showValue: hasValue }; // dia passado: o registro é mostrado como foi gravado
  const tone = FRESHNESS_TONES[freshness.state] || "danger";
  const hidden = freshness.state === "EXPIRED" || freshness.state === "UNKNOWN";
  return { tone, text: freshness.label || "", showValue: hasValue && !hidden };
}
