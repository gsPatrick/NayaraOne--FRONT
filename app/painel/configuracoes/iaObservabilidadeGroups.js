// Parâmetro da observabilidade da NAY (Marco 9, M9-D047). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_OBSERVABILIDADE_GROUPS = [
  {
    title: "Observabilidade da NAY",
    subtitle: "Como saber, em produção, se a NAY está saudável, gastando demais ou sendo atacada: o sistema conta execuções, custo, bloqueios, injeções e trocas de modelo e expõe os números para o painel técnico.",
    fields: [
      {
        key: "ia.observabilidade.metricas_ativas",
        label: "Contar as métricas da NAY desta empresa",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão. Desligado, as execuções, o custo e os bloqueios desta empresa deixam de entrar nas métricas técnicas (os registros de auditoria e o histórico de execuções continuam normais).",
      },
    ],
  },
];
