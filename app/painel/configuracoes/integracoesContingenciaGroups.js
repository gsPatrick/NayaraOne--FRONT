// Contingência das integrações (Marco 9, bloco B: M9-D226). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações". Cada integração pode ter o modo, o prazo, o alternativo e os papéis na política dela (contingency).
export const CONTINGENCIA_GROUPS = [
  {
    title: "Contingência: prazo da fila por modo",
    subtitle:
      "Quando um fornecedor cai, os pedidos ficam na fila e o plano B da família entra em ação. Passado o prazo, o pedido que continua na fila vira tarefa manual para uma pessoa. O banco tem um prazo só: nenhum pagamento é dado como pago sem confirmação, e o que passa do prazo vai para o financeiro consultar o banco.",
    fields: [
      { key: "integration.contingency.queue_max_age_h.QUEUE_AND_ALTERNATE", label: "WhatsApp e atendimento: horas na fila até virar tarefa", type: "integer", defaultValue: 24, helper: "De 1 a 720. Modo fila e canal alternativo." },
      { key: "integration.contingency.queue_max_age_h.KEEP_INTERNAL_AND_REPROCESS", label: "Portais: horas na fila até virar tarefa", type: "integer", defaultValue: 24, helper: "De 1 a 720. Modo manter o dado interno e reprocessar." },
      { key: "integration.contingency.queue_max_age_h.PRESERVE_AND_ALTERNATE_FLOW", label: "Assinatura e identidade: horas na fila até virar tarefa", type: "integer", defaultValue: 24, helper: "De 1 a 720. Modo preservar o estado e seguir o fluxo alternativo." },
      { key: "integration.contingency.queue_max_age_h.QUEUE_QUERY_OR_ALTERNATE_PROVIDER", label: "Financiamento: horas na fila até virar tarefa", type: "integer", defaultValue: 24, helper: "De 1 a 720. Modo fila, consulta ou provider alternativo." },
      { key: "integration.bank.max_pending_hours", label: "Banco: horas que um pagamento pode ficar pendente até virar tarefa", type: "integer", defaultValue: 72, helper: "De 1 a 720. É a única régua do banco." },
    ],
  },
  {
    title: "Contingência: quem é avisado e quem recebe a tarefa",
    subtitle: "Os avisos de contingência ativada e encerrada, e o papel que recebe a tarefa manual do que venceu na fila.",
    fields: [
      { key: "integration.contingency.notify_roles", label: "Papéis avisados quando a contingência é ativada ou encerrada", type: "text", defaultValue: "ADMIN", helper: "Nomes de papel separados por vírgula." },
      { key: "integration.contingency.manual_task_assignee_role", label: "Papel que recebe a tarefa manual", type: "text", defaultValue: "ADMIN", helper: "A tarefa vai para a primeira pessoa ativa deste papel." },
      { key: "integration.contingency.manual_task_due_h", label: "Prazo da tarefa manual (horas)", type: "integer", defaultValue: 4, helper: "De 1 a 720, contado a partir da criação da tarefa." },
      { key: "integration.contingency.manual_task_batch_size", label: "Tarefas manuais geradas por rodada", type: "integer", defaultValue: 100, helper: "De 1 a 1000." },
    ],
  },
  {
    title: "Contingência: encerramento e fila",
    subtitle: "A contingência só termina quando o disjuntor fecha e a integração passa em vários testes de saúde seguidos. Ao encerrar, a fila é solta em ordem de criação, respeitando a cota do fornecedor.",
    fields: [
      { key: "integration.contingency.recovery_checks", label: "Testes de saúde seguidos OK para encerrar", type: "integer", defaultValue: 3, helper: "De 1 a 20. Um teste que falha zera a contagem." },
      { key: "integration.contingency.drain_batch_size", label: "Pedidos que a fila solta de uma vez (e trocas automáticas por rodada)", type: "integer", defaultValue: 50, helper: "De 1 a 1000. Se o fornecedor informar a cota, solta no máximo o que sobra acima da reserva." },
    ],
  },
];
