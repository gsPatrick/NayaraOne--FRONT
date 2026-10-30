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
  {
    title: "FinOps: detectores de desperdício",
    subtitle:
      "Cinco detectores só leem e avisam, nunca apagam nem desligam nada: armazenamento órfão, logs excessivos, fila acumulada, modelo de IA caro em tarefa simples e tráfego de saída anormal. O livro não fixa os limites; estes são os valores iniciais e você pode ajustá-los. Os achados abertos aparecem na saúde do FinOps.",
    fields: [
      { key: "governanca.finops.orfao_dias", label: "Dias sem vínculo e sem dono para um arquivo ser órfão", type: "integer", defaultValue: 30, min: 1, max: 3650 },
      { key: "governanca.finops.log_x_media", label: "Logs: vezes a média móvel que abre o achado", type: "integer", defaultValue: 3, min: 2, max: 1000, helper: "O volume do dia precisa passar de N vezes a média dos dias anteriores." },
      { key: "governanca.finops.egress_x_media", label: "Tráfego de saída: vezes a média móvel que abre o achado", type: "integer", defaultValue: 3, min: 2, max: 1000 },
      { key: "governanca.finops.media_dias", label: "Dias da média móvel de logs e tráfego de saída", type: "integer", defaultValue: 14, min: 2, max: 90 },
      { key: "governanca.finops.fila_max", label: "Fila: eventos pendentes acima do qual abre o achado", type: "integer", defaultValue: 5000, min: 1 },
      { key: "governanca.finops.fila_antigos_min", label: "Fila: quantidade de eventos velhos que abre o achado", type: "integer", defaultValue: 50, min: 1, helper: "Um único evento velho não abre o achado." },
      { key: "governanca.finops.fila_idade_min", label: "Fila: idade, em minutos, a partir da qual o evento é velho", type: "integer", defaultValue: 30, min: 1 },
      { key: "governanca.finops.fila_intervalo_min", label: "Fila: intervalo, em minutos, entre as verificações", type: "integer", defaultValue: 5, min: 1, max: 1440 },
      { key: "governanca.finops.ia_custo_chamada_centavos", label: "IA: custo médio por chamada (centavos) acima do qual o modelo é caro para tarefa simples", type: "integer", defaultValue: 50, min: 0 },
      { key: "governanca.finops.detectores_hora", label: "Hora da rodada diária dos detectores (0 a 23, Brasília)", type: "integer", defaultValue: 3, min: 0, max: 23 },
    ],
  },
];
