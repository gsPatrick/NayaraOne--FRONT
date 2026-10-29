// Parâmetros da fila de decisão do Centro de Comando e da API de métricas do BI (Marco 9, M9-D709 e M9-D702). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label, defaultValue) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue, helper: HELPER });

export const BI_DECISAO_FILA_GROUPS = [
  {
    title: "O que exige decisão: aprovações, ajustes, regras e propostas da NAY",
    subtitle: "A fila única do Centro de Comando. O número é calculado no servidor; aqui você ajusta quando um item parado passa a aparecer como envelhecido e quem responde por cada indicador. A decisão em si continua no módulo de origem.",
    fields: [
      {
        key: "analytics.centro.decisao_atraso_horas",
        label: "Horas parado para o item aparecer como envelhecido",
        type: "number",
        defaultValue: 48,
        helper: "De 1 a 8.760. O item que espera decisão há mais horas do que isto aparece marcado como envelhecido e entra na contagem de envelhecidos de cada indicador. Padrão: 48.",
      },
      owner("analytics.owner.fin.approvals_pending", "Aprovações financeiras pendentes", "Diretoria Financeira (papel financeiro-gestor)"),
      owner("analytics.owner.inv.adjustments_pending", "Propostas de ajuste de estoque pendentes", "Gestor de Estoque (papel estoque-gestor)"),
      owner("analytics.owner.tec.rule_approvals_pending", "Aprovações de regra pendentes", "Tecnologia (papel tecnologia-gestor)"),
      owner("analytics.owner.ai.proposals_pending", "Propostas da NAY aguardando aprovação", "Tecnologia/IA (papel ia-gestor)"),
    ],
  },
  {
    title: "Consulta de indicadores por dimensão",
    subtitle: "Quantas linhas a resposta de um indicador traz quando a tela pede a decomposição por uma dimensão (por exemplo, por conta ou por corretor).",
    fields: [
      {
        key: "analytics.metrica.dimensao_max_itens",
        label: "Linhas da decomposição por dimensão",
        type: "number",
        defaultValue: 50,
        helper: "De 1 a 500. Passando disso, a resposta avisa que foi cortada. Padrão: 50.",
      },
    ],
  },
];
