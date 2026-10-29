// Parâmetros dos KPIs de Radar matches, captação por corretor e conversão por corretor no BI (Marco 9, M9-D633). Padrões do livro e de
// Maturacao/demandas/parametros.csv; a API valida e audita. O valor de cada indicador é calculado no servidor: aqui o administrador define quem
// confere cada número e o limite de qualidade da captação. A amostra mínima por corretor está em "Funil comercial".
const OWNER_DEFAULT = "Gerência Comercial (papel comercial-gestor)";
const owner = (code, label) => ({
  key: `analytics.owner.${code}`,
  label: `Responsável por "${label}"`,
  type: "text",
  defaultValue: OWNER_DEFAULT,
  helper: "Papel que confere o número deste indicador com o CRM e o cadastro de imóveis. Vale a partir do próximo indicador publicado; mudar o responsável de um indicador já publicado exige nova versão.",
});

export const BI_CORRETORES_KPI_GROUPS = [
  {
    title: "Radar e corretores: responsáveis pelos indicadores",
    subtitle: "Quem responde pela conferência de cada indicador do Radar e do desempenho dos corretores.",
    fields: [
      owner("radar.matches", "Radar matches"),
      owner("crm.broker_capture", "Captação por corretor"),
      owner("crm.broker_conversion", "Conversão por corretor"),
    ],
  },
  {
    title: "Captação por corretor: quando o número deixa de ser confiável",
    subtitle: "Limite de qualidade. Passando dele, o indicador mostra \"Dado incompleto\" em vez de um número enganoso.",
    fields: [
      {
        key: "analytics.qualidade.max_sem_corretor_pct",
        label: "Imóveis sem captador tolerados em Captação por corretor (%)",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 100. Acima disso o indicador fica sem valor. Padrão: 5.",
      },
    ],
  },
];
