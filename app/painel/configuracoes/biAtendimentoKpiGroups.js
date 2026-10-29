// Parâmetros dos indicadores de Atendimento no BI (Marco 9, M9-D672): Reviews, Satisfação (CSAT), Reclamações por motivo e SLA de resolução. A API valida
// (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER = "Atendimento (papel atendimento-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });
const hours = (key, label, defaultValue) => ({
  key,
  label: `SLA de resolução da prioridade ${label} (horas)`,
  type: "number",
  defaultValue,
  helper: `De 1 a 8760 horas corridas, contadas da abertura do caso até a resolução. Casos resolvidos dentro deste prazo contam como dentro do SLA. Padrão: ${defaultValue}.`,
});
const severities = (key, label, defaultValue) => ({
  key,
  label: `Severidades que valem como prioridade ${label}`,
  type: "text",
  defaultValue,
  helper: `Códigos em maiúsculas separados por vírgula (a severidade do caso ou do chamado). Severidade que não está em nenhuma prioridade é medida como Média e deixa o indicador "Dado incompleto". Padrão: ${defaultValue}.`,
});

export const BI_ATENDIMENTO_KPI_GROUPS = [
  {
    title: "Atendimento: SLA, qualidade e responsáveis dos indicadores",
    subtitle: "Reviews, satisfação, reclamações por motivo e SLA de resolução. O número é calculado no servidor; aqui você ajusta o prazo de resolução de cada prioridade, o limite de reclamações sem motivo e quem responde por cada indicador. A amostra mínima de reviews e de respostas para mostrar a nota é o mesmo parâmetro \"Mínimo de registros...\" do grupo do funil comercial (padrão 5).",
    fields: [
      hours("analytics.sla.horas.ALTA", "Alta", 24),
      hours("analytics.sla.horas.MEDIA", "Média", 72),
      hours("analytics.sla.horas.BAIXA", "Baixa", 120),
      severities("analytics.sla.severidades.ALTA", "Alta", "HIGH"),
      severities("analytics.sla.severidades.MEDIA", "Média", "MEDIUM"),
      severities("analytics.sla.severidades.BAIXA", "Baixa", "LOW"),
      {
        key: "analytics.qualidade.max_sem_motivo_pct",
        label: "Reclamações sem motivo aceitas (%)",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 100. Se a parte das reclamações do mês sem motivo passar disto, Reclamações por motivo aparece como \"Dado incompleto\", sem número. Padrão: 5.",
      },
      owner("analytics.owner.sup.reviews", "Reviews"),
      owner("analytics.owner.sup.satisfaction", "Satisfação (CSAT)"),
      owner("analytics.owner.sup.complaints_by_reason", "Reclamações por motivo"),
      owner("analytics.owner.sup.sla_resolution", "SLA de resolução"),
    ],
  },
];
