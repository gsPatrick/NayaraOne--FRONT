// Parâmetros dos painéis de Locação (Marco 9, M9-D617). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_LOCACAO_GROUPS = [
  {
    title: "Locação",
    subtitle: "O que conta como locação nos painéis de Contratos, Vacância, Inadimplência, Repasses e Satisfação. A janela da taxa de inadimplência é a mesma do Financeiro (grupo Inadimplência).",
    fields: [
      {
        key: "analytics.locacao.tipos_contrato",
        label: "Tipos de contrato que contam como locação",
        type: "text",
        defaultValue: "LEASE,LEASE_RESIDENTIAL,LEASE_COMMERCIAL,LEASE_SEASONAL,PROPERTY_ADMIN",
        helper: "Códigos de tipo de contrato em maiúsculas, separados por vírgula. Contrato de venda não entra.",
      },
      {
        key: "analytics.locacao.repasse_prazo_dias",
        label: "Dias, depois do mês de referência, para o repasse ao proprietário vencer",
        type: "number",
        defaultValue: 10,
        helper: "De 0 a 90. O repasse pendente passa a vencido quando o último dia do mês de referência mais estes dias ficam para trás. Padrão: 10.",
      },
      {
        key: "analytics.locacao.nota_elogio",
        label: "Nota de satisfação de um elogio",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 10. Não existe pesquisa de satisfação: cada elogio, reclamação ou conflito registrado por um locatário conta como uma resposta com a nota do tipo. Padrão: 5.",
      },
      {
        key: "analytics.locacao.nota_reclamacao",
        label: "Nota de satisfação de uma reclamação",
        type: "number",
        defaultValue: 1,
        helper: "De 0 a 10. Padrão: 1.",
      },
      {
        key: "analytics.locacao.nota_conflito",
        label: "Nota de satisfação de um conflito",
        type: "number",
        defaultValue: 3,
        helper: "De 0 a 10. Padrão: 3.",
      },
    ],
  },
];
