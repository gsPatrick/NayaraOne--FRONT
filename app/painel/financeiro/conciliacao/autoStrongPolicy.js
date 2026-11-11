// Regra AUTO_STRONG da conciliação (Guia M4 §9; DEC-006): o texto que a tela mostra para cada parâmetro vigente da empresa. Puro, testado em
// test/m4.conciliacaoRegraAutoStrong.test.mjs. Os valores vêm de GET /finance/reconciliation/policy (a API lê os parâmetros da aba Financeiro).
const decimal = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function describeAutoStrongPolicy(policy) {
  if (!policy) return [];
  return [
    { key: "auto", label: "Correspondência forte a partir de", value: `${decimal(policy.autoScoreMin)} ponto(s)` },
    { key: "sugestao", label: "Sugere a partir de", value: `${decimal(policy.suggestionScoreMin)} ponto(s)` },
    { key: "janela", label: "Janela de data", value: `${policy.dateWindowDays} dia(s)` },
    { key: "folga", label: "Folga de empate (ambíguo)", value: `${decimal(policy.ambiguityGap)} ponto(s)` },
    {
      key: "forte",
      label: "Forte confirma sozinha",
      value: policy.autoStrong ? "Sim (só de fonte confiável)" : "Não: espera alguém da equipe",
    },
  ];
}

// Motivo devolvido pela API quando a conciliação automática não confirmou sozinha.
export const AUTO_BLOCKED_REASON = {
  UNTRUSTED_SOURCE: "A linha do extrato não vem de fonte confiável (digitada à mão ou importada sem permissão de conciliar): alguém da equipe confirma.",
  AUTO_STRONG_OFF: "A regra da empresa não confirma sozinha a correspondência forte: alguém da equipe confirma.",
  BELOW_AUTO_SCORE: "A pontuação ficou abaixo do mínimo da correspondência forte.",
  ENTRY_UNDER_REVIEW: "O lançamento está retido para revisão do antifraude.",
  CLASS_REQUIRES_HUMAN: "Correspondência provável, ambígua ou sem candidato: nunca é confirmada sozinha.",
  ALREADY_RECONCILED: "Esta linha do extrato já está conciliada.",
};

export function sourceLabel(source, trusted) {
  const base = { MANUAL: "Digitada à mão", FILE_IMPORT: "Arquivo de extrato", WEBHOOK: "Retorno do banco", PROVIDER_FETCH: "Consulta ao banco", LEGACY: "Anterior à origem registrada" }[source] || "Origem não informada";
  return `${base}${trusted ? " (fonte confiável)" : ""}`;
}
