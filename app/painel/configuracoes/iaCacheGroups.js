// Parâmetros do cache seguro de respostas (Marco 9, M9-D015). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_CACHE_GROUPS = [
  {
    title: "Reaproveitamento de respostas da NAY",
    subtitle: "Quando a mesma pergunta sem dado pessoal e sem informação sigilosa se repete, a NAY pode reaproveitar a resposta em vez de pagar de novo. Só vale para as tarefas liberadas em cada agente.",
    fields: [
      {
        key: "ia.cache.habilitado",
        label: "Reaproveitar respostas não sensíveis",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão. Ligado, só entram respostas de fonte pública ou interna, sem dado pessoal, que não sejam ação. Nunca vale entre empresas nem entre pessoas com permissões diferentes.",
      },
      {
        key: "ia.cache.ttl_segundos",
        label: "Por quanto tempo a resposta guardada vale (segundos)",
        type: "integer",
        min: 1,
        max: 604800,
        defaultValue: 900,
        helper: "Número inteiro. Passado esse tempo, ou se a fonte mudar de versão ou for revogada, a NAY pergunta de novo ao modelo.",
      },
    ],
  },
];
