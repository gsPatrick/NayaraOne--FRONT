// Parâmetros dos painéis de Comercial/CRM e Imóveis (Marco 9, M9-D616). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_COMERCIAL_GROUPS = [
  {
    title: "Comercial e CRM",
    subtitle: "Como os painéis de leads, oportunidades, visitas e propostas contam o que está parado e a primeira resposta ao cliente.",
    fields: [
      {
        key: "analytics.centro.opp_parada_dias",
        label: "Dias sem movimento para a oportunidade contar como parada",
        type: "number",
        defaultValue: 7,
        helper: "De 1 a 365. Movimento é a última edição da oportunidade ou a última mensagem dela. Oportunidade encerrada nunca conta como parada. Padrão: 7.",
      },
      {
        key: "analytics.comercial.primeira_resposta_inclui_nay",
        label: "A resposta da NAY conta como primeira resposta ao lead",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: resposta automática não conta, só a mensagem de saída de uma pessoa da equipe vale para o tempo de primeira resposta. Ligado, a primeira resposta da NAY também conta.",
      },
      {
        key: "analytics.comercial.janela_recalculo_dias",
        label: "Dias para trás que a atualização periódica refaz nos números diários",
        type: "number",
        defaultValue: 7,
        helper: "De 1 a 90. Visitas agendadas, propostas, mudanças de preço e cruzamentos do Radar são refeitos todo ciclo para esses últimos dias, porque nem tudo gera um aviso na hora. Padrão: 7.",
      },
    ],
  },
  {
    title: "Imóveis sem venda",
    subtitle: "Faixas de tempo em que o painel de Imóveis agrupa os imóveis disponíveis ainda sem venda.",
    fields: [
      {
        key: "analytics.imoveis.faixas_sem_venda_dias",
        label: "Limites das faixas, em dias",
        type: "text",
        defaultValue: "30,60,90,180",
        helper: "Lista crescente de dias, separados por vírgula, até 10 faixas. Com 30,60,90,180 as faixas são: até 30, de 31 a 60, de 61 a 90, de 91 a 180 e acima de 180 dias.",
      },
    ],
  },
];
