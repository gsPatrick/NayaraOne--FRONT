// Parâmetros do BI do Financeiro (Marco 9, M9-D621): indicadores de contas a pagar e recebíveis em 7, 30 e 60 dias. As janelas são do livro e não
// mudam; aqui o administrador define o responsável (owner) de cada indicador. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const DEFAULT_OWNER = "Diretoria Financeira (papel financeiro-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({
  key,
  label: `Responsável pelo indicador ${label}`,
  type: "text",
  defaultValue: DEFAULT_OWNER,
  helper: HELPER,
});

export const BI_FINANCEIRO_JANELAS_GROUPS = [
  {
    title: "Contas a pagar e recebíveis em 7, 30 e 60 dias",
    subtitle: "Quanto vence nos próximos 7, 30 e 60 dias, só com lançamentos próprios pendentes (dinheiro de terceiros e vencidos ficam de fora). O valor é calculado no servidor; aqui você só define quem confere cada número.",
    fields: [
      owner("analytics.owner.fin.payables_7d", "Contas a pagar em 7 dias"),
      owner("analytics.owner.fin.payables_30d", "Contas a pagar em 30 dias"),
      owner("analytics.owner.fin.payables_60d", "Contas a pagar em 60 dias"),
      owner("analytics.owner.fin.receivables_7d", "Recebíveis em 7 dias"),
      owner("analytics.owner.fin.receivables_30d", "Recebíveis em 30 dias"),
      owner("analytics.owner.fin.receivables_60d", "Recebíveis em 60 dias"),
    ],
  },
];
