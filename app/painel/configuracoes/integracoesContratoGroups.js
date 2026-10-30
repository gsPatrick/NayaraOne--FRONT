// Contract tests dos fornecedores (Marco 9, M9-D222). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Entra na aba "Registro de integrações".
export const CONTRATO_GROUPS = [
  {
    title: "Testes de contrato dos fornecedores",
    subtitle:
      "Antes de liberar uma integração para produção, o sistema roda uma bateria padrão contra o fornecedor (autenticação, envio, falhas, repetição, resposta ilegível, status e saúde) e guarda o relatório. Só relatório verde, recente e do mesmo código do fornecedor libera a integração.",
    fields: [
      { key: "integration.contract.report_validity_days", label: "Validade do relatório de testes de contrato (dias)", type: "integer", defaultValue: 30, helper: "De 1 a 365. Passado esse prazo, a bateria precisa rodar de novo antes de liberar a integração para produção." },
    ],
  },
  {
    title: "Ações do usuário que dependem do fornecedor",
    subtitle:
      "Quando uma ação depende de um fornecedor (por exemplo pedir uma assinatura), a pessoa não fica esperando o fornecedor responder: passado este prazo o pedido é aceito e o andamento aparece depois, por status. O contrato, o imóvel e as demais informações do sistema só mudam quando o fornecedor confirma.",
    fields: [
      { key: "integration.sync_call_timeout_ms", label: "Quanto tempo a pessoa espera o fornecedor antes de o pedido ser aceito (milissegundos)", type: "integer", defaultValue: 5000, helper: "De 100 a 120000. Vale para as ações que aguardam o fornecedor na própria tela; consultas pedidas de propósito não são limitadas por este valor." },
    ],
  },
];
