// Parâmetros de execução das automações do Marketing (Marco 9, M9-D415). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_RUNNER_GROUPS = [
  {
    title: "Execução das automações",
    subtitle: "Uma execução que fica em andamento além deste tempo, sem terminar, é considerada travada e é retomada só nas ações que faltam. Execuções que esperam um horário marcado (horário de silêncio, cadência) nunca são tratadas como travadas.",
    fields: [
      {
        key: "marketing.runner.timeout_s",
        label: "Tempo para considerar uma execução travada (segundos)",
        type: "integer",
        defaultValue: 300,
        helper: "Número inteiro de 1 a 86400.",
      },
      {
        key: "marketing.runner.acao_timeout_s",
        label: "Tempo máximo de cada ação da automação (segundos)",
        type: "integer",
        defaultValue: 30,
        helper: "Número inteiro de 1 a 3600. Uma ação que passa deste tempo fica com resultado desconhecido e não é repetida sem conferir antes.",
      },
      {
        key: "marketing.runner.canais_automaticos",
        label: "Ordem dos canais quando a ação de envio pede canal automático",
        type: "text",
        defaultValue: "WHATSAPP, EMAIL",
        helper: "Canais separados por vírgula (WHATSAPP, EMAIL). O primeiro em que a pessoa tem contato é o usado; se não tiver nenhum, a automação não envia.",
      },
    ],
  },
];
