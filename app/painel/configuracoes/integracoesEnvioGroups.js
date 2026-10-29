// Envio a fornecedores (Marco 9, bloco B: M9-D214, M9-D216 e M9-D218). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações".
export const ENVIO_GROUPS = [
  {
    title: "Envio a fornecedores: rodada do worker",
    subtitle:
      "Todo pedido a um fornecedor é gravado antes de sair e um worker faz a chamada. Aqui ficam o ritmo do worker e a espera quando a integração está parada.",
    fields: [
      { key: "integration.dispatch.worker_interval_s", label: "Intervalo entre as rodadas do worker (segundos)", type: "integer", defaultValue: 2, helper: "De 1 a 3600. Quanto menor, mais rápido o envio sai; o padrão do livro é 2." },
      { key: "integration.dispatch.worker_batch_size", label: "Envios por rodada", type: "integer", defaultValue: 20, helper: "De 1 a 500. Quantos envios vencidos o worker pega de cada vez." },
      { key: "integration.dispatch.blocked_recheck_s", label: "Espera quando a integração está pausada, desativada ou com credencial recusada (segundos)", type: "integer", defaultValue: 60, helper: "De 5 a 86400. O envio espera sem gastar tentativa e volta a ser conferido depois desse tempo." },
    ],
  },
  {
    title: "Nova tentativa de envio por tipo de erro",
    subtitle:
      "Erro transitório espera cada vez mais entre as tentativas (com uma variação para não bater todo mundo no mesmo instante). Erro de dado e de credencial nunca entram em repetição. Cada integração pode ter valores próprios na política dela.",
    fields: [
      { key: "integration.retry.base_delay_ms", label: "Espera antes da 1ª nova tentativa (milissegundos)", type: "integer", defaultValue: 5000, helper: "De 100 a 3600000. Cada nova espera multiplica a anterior pelo fator, até o teto." },
      { key: "integration.retry.factor", label: "Fator de crescimento da espera", type: "integer", defaultValue: 2, helper: "De 1 a 10. Com 2 as esperas são 5, 10, 20, 40 segundos e assim por diante." },
      { key: "integration.retry.cap_delay_ms", label: "Teto da espera entre tentativas (milissegundos)", type: "integer", defaultValue: 1800000, helper: "De 1000 a 86400000 (24 horas). Padrão do livro: 30 minutos." },
      { key: "integration.retry.jitter_pct", label: "Variação aleatória da espera (%)", type: "integer", defaultValue: 25, helper: "De 0 a 50. A espera varia para mais ou para menos até esse percentual." },
      { key: "integration.retry.rate_limit_max_wait_s", label: "Espera máxima atendida quando o fornecedor pede calma (segundos)", type: "integer", defaultValue: 3600, helper: "De 1 a 86400. Se o fornecedor pedir mais que isso, o envio espera este tempo e a integração ganha um alerta." },
      { key: "integration.retry.rate_limit_max_deferrals", label: "Adiamentos seguidos por limite do fornecedor antes de contar como falha", type: "integer", defaultValue: 100, helper: "De 1 a 10000. Evita que um fornecedor que sempre pede calma segure o envio para sempre." },
    ],
  },
  {
    title: "Limite e cota dos fornecedores",
    subtitle:
      "O sistema reduz o ritmo antes de chegar no limite do fornecedor. Perto do fim da cota, só o que é essencial (como a confirmação de um pagamento) e as operações perigosas saem; mensagens em massa esperam a renovação. O limite de chamadas por segundo, minuto e dia de cada integração fica na política dela.",
    fields: [
      { key: "integration.rate_limit.reserve_pct", label: "Reserva da cota para operações essenciais (%)", type: "integer", defaultValue: 20, helper: "De 0 a 100. Quando o que resta da cota do fornecedor fica abaixo deste percentual do limite, um alerta é aberto e só operações essenciais ou perigosas continuam saindo." },
      { key: "integration.rate_limit.fallback_wait_s", label: "Espera quando a cota acaba sem data de renovação (segundos)", type: "integer", defaultValue: 300, helper: "De 1 a 86400. Usado quando o fornecedor não informa quando a cota volta." },
    ],
  },
  {
    title: "Métricas e eventos de monitoramento",
    subtitle:
      "As métricas e os eventos do sistema (contadores, erros de aplicação com a pilha já sem dado pessoal) saem para o serviço de analytics em segundo plano. Se o serviço estiver fora do ar, o trabalho do ERP não é afetado: o que não sair a tempo é descartado.",
    fields: [
      { key: "integration.analytics.drop_after_s", label: "Segundos até descartar uma métrica ou evento que não saiu", type: "integer", defaultValue: 300, helper: "De 1 a 86400. Passado esse tempo, a métrica ou o evento é descartado e não é enviado depois." },
    ],
  },
];
