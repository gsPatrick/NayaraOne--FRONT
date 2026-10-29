// Parâmetros da exportação do BI (Marco 9, M9-D701). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_EXPORTACAO_GROUPS = [
  {
    title: "Exportação do BI: risco, validade e limites",
    subtitle: "Quem exporta dados do BI pede o arquivo, que é gerado em segundo plano, fica disponível por um tempo e some. Exportação grande (massiva) exige uma confirmação por MFA recente de quem pediu.",
    fields: [
      {
        key: "analytics.export.limite_linhas_alto_risco",
        label: "Acima de quantas linhas a exportação é de alto risco (exige MFA)",
        type: "number",
        defaultValue: 1000,
        helper: "A partir de 1. Exportação com mais linhas que isto exige confirmação por MFA recente de quem pediu; com menos, sai sem MFA.",
      },
      {
        key: "analytics.export.validade_horas",
        label: "Por quanto tempo o arquivo pronto fica disponível (horas)",
        type: "number",
        defaultValue: 24,
        helper: "De 1 a 720. Depois disso o link deixa de funcionar e o arquivo é apagado.",
      },
      {
        key: "analytics.export.url_minutos",
        label: "Validade do endereço de download (minutos)",
        type: "number",
        defaultValue: 15,
        helper: "De 1 a 1.440. O endereço emitido a cada download vale por este tempo, sem passar da validade do arquivo. Só quem pediu a exportação consegue baixar.",
      },
      {
        key: "analytics.export.max_linhas",
        label: "Limite de linhas de um arquivo",
        type: "number",
        defaultValue: 50000,
        helper: "De 1 a 1.000.000. Exportação com mais linhas que isto não é gerada (nunca é cortada em silêncio): refine o recorte do pedido.",
      },
      {
        key: "analytics.export.timeout_execucao_minutos",
        label: "Tempo máximo de uma exportação em andamento (minutos)",
        type: "number",
        defaultValue: 30,
        helper: "De 1 a 1.440. Uma exportação que fica em andamento além disto é dada como falha (por exemplo, quando o processo caiu).",
      },
    ],
  },
];
