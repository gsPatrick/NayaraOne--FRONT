// Parâmetros dos painéis de Obras, Estoque e Patrimônio (Marco 9, M9-D618). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_OBRAS_GROUPS = [
  {
    title: "Obras: previsão e receita",
    subtitle: "Como os painéis de Obras projetam o término e o custo final de cada obra e qual valor de contrato conta como receita. A projeção sempre aparece rotulada como projetada e nunca é somada ao que já foi realizado.",
    fields: [
      {
        key: "analytics.obra.previsao_metodo",
        label: "Método da previsão de prazo e custo",
        type: "text",
        defaultValue: "RITMO",
        helper: "RITMO projeta o término e o custo final pelo ritmo já medido na obra (padrão). PLANEJADO repete o prazo e o orçamento aprovados. Sem avanço medido, a previsão por ritmo fica em branco em vez de inventar um número.",
      },
      {
        key: "analytics.obra.receita_contrato_status",
        label: "Contratos que contam como receita da obra",
        type: "text",
        defaultValue: "SIGNED,ACTIVE,SUSPENDED,CLOSED",
        helper: "Status de contrato (em maiúsculas, separados por vírgula) cujo valor entra na receita contratada da obra. Contrato em rascunho, cancelado ou rescindido não entra.",
      },
    ],
  },
  {
    title: "Estoque: itens considerados",
    subtitle: "Quais tipos de item entram no valor em estoque, nos itens abaixo do mínimo e nas rupturas. Ferramentas e patrimônio têm painel próprio.",
    fields: [
      {
        key: "analytics.estoque.tipos_item",
        label: "Tipos de item do estoque",
        type: "text",
        defaultValue: "CONSUMABLE",
        helper: "Tipos separados por vírgula: CONSUMABLE, TOOL, ASSET, SERVICE_ITEM. Padrão: só os materiais de consumo.",
      },
    ],
  },
];
