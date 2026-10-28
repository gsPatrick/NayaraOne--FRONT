// Parâmetros do agendamento de conteúdo do Marketing (Marco 9, M9-D406). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_AGENDAMENTO_GROUPS = [
  {
    title: "Agendamento de publicações",
    subtitle: "Todo conteúdo aprovado precisa ser agendado com uma antecedência mínima, para dar tempo de revisar e de cancelar antes de sair.",
    fields: [
      {
        key: "marketing.schedule.min_antecedencia_min",
        label: "Antecedência mínima do agendamento (minutos)",
        type: "integer",
        defaultValue: 15,
        helper: "Número inteiro de 1 a 10080. Agendar com menos antecedência é recusado.",
      },
    ],
  },
];
