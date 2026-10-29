// Parâmetros do snapshot diário do BI (Marco 9, M9-D609). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Os limites de atualização por área (freshness) ficam no
// grupo "Atualização dos dados" da qualidade de dados.
export const BI_SNAPSHOT_GROUPS = [
  {
    title: "Fotografia diária dos indicadores",
    subtitle: "Todo dia o sistema fotografa os indicadores do dia anterior para que se possa ver como estavam naquele dia. A fotografia gravada nunca é alterada.",
    fields: [
      {
        key: "analytics.snapshot.hora_execucao",
        label: "Hora da fotografia diária (horário de São Paulo)",
        type: "text",
        defaultValue: "00:30",
        helper: "Formato HH:MM, de 00:00 a 23:59. A fotografia do dia anterior é feita a partir dessa hora. Padrão do livro: 00:30.",
      },
      {
        key: "analytics.snapshot.dias_retroativos_max",
        label: "Até quantos dias para trás recuperar fotografias perdidas",
        type: "number",
        defaultValue: 31,
        helper: "De 1 a 366. Se o processo ficar parado, os dias perdidos são gravados depois e marcados como \"gravado com atraso\", respeitando este limite. Padrão: 31.",
      },
    ],
  },
];
