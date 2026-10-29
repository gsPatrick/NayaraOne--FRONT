// Parâmetros dos indicadores de atrasos, medições e não conformidades das obras do BI (Marco 9, M9-D651): o responsável (owner) de cada indicador e o limite
// de não conformidade sem causa. As fórmulas, os estados e os prazos são do livro e não mudam; o valor de cada indicador é calculado no servidor. A API valida
// (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const DEFAULT_OWNER = "Diretoria de Obras (papel obras-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({
  key,
  label: `Responsável pelo indicador ${label}`,
  type: "text",
  defaultValue: DEFAULT_OWNER,
  helper: HELPER,
});

export const BI_OBRAS_OPERACAO_GROUPS = [
  {
    title: "Indicadores de Obras: atrasos, medições e não conformidades",
    subtitle: "Etapas atrasadas, valores medidos e aprovados e desvios de qualidade abertos. Aqui você define quem confere cada número e quanto de não conformidade sem causa informada o indicador tolera.",
    fields: [
      owner("analytics.owner.obra.delays", "Atrasos"),
      owner("analytics.owner.obra.measurements", "Medições"),
      owner("analytics.owner.obra.nonconformities", "Não conformidades"),
      {
        key: "analytics.qualidade.max_sem_causa_pct",
        label: "Não conformidades sem causa toleradas (%)",
        type: "number",
        defaultValue: 5,
        helper: "Parcela máxima, em %, das não conformidades (abertas e fechadas no período) sem causa informada. Acima disso o indicador de não conformidades aparece como \"Dado incompleto\", sem valor. Padrão do livro: 5.",
      },
    ],
  },
];
