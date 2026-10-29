// Parâmetro do teste de carga do BI (Marco 9, M9-D699). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_CARGA_GROUPS = [
  {
    title: "Teste de carga dos painéis",
    subtitle: "A etapa de carga do BI confere que abrir painéis pesados não deixa o dia a dia (lançar, liquidar, mover oportunidade, apontar obra) mais lento do que o limite abaixo.",
    fields: [
      {
        key: "analytics.carga.degradacao_max_pct",
        label: "Aumento máximo do tempo das operações com os painéis sob carga (%)",
        type: "number",
        defaultValue: 10,
        helper: "De 0 a 1.000. Se o tempo p95 de uma operação subir mais que isto sobre a medição sem painéis, a etapa de carga reprova a liberação e aponta o painel responsável. Padrão: 10.",
      },
    ],
  },
];
