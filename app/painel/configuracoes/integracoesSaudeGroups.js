// Saúde e resiliência dos fornecedores (Marco 9, bloco B: M9-D217, M9-D223 e M9-D224). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações". Cada integração pode ter valores próprios na política dela (circuit) e esses valem no lugar dos daqui.
export const SAUDE_GROUPS = [
  {
    title: "Disjuntor (circuit breaker) dos fornecedores",
    subtitle:
      "Quando um fornecedor falha várias vezes seguidas, o sistema para de chamá-lo por um tempo (disjuntor aberto), usa o plano B da família e depois testa com poucas chamadas se ele voltou. Envios essenciais (como a consulta de um pagamento) continuam saindo; mensagens em massa e sincronizações esperam. Só erro do fornecedor conta (instabilidade, erro de servidor, resposta incerta): dado inválido nosso, limite de uso e credencial recusada não abrem o disjuntor.",
    fields: [
      { key: "integration.circuit.failure_threshold", label: "Falhas seguidas até abrir o disjuntor", type: "integer", defaultValue: 5, helper: "De 1 a 100. Um sucesso zera a contagem." },
      { key: "integration.circuit.cooldown_s", label: "Tempo com o disjuntor aberto antes de testar o fornecedor (segundos)", type: "integer", defaultValue: 120, helper: "De 1 a 86400. Se o teste falhar, o disjuntor reabre por este mesmo tempo." },
      { key: "integration.circuit.half_open_max_calls", label: "Chamadas de teste ao mesmo tempo depois do tempo de espera", type: "integer", defaultValue: 3, helper: "De 1 a 100. Evita que uma fila acumulada derrube de novo o fornecedor que acabou de voltar." },
      { key: "integration.circuit.close_after_successes", label: "Sucessos nas chamadas de teste para fechar o disjuntor", type: "integer", defaultValue: 1, helper: "De 1 a 100." },
      { key: "integration.circuit.half_open_recheck_s", label: "Espera de quem não coube nas chamadas de teste (segundos)", type: "integer", defaultValue: 5, helper: "De 1 a 3600. O envio volta a ser conferido depois desse tempo, sem gastar tentativa." },
    ],
  },
];
