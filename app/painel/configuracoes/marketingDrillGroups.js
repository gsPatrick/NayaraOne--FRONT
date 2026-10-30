// Parâmetros do failure drill de provedor do Marketing (Marco 9, M9-D442). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_DRILL_GROUPS = [
  {
    title: "Failure drill de provedor",
    subtitle: "O ensaio derruba o provedor de propósito, em cada canal, e confere que o sistema não duplica, não finge e avisa. O ensaio de cada canal é pré-requisito da liberação dele para produção. Os valores abaixo só dimensionam o ensaio.",
    fields: [
      {
        key: "marketing.drill.jobs_pendentes",
        label: "Publicações que esperam com o circuito aberto, em cada ensaio",
        type: "integer",
        defaultValue: 10,
        helper: "Número inteiro de 1 a 1000. Com o provedor fora do ar, o circuito abre e estas publicações precisam ficar esperando, sem se perder e sem chamar o canal. O livro dá o exemplo de 100.",
      },
      {
        key: "marketing.drill.slow_margem_ms",
        label: "Quanto a resposta lenta passa do tempo máximo do canal (milissegundos)",
        type: "integer",
        defaultValue: 500,
        helper: "Número inteiro de 50 a 60000. No cenário de resposta lenta, o provedor demora este tempo a mais que o tempo máximo de resposta do canal e o sistema deve tratar como sem resposta.",
      },
    ],
  },
];
