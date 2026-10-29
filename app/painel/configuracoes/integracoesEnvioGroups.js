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
];
