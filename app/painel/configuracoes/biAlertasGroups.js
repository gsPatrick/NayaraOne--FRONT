// Parâmetros dos alertas do BI (Marco 9, M9-D691). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const SEMENTE = (key, label, defaultValue, helper) => ({ key: `analytics.alerta_semente.${key}`, label, type: "text", defaultValue, helper });

export const BI_ALERTAS_GROUPS = [
  {
    title: "Alertas do BI: avaliação e silêncio",
    subtitle: "Um problema gera um alerta só. Enquanto ele está aberto as novas avaliações apenas contam a recorrência, e depois de resolvido o alerta fica em silêncio pelo tempo abaixo antes de poder abrir de novo.",
    fields: [
      {
        key: "analytics.alert.cooldown_minutos",
        label: "Silêncio depois de resolvido, por gravidade (minutos)",
        type: "text",
        defaultValue: "INFO 240; WARNING 120; CRITICAL 60",
        helper: "Formato: INFO 240; WARNING 120; CRITICAL 60. O tempo conta a partir da resolução. Um alerta que tenha silêncio próprio na definição usa o dele.",
      },
      {
        key: "analytics.alert.avaliacoes_para_resolver",
        label: "Avaliações normais seguidas para resolver sozinho",
        type: "number",
        defaultValue: 2,
        helper: "De 1 a 100. Uma avaliação fora do normal zera a contagem. Um alerta com regra de resolução própria usa a dele.",
      },
      {
        key: "analytics.alert.intervalo_avaliacao_min",
        label: "De quantos em quantos minutos os alertas são reavaliados",
        type: "number",
        defaultValue: 5,
        helper: "De 1 a 1.440. Os alertas também são reavaliados logo depois de cada atualização dos indicadores.",
      },
      {
        key: "analytics.alert.owner_reserva",
        label: "Responsável reserva dos alertas",
        type: "text",
        defaultValue: "Diretoria",
        helper: "Papel que recebe o alerta quando o indicador não tem responsável cadastrado.",
      },
    ],
  },
  {
    title: "Alertas prontos do BI (limites)",
    subtitle: "Os alertas que já vêm ligados. Formato: código do indicador [recorte] operador valor, gravidade[ com tarefa]. Texto fora do formato é recusado ao salvar. A tarefa só vale para gravidade CRITICAL.",
    fields: [
      SEMENTE("fin_free_cash_baixo", "Caixa livre baixo", "fin.free_cash < R$ 50.000,00, WARNING", "Abre quando o caixa livre fica abaixo do valor."),
      SEMENTE("fin_necessidade_respirar", "Necessidade para respirar", "fin.breathing_need > 0, WARNING", "Abre quando existe necessidade de caixa para os próximos dias."),
      SEMENTE("prazo_juridico_vencido", "Prazo jurídico vencido", "legal.deadlines vencidos > 0, CRITICAL com tarefa", "Abre quando há prazo jurídico vencido e, com \"com tarefa\", cria a tarefa para o responsável."),
      SEMENTE("garantia_vencendo_30d", "Garantia vencendo em 30 dias", "rent.guarantees_expiring 30d > 0, WARNING", "Abre quando há garantia de locação vencendo na janela."),
      SEMENTE("integracao_erro", "Integrações com erro", "tec.integration_errors > 10%, CRITICAL", "Abre quando o percentual de integrações com erro passa do limite."),
      SEMENTE("orcamento_ia", "Orçamento de IA", "ai.budget > 80%, WARNING", "Abre quando o consumo do orçamento de IA passa do percentual."),
      {
        key: "analytics.alerta_semente.freshness_critica",
        label: "Indicador crítico desatualizado",
        type: "text",
        defaultValue: "métrica CRITICAL em STALE, WARNING",
        helper: "Abre quando um indicador crítico está com o dado mais antigo que o limite de atualização da área. Formato: métrica CRITICAL em STALE, gravidade.",
      },
    ],
  },
];
