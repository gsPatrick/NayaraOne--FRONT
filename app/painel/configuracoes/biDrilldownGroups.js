// Parâmetros do detalhe (drill-down) dos indicadores do BI (Marco 9, M9-D690). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_DRILLDOWN_GROUPS = [
  {
    title: "Detalhe do indicador (drill-down)",
    subtitle: "Ao clicar no número de um indicador crítico, o BI abre a lista dos registros que o compõem, só para quem tem permissão de detalhe e a permissão da área. A lista é paginada.",
    fields: [
      {
        key: "analytics.drilldown.tamanho_pagina_maximo",
        label: "Maior tamanho de página do detalhe",
        type: "number",
        defaultValue: 200,
        helper: "De 1 a 1.000. Pedido de página maior que isto é recusado com a mensagem do máximo. Padrão do livro: 200.",
      },
      {
        key: "analytics.drilldown.tamanho_pagina_padrao",
        label: "Tamanho de página quando o pedido não informa",
        type: "number",
        defaultValue: 50,
        helper: "De 1 a 1.000, nunca acima do máximo. Padrão: 50.",
      },
    ],
  },
];
