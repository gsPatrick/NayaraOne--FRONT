// Parâmetros do briefing da NAY Diretoria (Marco 9, M9-D693 e M9-D694). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_BRIEFING_GROUPS = [
  {
    title: "Briefing da NAY Diretoria: agenda e tamanho",
    subtitle: "A NAY escreve um resumo curto das exceções do dia e da semana, com a fonte e o quanto cada dado está atualizado. O briefing é gerado sozinho nos horários abaixo (fuso de São Paulo) e nunca executa nenhuma ação.",
    fields: [
      {
        key: "analytics.brief.hora_diario",
        label: "Hora do briefing diário",
        type: "text",
        defaultValue: "06:30 America/Sao_Paulo",
        helper: "Formato: 06:30 America/Sao_Paulo. O diário cobre o dia anterior.",
      },
      {
        key: "analytics.brief.hora_semanal",
        label: "Dia e hora do briefing semanal",
        type: "text",
        defaultValue: "segunda 07:00 America/Sao_Paulo",
        helper: "Formato: segunda 07:00 America/Sao_Paulo. O semanal cobre a semana anterior, de segunda a domingo.",
      },
      {
        key: "analytics.brief.max_itens",
        label: "Máximo de itens por briefing",
        type: "text",
        defaultValue: "diário 7; semanal 12",
        helper: "Formato: diário 7; semanal 12. Só exceções entram: indicador normal não aparece.",
      },
      {
        key: "analytics.brief.papel",
        label: "Papel cujos painéis alimentam o briefing",
        type: "text",
        defaultValue: "Diretoria",
        helper: "O briefing usa os painéis publicados para este papel (painel sem papel definido vale para todos).",
      },
      {
        key: "analytics.brief.dominios",
        label: "Áreas que a diretoria enxerga no briefing",
        type: "text",
        defaultValue: "Financeiro, Comercial, Imóveis, Marketing, Atendimento, Locação, Jurídico, Obras, Estoque, Correspondente",
        helper: "Separe por vírgula. Quem lê o briefing só vê os itens das áreas a que tem acesso, mesmo que a área esteja nesta lista.",
      },
      {
        key: "analytics.brief.texto_demais_areas",
        label: "Fechamento quando há exceções",
        type: "text",
        defaultValue: "Todas as demais áreas dentro do esperado",
        helper: "Aparece no fim do briefing quando nada além do que está listado fugiu do esperado.",
      },
      {
        key: "analytics.brief.texto_todas_areas",
        label: "Fechamento quando não há exceção",
        type: "text",
        defaultValue: "Todas as áreas dentro do esperado",
        helper: "Aparece no fim do briefing quando nenhuma área tem exceção.",
      },
    ],
  },
  {
    title: "Briefing da NAY Diretoria: variação e causa",
    subtitle: "A NAY compara o período com o anterior e só afirma uma causa quando o sistema tem o registro dela. Sem registro, o briefing diz que a causa não foi identificada.",
    fields: [
      {
        key: "analytics.brief.variacao_relevante_pct",
        label: "Variação que entra no briefing (%)",
        type: "number",
        defaultValue: 10,
        helper: "De 0 a 1.000. Variações menores, em módulo, não entram como exceção nem como destaque.",
      },
      {
        key: "analytics.brief.polaridade",
        label: "O que é melhor em cada indicador",
        type: "text",
        defaultValue:
          "fin.free_cash=alta; crm.conversion_rate=alta; crm.visits=alta; crm.proposals=alta; sup.satisfaction=alta; fin.breathing_need=baixa; fin.anomalies_open=baixa; legal.missing_documents=baixa; obra.delays=baixa; obra.waste=baixa; inv.below_minimum=baixa",
        helper: "Formato: código=alta ou código=baixa, separados por ponto e vírgula. Indicador que melhora vira destaque; sem polaridade, a variação relevante entra como exceção.",
      },
      {
        key: "analytics.brief.fontes_causa",
        label: "Registros de causa que a NAY pode citar",
        type: "text",
        defaultValue: "crm.loss_reasons=motivo",
        helper: "Formato: código do indicador=dimensão, separados por ponto e vírgula. É onde o sistema guarda o motivo informado por uma pessoa (por exemplo, o motivo da perda).",
      },
      {
        key: "analytics.brief.palavras_causalidade",
        label: "Palavras que só valem ao citar um registro de causa",
        type: "text",
        defaultValue: "porque; devido a; causado por; por causa de; em razão de",
        helper: "Separe por ponto e vírgula. O briefing que usar estas palavras sem citar o registro de causa tem o item removido.",
      },
    ],
  },
];
