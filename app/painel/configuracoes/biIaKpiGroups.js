// Parâmetros dos indicadores de IA no BI (Marco 9, M9-D681): Custo de IA por agente, Grounding e evaluation score, Budget de IA e Tool calls bloqueadas. A API valida (SETTINGS_SCHEMA);
// o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER = "Tecnologia (papel ti-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });

export const BI_IA_KPI_GROUPS = [
  {
    title: "IA: orçamento, qualidade e bloqueios dos indicadores",
    subtitle: "Quando a NAY entra em alerta de gasto, quantas semanas de qualidade aparecem, quais motivos de bloqueio têm linha própria e quem responde por cada indicador de IA. O número é calculado no servidor; aqui você ajusta os limites.",
    fields: [
      {
        key: "analytics.ia.alerta_budget_pct",
        label: "Consumo do orçamento que acende o alerta (%)",
        type: "number",
        defaultValue: 80,
        helper: "De 1 a 1000. O agente que gastou mais que este percentual do orçamento mensal aparece sinalizado em Budget de IA. Padrão: 80.",
      },
      {
        key: "analytics.ia.qualidade_semanas",
        label: "Semanas de histórico da qualidade da IA",
        type: "number",
        defaultValue: 4,
        helper: "De 1 a 26. Quantas semanas (a da data-base e as anteriores) Grounding e evaluation score mostra. Semana com menos execuções que o mínimo de registros (parâmetro analytics.qualidade.min_amostra, no grupo do funil comercial) fica de fora. Padrão: 4.",
      },
      {
        key: "analytics.ia.motivos_bloqueio_conhecidos",
        label: "Motivos de bloqueio de ferramenta com linha própria",
        type: "text",
        defaultValue: "ALLOWLIST,PERMISSION,SCHEMA,INJECTION,CROSS_COMPANY,SECRET,BUDGET,POLICY,STALE",
        helper: "Códigos em maiúsculas separados por vírgula. Os demais motivos somam em \"outros\". Padrão: allowlist, permissão, schema, injeção, outra empresa, segredo, orçamento, política e proposta desatualizada.",
      },
      owner("analytics.owner.ai.cost_by_agent", "Custo de IA por agente"),
      owner("analytics.owner.ai.quality_scores", "Grounding e evaluation score"),
      owner("analytics.owner.ai.budget", "Budget de IA"),
      owner("analytics.owner.ai.tool_calls_blocked", "Tool calls bloqueadas"),
    ],
  },
];
