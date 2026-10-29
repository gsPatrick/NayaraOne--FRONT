// Custo real das campanhas (Marco 9, M9-D432). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_CUSTOS_GROUPS = [
  {
    title: "Custo real das campanhas",
    subtitle: "O custo real de cada campanha vem dos lançamentos pagos do Financeiro (referência da campanha ou centro de custo com o mesmo código). O Marketing só lê; nunca cria nem altera lançamento. Sem o Financeiro, o orçamento é o único custo.",
    fields: [
      {
        key: "marketing.custos.fonte_financeiro_ativa",
        label: "Esta empresa usa o Financeiro como fonte do custo",
        type: "boolean",
        defaultValue: true,
        helper: "Desligado: o custo real das campanhas permanece em zero e só o orçamento vale.",
      },
      {
        key: "marketing.custos.intervalo_recalculo_horas",
        label: "Intervalo do recálculo do custo (horas)",
        type: "integer",
        defaultValue: 24,
        helper: "Número inteiro de 1 a 720. As campanhas em andamento têm o custo recalculado a cada intervalo e uma última vez ao encerrar.",
      },
    ],
  },
];
