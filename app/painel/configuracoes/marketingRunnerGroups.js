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
    ],
  },
];
