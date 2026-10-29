// Parâmetros dos KPIs do funil comercial no BI (Marco 9, M9-D630): leads por origem e tempo até a primeira resposta (a M9-D631 acrescenta os outros
// quatro). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
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
    subtitle: "Quem responde pela conferência de cada indicador do funil.",
    fields: [
      owner("leads_by_origin", "Leads por origem"),
      owner("first_response_time", "Tempo até a primeira resposta"),
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
        key: "analytics.qualidade.min_amostra",
        label: "Mínimo de leads respondidos para mostrar o tempo de resposta",
        type: "number",
        defaultValue: 5,
        helper: "De 1 a 1.000. Com menos leads respondidos o indicador fica sem valor. Padrão: 5.",
      },
    ],
  },
];
