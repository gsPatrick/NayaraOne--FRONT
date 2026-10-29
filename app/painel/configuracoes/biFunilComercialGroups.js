// Parâmetros dos KPIs do funil comercial no BI (Marco 9, M9-D630 e M9-D631): leads por origem, tempo até a primeira resposta, oportunidades por
// estágio, conversão, motivos de perda e carteira sem próxima ação. Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
const OWNER_DEFAULT = "Gerência Comercial (papel comercial-gestor)";
const owner = (code, label) => ({
  key: `analytics.owner.crm.${code}`,
  label: `Responsável por "${label}"`,
  type: "text",
  defaultValue: OWNER_DEFAULT,
  helper: "Papel que confere o número deste indicador com o CRM. Vale a partir do próximo indicador publicado; mudar o responsável de um indicador já publicado exige nova versão.",
});

export const BI_FUNIL_COMERCIAL_GROUPS = [
  {
    title: "Funil comercial: responsáveis pelos indicadores",
    subtitle: "Quem responde pela conferência de cada indicador do funil (leads, resposta, estágios, conversão, perdas e carteira).",
    fields: [
      owner("leads_by_origin", "Leads por origem"),
      owner("first_response_time", "Tempo até a primeira resposta"),
      owner("opportunities_by_stage", "Oportunidades por estágio"),
      owner("conversion_rate", "Conversão"),
      owner("loss_reasons", "Motivos de perda"),
      owner("portfolio_without_next_action", "Carteira sem próxima ação"),
    ],
  },
  {
    title: "Funil comercial: quando o número deixa de ser confiável",
    subtitle: "Limites de qualidade. Passando deles, o indicador mostra \"Dado incompleto\" em vez de um número enganoso.",
    fields: [
      {
        key: "analytics.qualidade.max_origem_vazia_pct",
        label: "Leads sem origem tolerados em Leads por origem (%)",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 100. Acima disso o indicador fica sem valor. Padrão: 5.",
      },
      {
        key: "analytics.qualidade.max_sem_motivo_pct",
        label: "Perdas sem motivo toleradas em Motivos de perda (%)",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 100. Acima disso o indicador fica sem valor. Padrão: 5.",
      },
      {
        key: "analytics.qualidade.min_amostra",
        label: "Mínimo de registros para mostrar tempo de resposta e conversão",
        type: "number",
        defaultValue: 5,
        helper: "De 1 a 1.000. Com menos leads respondidos (tempo de resposta) ou menos oportunidades ganhas e perdidas (conversão), o indicador fica sem valor. Padrão: 5.",
      },
      {
        key: "analytics.qualidade.max_oportunidade_sem_corretor_pct",
        label: "Oportunidades em aberto sem corretor toleradas em Carteira sem próxima ação (%)",
        type: "number",
        defaultValue: 0,
        helper: "De 0 a 100. Padrão: 0, ou seja, qualquer oportunidade em aberto sem corretor deixa o indicador sem valor.",
      },
    ],
  },
  {
    title: "Funil comercial: estágios e próxima ação",
    subtitle: "Como o funil é ordenado e o que vale como próxima ação.",
    fields: [
      {
        key: "analytics.comercial.ordem_estagios",
        label: "Ordem dos estágios do funil",
        type: "text",
        defaultValue: "NEW,QUALIFIED,MATCHING,VISIT_SCHEDULED,VISITED,PROPOSAL,FINANCING,CONTRACT,NURTURE,CLOSED_WON,CLOSED_LOST,WITHDRAWN",
        helper: "Códigos dos estágios separados por vírgula, na ordem em que aparecem em Oportunidades por estágio. Estágio fora da lista aparece depois, em ordem alfabética.",
      },
      {
        key: "analytics.comercial.proxima_acao_inclui_hoje",
        label: "Tarefa com data de hoje conta como próxima ação",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: vale a tarefa aberta com data posterior a hoje (a partir de amanhã) ou a próxima ação preenchida com texto e data.",
      },
    ],
  },
];
