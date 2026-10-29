// Parâmetros dos indicadores do Jurídico e do Correspondente Bancário no BI (Marco 9, M9-D660 e M9-D661). A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER_LEGAL = "Jurídico (papel jurídico-gestor)";
const OWNER_COR = "Correspondente Bancário (papel correspondente-gestor)";
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
  {
    title: "Correspondente: qualidade, estágios e responsáveis dos indicadores",
    subtitle: "Casos por estágio, aprovação por banco, tempo de análise e comissão. O número é calculado no servidor; aqui você ajusta os estágios do fluxo e quem responde por cada indicador. A amostra mínima de decisões por banco para mostrar a taxa de aprovação é o mesmo parâmetro \"Mínimo de registros...\" do grupo do funil comercial (padrão 5).",
    fields: [
      {
        key: "analytics.correspondente.estagios_validos",
        label: "Estágios válidos de um caso de financiamento",
        type: "text",
        defaultValue: "DRAFT,DOCUMENTS_PENDING,READY_TO_SUBMIT,SUBMITTED,UNDER_ANALYSIS,PENDING_CUSTOMER,PENDING_PROPERTY,APPROVED,REJECTED,CONTRACTING,COMPLETED,CANCELED",
        helper: "Códigos em maiúsculas separados por vírgula, na ordem do fluxo. Caso fora da lista continua no total e aparece como inválido. Padrão: os estágios do fluxo do Correspondente.",
      },
      {
        key: "analytics.correspondente.estagios_em_analise",
        label: "Estágios de um caso enviado e ainda sem decisão",
        type: "text",
        defaultValue: "SUBMITTED,UNDER_ANALYSIS,PENDING_CUSTOMER,PENDING_PROPERTY",
        helper: "Códigos em maiúsculas separados por vírgula. Esses casos aparecem como pendentes no Tempo de análise. Padrão: SUBMITTED,UNDER_ANALYSIS,PENDING_CUSTOMER,PENDING_PROPERTY.",
      },
      owner("analytics.owner.cor.cases_by_stage", "Financing cases por estágio", OWNER_COR),
      owner("analytics.owner.cor.approval_rate_by_provider", "Aprovação e rejeição por provider", OWNER_COR),
      owner("analytics.owner.cor.analysis_time", "Tempo de análise", OWNER_COR),
      owner("analytics.owner.cor.commission", "Comissão esperada, confirmada e recebida", OWNER_COR),
    ],
  },
];
