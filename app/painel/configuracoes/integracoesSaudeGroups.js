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
  {
    title: "Teste de saúde ativo dos fornecedores",
    subtitle:
      "O sistema pergunta ao fornecedor se ele está bem, sem esperar um cliente perceber: de tempos em tempos cada integração ativa recebe um teste leve, e o resultado aparece em Integrações > Saúde. Mesmo com o disjuntor aberto o teste continua, para detectar a volta do fornecedor; durante as chamadas de teste do disjuntor ele só roda se houver vaga. Quantos testes falhos seguidos marcam o fornecedor como fora do ar e o tempo máximo de cada teste ficam em Saúde dos fornecedores e em Tempos de resposta.",
    fields: [
      { key: "integration.health.check_interval_s", label: "Intervalo entre os testes de saúde de cada integração (segundos)", type: "integer", defaultValue: 60, helper: "De 5 a 3600. Cada integração ativa é testada uma vez por vez, nunca duas ao mesmo tempo." },
    ],
  },
  {
    title: "Alertas das integrações",
    subtitle:
      "Quando uma integração cai, o aumento de erros passa da meta, a credencial é recusada ou está perto de vencer, uma sincronização para ou a cota está baixa, o sistema abre um alerta, avisa os papéis abaixo com o roteiro de ação (runbook) do fornecedor e encerra o alerta sozinho quando o problema some, avisando a recuperação. A meta de sucesso de cada criticidade fica em Saúde dos fornecedores, os dias de aviso da credencial em Segurança das conexões e a reserva da cota em Limite e cota dos fornecedores.",
    fields: [
      { key: "integration.alert.repeat_min", label: "Minutos até repetir o aviso de um alerta que continua aberto", type: "integer", defaultValue: 60, helper: "De 1 a 10080. Evita avisar toda hora o mesmo problema." },
      { key: "integration.alert.notify_roles", label: "Papéis que recebem os avisos das integrações", type: "text", defaultValue: "ADMIN", helper: "Nomes dos papéis separados por vírgula (até 10), como aparecem em Papéis & Permissões. Se ninguém ativo tiver o papel, o alerta aparece só no painel." },
      { key: "integration.alert.circuit_open_min", label: "Minutos com o disjuntor aberto até virar alerta de fornecedor fora do ar", type: "integer", defaultValue: 5, helper: "De 1 a 1440. Três testes de saúde falhos seguidos também geram esse alerta, sem esperar." },
      { key: "integration.alert.evaluate_interval_s", label: "Intervalo entre as avaliações dos alertas (segundos)", type: "integer", defaultValue: 60, helper: "De 10 a 3600." },
    ],
  },
];
