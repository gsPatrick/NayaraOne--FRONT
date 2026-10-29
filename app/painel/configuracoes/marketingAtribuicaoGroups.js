// Atribuição de campanha (Marco 9, M9-D431). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_ATRIBUICAO_GROUPS = [
  {
    title: "Atribuição de vendas a campanhas",
    subtitle: "O sistema guarda o primeiro e o último contato de marketing de cada cliente antes do lead e da venda. Só conta contato com evidência dentro da janela abaixo; sem contato na janela, a venda fica não atribuída.",
    fields: [
      {
        key: "marketing.attribution.janela_dias",
        label: "Janela de atribuição (dias)",
        type: "integer",
        defaultValue: 90,
        helper: "Número inteiro de 1 a 3650. Contatos mais antigos que isso não contam para o primeiro nem para o último contato.",
      },
    ],
  },
];
