// Parâmetros do fluxo de execução de uma consulta da NAY (Marco 9, M9-D020). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_EXECUCAO_GROUPS = [
  {
    title: "Execução de uma consulta da NAY",
    subtitle: "Limites do passo a passo de cada consulta: quantas voltas de ferramenta e quanto tempo no total. O limite de ferramentas, de processamento e o tempo de cada chamada ficam em Agentes.",
    fields: [
      {
        key: "ia.agente.max_voltas",
        label: "Máximo de voltas de ferramenta por consulta",
        type: "integer",
        min: 1,
        max: 20,
        defaultValue: 4,
        helper: "Número inteiro de 1 a 20. Cada volta é: a NAY pede uma ferramenta, recebe o resultado e continua. Passando disso, a consulta falha com o aviso de limite de etapas.",
      },
      {
        key: "ia.agente.timeout_total_ms",
        label: "Tempo máximo total da consulta (milissegundos)",
        type: "integer",
        min: 1000,
        max: 1800000,
        defaultValue: 60000,
        helper: "Número inteiro de 1000 a 1800000. Passando disso, a consulta é encerrada com o aviso de que a NAY demorou demais.",
      },
    ],
  },
];
