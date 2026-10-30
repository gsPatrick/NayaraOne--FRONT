// Parâmetros das publicações do Marketing: lista (Marco 9, M9-D410) e worker de publicação (M9-D411). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_PUBLICACOES_GROUPS = [
  {
    title: "Listas do Marketing (publicações e templates)",
    subtitle: "Cada conteúdo agendado vira uma publicação por canal; a lista de publicações mostra o status de cada canal, ordenada pelo horário agendado. O tamanho da página abaixo vale também para a lista de templates.",
    fields: [
      {
        key: "marketing.publicacoes.pagina_padrao",
        label: "Itens por página (padrão)",
        type: "integer",
        defaultValue: 50,
        helper: "Número inteiro de 1 a 1000. Usado quando o pedido não informa o tamanho da página.",
      },
      {
        key: "marketing.publicacoes.pagina_maxima",
        label: "Itens por página (máximo)",
        type: "integer",
        defaultValue: 200,
        helper: "Número inteiro de 1 a 1000. Pedidos com página maior são limitados a este valor.",
      },
    ],
  },
  {
    title: "Worker de publicação",
    subtitle: "O worker publica no canal os conteúdos agendados. Se o canal não responde a tempo, ele não tenta de novo às cegas: primeiro confere no canal se o post saiu, e só repete se tiver certeza de que não saiu.",
    fields: [
      { key: "marketing.worker.intervalo_s", label: "Intervalo entre os ciclos do worker (segundos)", type: "integer", defaultValue: 30, helper: "Número inteiro de 5 a 3600." },
      { key: "marketing.worker.lote", label: "Publicações processadas por ciclo", type: "integer", defaultValue: 20, helper: "Número inteiro de 1 a 500." },
      { key: "marketing.worker.timeout_s", label: "Tempo máximo de resposta do canal (segundos)", type: "integer", defaultValue: 30, helper: "Número inteiro de 1 a 600. Sem resposta neste prazo, a publicação fica sem confirmação e é reconciliada. Uma publicação em andamento por mais que o dobro deste prazo, sem o worker terminar, também é reconciliada." },
      { key: "marketing.worker.max_tentativas", label: "Tentativas de publicação no total", type: "integer", defaultValue: 3, helper: "Número inteiro de 1 a 10. Conta a primeira tentativa e as repetições; o circuito aberto do canal não conta." },
      { key: "marketing.worker.backoff_s", label: "Espera antes de cada nova tentativa (segundos)", type: "text", defaultValue: "[60,300]", helper: "Lista de segundos, um valor por nova tentativa (ex.: 60,300). Se a lista for menor que o necessário, repete o último valor." },
      { key: "marketing.worker.reconcile_s", label: "Intervalo entre as conferências no canal (segundos)", type: "integer", defaultValue: 120, helper: "Número inteiro de 5 a 86400. Vale para publicação sem confirmação e para post ainda em processamento no canal." },
      { key: "marketing.worker.reconcile_max_h", label: "Horas sem confirmação até o alerta crítico", type: "integer", defaultValue: 24, helper: "Número inteiro de 1 a 720. Passado o prazo, quem agendou é avisado para decidir (cancelar e, se preciso, agendar de novo). O worker nunca republica sozinho." },
      { key: "marketing.worker.metricas_dias", label: "Dias, após a publicação, em que as métricas são coletadas", type: "text", defaultValue: "[0,1,7]", helper: "Lista crescente de dias de 0 a 365 (0 = no dia da publicação). Cada dia é coletado uma única vez." },
    ],
  },
];
