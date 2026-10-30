// Custos técnicos na aba Governança (Marco 9, M9-D860): ambiente, preços dos coletores, base do GB e hora da medição de armazenamento. Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_FINOPS_GROUPS = [
  {
    title: "FinOps: custo técnico (ledger e coletores)",
    subtitle:
      "O livro-razão dos gastos técnicos (nuvem, IA, armazenamento, tráfego de saída e mensageria). Estimado e faturado ficam sempre separados: a fatura do período substitui a estimativa e nunca soma com ela. Aqui você define o ambiente, os preços usados pelos coletores e quando o armazenamento é medido.",
    fields: [
      { key: "governanca.finops.moeda", label: "Moeda do ledger", type: "text", defaultValue: "BRL", helper: "Só BRL, como no livro." },
      { key: "governanca.finops.ambiente", label: "Ambiente desta instalação", type: "text", defaultValue: "PROD", helper: "PROD, HOMOLOG ou DEV. Os custos coletados entram neste ambiente." },
      { key: "governanca.finops.precos", label: "Preços dos coletores (JSON, centavos por unidade)", type: "text", defaultValue: '{"whatsapp":5,"email":0,"sms":0,"storage_gb_mes":10,"logs_gb_mes":10,"egress_gb":50}', helper: "whatsapp, email e sms por mensagem; storage_gb_mes, logs_gb_mes e egress_gb por GB. O preço da IA vem da tabela do provedor." },
      { key: "governanca.finops.gb_base", label: "Bytes de 1 GB (1024 ou 1000)", type: "integer", defaultValue: 1024, min: 1000, max: 1024 },
      { key: "governanca.finops.storage_hora", label: "Hora da medição diária do armazenamento (0 a 23, Brasília)", type: "integer", defaultValue: 2, min: 0, max: 23 },
      { key: "governanca.finops.janela_dias", label: "Dias de histórico mostrados na saúde do FinOps", type: "integer", defaultValue: 30, min: 1, max: 365 },
    ],
  },
];
