// M9-D612/D626/D634 (reabertura F08) — rótulos em português dos painéis de BI: nome de cada indicador e de cada read model (fonte de dado).
// A tela nunca mostra o código técnico ("fin.free_cash", "rm_ai_cost", "Rm ai cost") como texto: o código só aparece na dica (title). Só descreve; nada é calculado aqui.

/** Nome em português de cada indicador do catálogo do BI (usado quando a API manda só o código ou um termo em inglês). */
export const METRIC_LABELS = Object.freeze({
  "ai.budget": "Orçamento de IA", "ai.cost_by_agent": "Custo de IA por agente", "ai.quality_scores": "Fundamentação e nota de avaliação das respostas de IA",
  "ai.tool_calls_blocked": "Chamadas de ferramenta bloqueadas", "cor.analysis_time": "Tempo de análise", "cor.approval_rate_by_provider": "Aprovação e rejeição por banco",
  "cor.cases_by_stage": "Casos de financiamento por estágio", "cor.commission": "Comissão esperada, confirmada e recebida", "crm.broker_capture": "Captação por corretor",
  "crm.broker_conversion": "Conversão por corretor", "crm.conversion_rate": "Conversão", "crm.first_response_time": "Tempo até a primeira resposta",
  "crm.leads_by_origin": "Leads por origem", "crm.loss_reasons": "Motivos de perda", "crm.opportunities_by_stage": "Oportunidades por estágio",
  "crm.opportunities_won": "Oportunidades ganhas na janela", "crm.portfolio_without_next_action": "Carteira sem próxima ação", "crm.proposals": "Propostas", "crm.visits": "Visitas",
  "fin.anomalies_open": "Anomalias abertas", "fin.breathing_need": "Necessidade para respirar", "fin.delinquency_rate": "Taxa de inadimplência", "fin.free_cash": "Caixa livre por empresa",
  "fin.overdue_receivables": "Valor inadimplente (a receber vencido)", "fin.payments_settled_relevant": "Pagamentos liquidados acima do valor relevante",
  "fin.reconciliations_pending": "Conciliações pendentes", "fin.third_party_cash": "Dinheiro de terceiros",
  "fin.payables_7d": "A pagar em 7 dias", "fin.payables_30d": "A pagar em 30 dias", "fin.payables_60d": "A pagar em 60 dias",
  "fin.receivables_7d": "A receber em 7 dias", "fin.receivables_30d": "A receber em 30 dias", "fin.receivables_60d": "A receber em 60 dias",
  "fin.sector_margin": "Margem por setor", "fin.commissions_provisioned": "Comissões provisionadas", "fin.commissions_paid": "Comissões pagas", "fin.owner_repasses_pending": "Repasses a proprietários pendentes",
  "legal.cases_by_risk": "Processos por risco", "legal.contracts_signed": "Contratos assinados na janela", "legal.deadlines": "Prazos próximos e vencidos",
  "legal.missing_documents": "Documentos faltantes", "legal.values": "Valores estimados e confirmados",
  "mkt.attribution": "Atribuição e custo por lead", "mkt.automations_blocked_failed": "Automações bloqueadas e com falha", "mkt.campaigns": "Campanhas ativas e encerradas",
  "mkt.cost": "Custo de marketing", "mkt.deliverability": "Entregabilidade", "mkt.frequency": "Frequência de contato", "mkt.leads": "Leads de marketing", "mkt.opt_out": "Descadastros",
  "prop.active_properties": "Imóveis ativos", "prop.price_changes": "Preço e mudanças de preço", "prop.without_sale_by_period": "Imóveis sem venda por período", "radar.matches": "Cruzamentos do Radar",
  "rent.active_contracts": "Contratos de locação ativos", "rent.delinquency": "Inadimplência da locação", "rent.guarantees_expiring": "Garantias vencendo", "rent.inspections_keys": "Vistorias e chaves",
  "rent.obligations_pending": "Obrigações pendentes", "rent.repasses": "Repasses de locação", "rent.satisfaction": "Satisfação da locação", "rent.tickets": "Chamados da locação", "rent.vacancy": "Vacância",
  "sup.complaints_by_reason": "Reclamações por motivo", "sup.reviews": "Avaliações públicas", "sup.satisfaction": "Satisfação (CSAT)", "sup.sla_resolution": "Prazo de resolução do atendimento",
  "tec.auth_failures": "Falhas de autenticação", "tec.availability": "Disponibilidade", "tec.blocked_events": "Eventos bloqueados", "tec.freshness": "Atualidade dos dados do BI",
  "tec.integration_errors": "Integrações com erro", "tec.queues_dlq": "Filas de processamento e fila de falhas",
});

/** Nome em português de cada read model (a fonte de dado que o painel lê). */
export const READ_MODEL_LABELS = Object.freeze({
  rm_ai_cost: "Custo de IA", rm_ai_quality: "Qualidade das respostas de IA", rm_ai_tool_calls: "Chamadas de ferramenta de IA", rm_applied_events: "Eventos aplicados", rm_broker_performance: "Desempenho dos corretores",
  rm_command_events: "Eventos do Centro de Comando", rm_crm_lead_daily: "Leads por dia", rm_crm_next_action: "Próxima ação da carteira", rm_crm_opportunity_stage: "Oportunidades por estágio", rm_crm_outcome: "Resultado das oportunidades",
  rm_crm_visits_proposals: "Visitas e propostas", rm_decision_queue: "Fila de decisões", rm_fin_cases_stage: "Casos de financiamento por estágio", rm_fin_commission: "Comissões do correspondente",
  rm_fin_provider_outcome: "Resultado por banco", rm_finance_cash: "Caixa", rm_finance_health: "Saúde financeira", rm_finance_intercompany: "Transferências entre empresas", rm_finance_sector_margin: "Margem por setor",
  rm_inventory_health: "Saúde do estoque", rm_legal_cases_risk: "Processos por risco", rm_legal_deadlines: "Prazos jurídicos", rm_legal_missing_docs: "Documentos jurídicos faltantes", rm_legal_values: "Valores jurídicos",
  rm_mkt_automation: "Automações de marketing", rm_mkt_campaign_month: "Campanhas por mês", rm_mkt_campaigns: "Campanhas", rm_mkt_delivery: "Entrega das mensagens", rm_mkt_frequency: "Frequência de contato",
  rm_mkt_optout_month: "Descadastros por mês", rm_mkt_reviews: "Avaliações públicas", rm_postwork_cost: "Custo do pós-obra", rm_project_cost: "Custo das obras", rm_project_delays: "Atrasos das obras",
  rm_project_measurements: "Medições das obras", rm_project_nonconformities: "Não conformidades das obras", rm_project_occurrences: "Ocorrências das obras", rm_project_progress: "Andamento das obras",
  rm_project_waste: "Perdas das obras", rm_property_portfolio: "Carteira de imóveis", rm_property_price_changes: "Mudanças de preço dos imóveis", rm_radar_matches: "Cruzamentos do Radar",
  rm_rental_arrears: "Atrasos da locação", rm_rental_contracts: "Contratos de locação", rm_rental_guarantees: "Garantias da locação", rm_rental_inspections_keys: "Vistorias e chaves da locação",
  rm_rental_obligations: "Obrigações da locação", rm_rental_repasses: "Repasses da locação", rm_rental_satisfaction: "Satisfação da locação", rm_rental_tickets: "Chamados da locação", rm_rental_vacancy: "Vacância da locação",
  rm_stale_aggregates: "Agregados desatualizados", rm_support_complaints: "Reclamações do atendimento", rm_support_satisfaction: "Satisfação do atendimento", rm_support_sla: "Prazo de resolução do atendimento",
  rm_tech_auth_failures: "Falhas de autenticação", rm_tech_availability: "Disponibilidade", rm_tech_blocked_events: "Eventos bloqueados", rm_tech_freshness: "Atualidade dos dados", rm_tech_integrations: "Integrações",
  rm_tech_queues: "Filas de processamento", rm_tool_assets: "Ferramentas e patrimônio",
});

// Termos em inglês que o servidor ainda manda em títulos e cabeçalhos; a tela troca pelo termo em português.
const ENGLISH_TERMS = [
  [/Financing cases/gi, "Casos de financiamento"], [/Freshness/gi, "Atualidade"], [/evaluation score/gi, "nota de avaliação"], [/Grounding/gi, "Fundamentação"],
  [/Tool calls/gi, "Chamadas de ferramenta"], [/Budget/gi, "Orçamento"], [/\bFilas e DLQ\b/g, "Filas e fila de falhas"], [/^DLQ$/, "Fila de falhas"], [/\bDLQ\b/g, "fila de falhas"], [/Radar matches/gi, "Cruzamentos do Radar"],
  [/\bReviews\b/g, "Avaliações públicas"], [/Opt-out/gi, "Descadastro"], [/\bproviders?\b/gi, "banco"],
];

const CODE_LIKE = /^[a-z]+\.[a-z0-9_]+$/;
const RM_LIKE = /^(rm_[a-z0-9_]+|Rm [a-z0-9 ]+)$/;

/** Troca os termos em inglês de um texto de tela pelos de português. */
export function ptText(text) {
  if (typeof text !== "string") return text;
  return ENGLISH_TERMS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

/** Nome do indicador na tela: o nome da API quando já é português; o do catálogo quando vier o código cru, vazio ou termo em inglês. */
export function metricTitle(metricCode, apiTitle) {
  const catalog = METRIC_LABELS[metricCode];
  if (!apiTitle || apiTitle === metricCode || CODE_LIKE.test(apiTitle)) return catalog || ptText(apiTitle) || "Indicador";
  return ptText(apiTitle);
}

/** Nome da fonte de dado (read model) a partir do id da linha ("rm_ai_cost" ou "Rm ai cost"); null quando o id não é de um read model. */
export function readModelLabel(id) {
  const raw = String(id ?? "");
  if (!RM_LIKE.test(raw)) return null;
  const key = raw.startsWith("rm_") ? raw : raw.toLowerCase().replace(/ /g, "_");
  return READ_MODEL_LABELS[key] || "Fonte de dado sem nome cadastrado";
}
