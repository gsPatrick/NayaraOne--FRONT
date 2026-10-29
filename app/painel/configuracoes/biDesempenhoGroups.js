// Parâmetros de desempenho dos painéis do BI (Marco 9, M9-D698). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida.
export const BI_DESEMPENHO_GROUPS = [
  {
    title: "Desempenho dos painéis",
    subtitle: "Os painéis leem números já somados, nunca as tabelas de lançamentos. A meta de tempo (p95) de cada painel é definida ao publicá-lo.",
    fields: [
      {
        key: "analytics.cache.ttl_segundos",
        label: "Por quanto tempo uma resposta de painel fica guardada (segundos)",
        type: "number",
        defaultValue: 60,
        helper: "De 1 a 86.400. Cada pessoa só recebe respostas guardadas para o mesmo conjunto de permissões, e uma atualização dos dados da empresa descarta o que estava guardado. Padrão: 60.",
      },
      {
        key: "analytics.consulta.timeout_ms",
        label: "Tempo máximo de uma consulta de painel (milissegundos)",
        type: "number",
        defaultValue: 10000,
        helper: "De 100 a 600.000. Acima disso a consulta é cancelada e a pessoa vê 'A consulta demorou mais que o permitido'. Padrão: 10.000.",
      },
      {
        key: "analytics.refresh.lock_timeout_ms",
        label: "Tempo máximo esperando um bloqueio na atualização dos painéis (milissegundos)",
        type: "number",
        defaultValue: 2000,
        helper: "De 50 a 600.000. A atualização desiste em vez de atrasar quem está lançando um pagamento ou fechando uma venda. Padrão: 2.000.",
      },
      {
        key: "analytics.mv.schedule",
        label: "Agenda das séries históricas (últimos 24 meses)",
        type: "text",
        defaultValue: "a cada 360 min e às 00:40 America/Sao_Paulo",
        helper: "Formato: a cada 360 min e às 00:40 America/Sao_Paulo. A atualização não bloqueia a leitura dos painéis.",
      },
    ],
  },
];
