// Parâmetros do BI do Financeiro (Marco 9, M9-D623): margem por setor, comissões provisionadas e pagas e repasses pendentes ao proprietário. A API valida
// (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const DEFAULT_OWNER = "Diretoria Financeira (papel financeiro-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: DEFAULT_OWNER, helper: HELPER });

export const BI_FINANCEIRO_RESULTADOS_GROUPS = [
  {
    title: "Margem por setor, comissões e repasses ao proprietário",
    subtitle: "Como o painel Financeiro mostra a margem de cada setor, as comissões provisionadas e pagas e os repasses que ainda faltam pagar aos proprietários. O valor é calculado no servidor; aqui você só ajusta as regras.",
    fields: [
      {
        key: "analytics.qualidade.max_sem_setor_pct",
        label: "Movimento sem setor aceito na margem (%)",
        type: "number",
        defaultValue: 1,
        helper: "De 0 a 100. Se a parte dos lançamentos do mês sem centro de resultado passar disto, a margem por setor aparece como \"Dado incompleto\", sem número. Padrão: 1.",
      },
      {
        key: "analytics.repasse.dias_alerta",
        label: "Repasse pendente: dias úteis até o alerta",
        type: "number",
        defaultValue: 5,
        helper: "De 1 a 90 dias úteis desde a geração do repasse. Passado esse prazo o repasse é destacado no Centro de Comando; o indicador continua com valor. Padrão: 5.",
      },
      {
        key: "analytics.repasse.faixas_atraso_dias",
        label: "Faixas de atraso dos repasses (dias úteis)",
        type: "text",
        defaultValue: "5,15",
        helper: "Dois limites crescentes separados por vírgula. Com 5,15 as faixas são 0-5, 6-15 e 16 ou mais dias úteis. Padrão: 5,15.",
      },
      owner("analytics.owner.fin.sector_margin", "Margem por setor"),
      owner("analytics.owner.fin.commissions_provisioned", "Comissões provisionadas"),
      owner("analytics.owner.fin.commissions_paid", "Comissões pagas"),
      owner("analytics.owner.fin.owner_repasses_pending", "Repasses pendentes ao proprietário"),
    ],
  },
];
