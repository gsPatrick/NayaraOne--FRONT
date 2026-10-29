// Parâmetros dos indicadores de avanço, custo e margem das obras do BI (Marco 9, M9-D650): o responsável (owner) de cada indicador. As fórmulas, os estados e
// os prazos são do livro e não mudam; o valor de cada indicador é calculado no servidor. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const DEFAULT_OWNER = "Diretoria de Obras (papel obras-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({
  key,
  label: `Responsável pelo indicador ${label}`,
  type: "text",
  defaultValue: DEFAULT_OWNER,
  helper: HELPER,
});

export const BI_OBRAS_KPI_GROUPS = [
  {
    title: "Indicadores de Obras: avanço, custo e margem",
    subtitle: "Progresso contra o cronograma, baseline, realizado e previsão do custo, e margem projetada de cada obra. A previsão aparece sempre rotulada como projetada e nunca é somada ao realizado. Aqui você só define quem confere cada número.",
    fields: [
      owner("analytics.owner.obra.progress_vs_schedule", "Progresso x cronograma"),
      owner("analytics.owner.obra.baseline_actual_forecast", "Baseline, actual e forecast do custo"),
      owner("analytics.owner.obra.projected_margin", "Margem projetada"),
    ],
  },
];
