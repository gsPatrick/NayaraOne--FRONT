// M9-D610 (BI-006) — natureza do valor de um indicador do BI: rótulo em português, legenda e padrão de desenho.
// Só descreve e formata: nenhum cálculo de indicador mora no Front (os totais já vêm da API, por natureza).
// A distinção nunca depende só da cor: cada natureza tem rótulo escrito e um padrão próprio (sólido, hachurado, tracejado, pontilhado).

export const NATURE_ORDER = ["ACTUAL", "PLANNED", "ESTIMATED", "PROJECTED"];

export const NATURE_INFO = {
  ACTUAL: { label: "Realizado", pattern: "solid", patternName: "preenchimento sólido", caption: "Fato já ocorrido e registrado." },
  PLANNED: { label: "Previsto", pattern: "hatched", patternName: "hachura", caption: "Compromisso ou agenda existente." },
  ESTIMATED: { label: "Estimado", pattern: "dashed", patternName: "contorno tracejado", caption: "Valor atribuído por pessoa ou regra, sem fato." },
  PROJECTED: { label: "Projetado", pattern: "dotted", patternName: "pontilhado", caption: "Resultado de fórmula que extrapola." },
};

export function natureInfo(nature) {
  const info = NATURE_INFO[nature];
  if (!info) throw new Error(`Natureza de valor desconhecida: ${nature}`);
  return info;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata o texto decimal que a API devolve (ex.: "80000.00") como moeda; não altera o número. */
export function formatNatureValue(text) {
  return BRL.format(Number(text));
}
