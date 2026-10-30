// Liberação para produção e teste de carga das integrações (Marco 9, bloco B: M9-D255 e M9-D256). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
export const LIBERACAO_GROUPS = [
  {
    title: "Liberação de uma integração para produção",
    subtitle:
      "Uma integração só vai para produção depois de provada em laboratório (relatório de testes de contrato, ensaio de falha e verificação de saúde), com o segredo no cofre e a aprovação de uma pessoa autorizada com verificação MFA recente. Ninguém é liberado automaticamente.",
    fields: [
      { key: "integration.release.require_rotation_schedule", label: "Exigir rotação programada do segredo de produção para liberar", type: "boolean", defaultValue: true, helper: "Ligado: a integração precisa ter prazo de renovação do segredo (validade informada ou idade máxima da família bancária) para ser liberada." },
      { key: "integration.release.drill_scenarios", label: "Cenários do ensaio de falha exigidos para liberar", type: "text", defaultValue: "provider-down,rate-limit,auth-failed,timeout", helper: "Separados por vírgula, entre: provider-down, rate-limit, auth-failed, timeout, paused. Cada cenário precisa estar aprovado e ser do código atual do fornecedor." },
      { key: "integration.release.no_external_account_providers", label: "Fornecedores de fluxo manual, sem conta externa", type: "text", defaultValue: "insurance-manual,financing-manual", helper: "Códigos separados por vírgula. Esses fornecedores não precisam de segredo, segredo de webhook nem lista de destinos de rede para serem liberados." },
    ],
  },
  {
    title: "Teste de carga das integrações",
    subtitle:
      "Tamanho da carga que o teste aplica contra os ambientes de laboratório: serve para provar que nenhum evento se perde e nenhum envio se duplica, não é meta de desempenho. O teste só roda em banco descartável.",
    fields: [
      { key: "integration.load.webhooks_per_s", label: "Webhooks por segundo", type: "integer", defaultValue: 50, helper: "De 1 a 1000." },
      { key: "integration.load.dispatches_per_s", label: "Envios ao fornecedor por segundo", type: "integer", defaultValue: 20, helper: "De 1 a 1000." },
      { key: "integration.load.duration_min", label: "Duração da carga (minutos)", type: "integer", defaultValue: 5, helper: "De 1 a 60." },
      { key: "integration.load.duplicate_percent", label: "Parte repetida de propósito (%)", type: "integer", defaultValue: 10, helper: "De 0 a 90. Reentrega de webhook e repetição do mesmo pedido de envio." },
      { key: "integration.load.concurrency", label: "Requisições simultâneas do gerador de carga", type: "integer", defaultValue: 20, helper: "De 1 a 200." },
    ],
  },
];
