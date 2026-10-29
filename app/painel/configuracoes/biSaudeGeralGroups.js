// Parâmetros da Saúde Geral (Marco 9, M9-D686): as áreas, os KPIs principais de cada uma e o limite de cada semáforo. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Os limites são apresentação, não fórmula de indicador: depois de mudar um, é preciso aplicar
// os limites (POST /analytics/dashboards/health/thresholds), o que publica uma nova versão do painel e guarda a anterior.
const rule = (key, label, defaultValue) => ({
  key,
  label,
  type: "text",
  defaultValue,
  helper: "Formato: AMARELO < 60%; VERMELHO < 40% (operadores <, <=, >, >=, =). A cor mais grave que o valor alcançar vale. Só passa a valer ao aplicar os limites (nova versão do painel).",
});

export const BI_SAUDE_GERAL_GROUPS = [
  {
    title: "Saúde Geral: áreas e semáforos",
    subtitle: "A Saúde Geral mostra uma linha por área com um semáforo. A cor de cada área é a pior entre os alertas abertos, a qualidade do dado e o limite de cada KPI. Mudar um limite cria uma nova versão do painel (a anterior fica guardada).",
    fields: [
      {
        key: "analytics.saude.kpis_por_area",
        label: "Áreas e KPIs principais de cada uma",
        type: "text",
        defaultValue: "FINANCE: fin.free_cash, fin.breathing_need, fin.overdue_receivables; COMMERCIAL: crm.opportunities_by_stage, crm.portfolio_without_next_action, crm.proposals; RENTAL: rent.vacancy, rent.delinquency, rent.guarantees_expiring; CONSTRUCTION: obra.progress_vs_schedule, obra.projected_margin, obra.delays; LEGAL: legal.deadlines, legal.cases_by_risk, legal.missing_documents; MARKETING: mkt.deliverability, mkt.opt_out, mkt.campaigns; SUPPORT: sup.sla_resolution, sup.satisfaction, sup.complaints_by_reason; TECH: tec.availability, tec.integration_errors, tec.queues_dlq; CORRESPONDENT: cor.approval_rate_by_provider, cor.cases_by_stage, cor.commission",
        helper: "Formato: ÁREA: indicador, indicador; ÁREA: indicador. Áreas: FINANCE, COMMERCIAL, RENTAL, CONSTRUCTION, LEGAL, MARKETING, SUPPORT, TECH e CORRESPONDENT. Cada indicador precisa ser da própria área (até 6 por área). Tire uma área da lista para ela sair da tela.",
      },
      rule("analytics.semaforo.fin_breathing_need", "Financeiro: necessidade para respirar", "AMARELO se > 0"),
      rule("analytics.semaforo.crm_without_next_action", "Comercial: carteira sem próxima ação (%)", "AMARELO > 15%; VERMELHO > 30%"),
      rule("analytics.semaforo.rent_vacancy", "Locação: vacância (%)", "AMARELO > 10%; VERMELHO > 20%"),
      rule("analytics.semaforo.obra_progress_deviation", "Obras: desvio de avanço (pontos percentuais)", "AMARELO < -5 p.p.; VERMELHO < -10 p.p."),
      rule("analytics.semaforo.legal_deadlines_vencidos", "Jurídico: prazos vencidos (quantidade)", "VERMELHO se > 0"),
      rule("analytics.semaforo.mkt_deliverability", "Marketing: entregabilidade (%)", "AMARELO < 95%; VERMELHO < 90%"),
      rule("analytics.semaforo.sup_sla_resolution", "Atendimento: SLA de resolução (%)", "AMARELO < 90%; VERMELHO < 80%"),
      rule("analytics.semaforo.tec_availability", "Tecnologia: disponibilidade (%)", "AMARELO < 99,9%; VERMELHO < 99%"),
      rule("analytics.semaforo.cor_approval_rate", "Correspondente: taxa de aprovação (%)", "AMARELO < 60%; VERMELHO < 40%"),
    ],
  },
];
