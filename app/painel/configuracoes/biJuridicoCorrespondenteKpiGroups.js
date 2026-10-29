// Parâmetros dos indicadores do Jurídico no BI (Marco 9, M9-D660). A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER_LEGAL = "Jurídico (papel jurídico-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label, defaultValue) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue, helper: HELPER });

export const BI_JURIDICO_CORRESPONDENTE_KPI_GROUPS = [
  {
    title: "Jurídico: qualidade e responsáveis dos indicadores",
    subtitle: "Prazos, processos por risco, valores estimados e confirmados e documentos faltantes. O número é calculado no servidor; aqui você só ajusta quando o dado deixa de ser confiável e quem responde por cada indicador.",
    fields: [
      {
        key: "analytics.qualidade.max_sem_risco_pct",
        label: "Processos sem nível de risco aceitos (%)",
        type: "number",
        defaultValue: 10,
        helper: "De 0 a 100. Se a parte dos processos ativos sem nível de risco passar disto, Processos por risco aparece como \"Dado incompleto\", sem número. Padrão: 10.",
      },
      {
        key: "analytics.qualidade.max_exigencia_sem_prazo_pct",
        label: "Exigências sem prazo aceitas (%)",
        type: "number",
        defaultValue: 0,
        helper: "De 0 a 100. O prazo da exigência é o início de vigência do contrato. Se a parte das exigências pendentes sem prazo passar disto, Documentos faltantes aparece como \"Dado incompleto\". Padrão: 0 (qualquer uma rebaixa).",
      },
      owner("analytics.owner.legal.deadlines", "Prazos próximos e vencidos", OWNER_LEGAL),
      owner("analytics.owner.legal.cases_by_risk", "Processos por risco", OWNER_LEGAL),
      owner("analytics.owner.legal.values", "Valores estimados e confirmados", OWNER_LEGAL),
      owner("analytics.owner.legal.missing_documents", "Documentos faltantes", OWNER_LEGAL),
    ],
  },
];
