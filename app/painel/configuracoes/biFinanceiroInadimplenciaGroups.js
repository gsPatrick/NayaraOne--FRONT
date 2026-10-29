// Parâmetros do BI do Financeiro (Marco 9, M9-D622): valor inadimplente, taxa de inadimplência e necessidade para respirar. A API valida (SETTINGS_SCHEMA); o
// padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. A janela da taxa (90 dias) é a do grupo de
// parâmetros do Financeiro (analytics.inadimplencia.janela_dias).
const DEFAULT_OWNER = "Diretoria Financeira (papel financeiro-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({
  key,
  label: `Responsável pelo indicador ${label}`,
  type: "text",
  defaultValue: DEFAULT_OWNER,
  helper: HELPER,
});

export const BI_FINANCEIRO_INADIMPLENCIA_GROUPS = [
  {
    title: "Inadimplência e necessidade para respirar",
    subtitle: "Quanto já deveria ter entrado e não entrou, que parte da cobrança recente está em atraso e quanto dinheiro falta para atravessar os próximos 30 dias. O valor é calculado no servidor; aqui você só ajusta as regras.",
    fields: [
      {
        key: "analytics.inadimplencia.faixas_atraso_dias",
        label: "Faixas de atraso do valor inadimplente (dias)",
        type: "text",
        defaultValue: "30,60,90",
        helper: "De 1 a 6 limites crescentes separados por vírgula. Com 30,60,90 as faixas são 1-30, 31-60, 61-90 e 90+ dias de atraso. Padrão: 30,60,90.",
      },
      owner("analytics.owner.fin.overdue_receivables", "Valor inadimplente"),
      owner("analytics.owner.fin.delinquency_rate", "Taxa de inadimplência"),
      owner("analytics.owner.fin.breathing_need", "Necessidade para respirar"),
    ],
  },
];
