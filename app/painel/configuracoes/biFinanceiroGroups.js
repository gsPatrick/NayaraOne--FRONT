// Parâmetros do BI do Financeiro (Marco 9, M9-D624): KPIs de conciliações pendentes e anomalias abertas. A API valida (SETTINGS_SCHEMA);
// o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_FINANCEIRO_GROUPS = [
  {
    title: "Conciliações pendentes e anomalias abertas",
    subtitle: "Como o painel Financeiro conta as transações do extrato ainda não conciliadas e os casos de anomalia abertos. O valor é calculado no servidor; aqui você só ajusta as regras.",
    fields: [
      {
        key: "analytics.qualidade.max_idade_extrato_dias",
        label: "Idade máxima da última importação de extrato (dias)",
        type: "number",
        defaultValue: 3,
        helper: "De 1 a 365. Se o último extrato importado for mais antigo que isto, as conciliações pendentes aparecem como \"Dado incompleto\", sem número, porque a pendência pode estar subestimada. Padrão: 3.",
      },
      {
        key: "analytics.conciliacao.faixas_idade_dias",
        label: "Faixas de idade da pendência (dias)",
        type: "text",
        defaultValue: "2,7",
        helper: "Dois limites crescentes separados por vírgula. Com 2,7 as faixas são 0-2, 3-7 e 8 ou mais dias. Padrão: 2,7.",
      },
      {
        key: "analytics.owner.fin.reconciliations_pending",
        label: "Responsável pelo indicador Conciliações pendentes",
        type: "text",
        defaultValue: "Diretoria Financeira (papel financeiro-gestor)",
        helper: "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.",
      },
      {
        key: "analytics.owner.fin.anomalies_open",
        label: "Responsável pelo indicador Anomalias abertas",
        type: "text",
        defaultValue: "Diretoria Financeira (papel financeiro-gestor)",
        helper: "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.",
      },
    ],
  },
];
