// Parâmetros dos painéis de Jurídico e Correspondente (Marco 9, M9-D619). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_JURIDICO_GROUPS = [
  {
    title: "Jurídico: processos ativos",
    subtitle: "Quais processos contam como ativos nos painéis (processos por risco e valor estimado). O valor já confirmado de um processo continua aparecendo mesmo depois de ele ser encerrado, sempre separado do estimado.",
    fields: [
      {
        key: "analytics.juridico.processo_encerrado_status",
        label: "Status ou fases que encerram o processo",
        type: "text",
        defaultValue: "CLOSED,ARCHIVED,CANCELLED",
        helper: "Códigos em maiúsculas separados por vírgula. O processo cujo status ou fase estiver nesta lista sai das contagens de processos ativos. Padrão: CLOSED,ARCHIVED,CANCELLED.",
      },
    ],
  },
];
