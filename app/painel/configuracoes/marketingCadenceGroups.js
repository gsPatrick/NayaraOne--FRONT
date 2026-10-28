// Parâmetros de cadência do Marketing (Marco 9, M9-D417, MKT-005): tela do administrador. Os padrões são os de
// Maturacao/demandas/parametros.csv; a API valida (422 "Valor inválido para o parâmetro.") e audita cada alteração.
// Alterar exige a permissão de gerir automações de Marketing e não muda ações que já estão agendadas.
export const MARKETING_CADENCE_GROUPS = [
  {
    title: "Cadência de contato",
    subtitle: "De quantos em quantos dias o cliente recebe cada mensagem de uma sequência, contando da data do evento (entrega das chaves, início da locação ou último contato sem retorno). Mudar os números vale para as sequências novas; as já agendadas mantêm as datas.",
    fields: [
      {
        key: "marketing.cadencia.pos_chaves_dias",
        label: "Pós-chaves (dias após a entrega)",
        type: "text",
        defaultValue: "[3,30,90,365]",
        helper: "Lista crescente de dias, ex.: [3,30,90,365] ou 3,30,90,365.",
      },
      {
        key: "marketing.cadencia.locacao_dias",
        label: "Locação (dias após o início)",
        type: "text",
        defaultValue: "[7,15,30,90,180]",
        helper: "Lista crescente de dias, ex.: [7,15,30,90,180].",
      },
      {
        key: "marketing.cadencia.sem_retorno_dias",
        label: "Cliente sem retorno (dias após o último contato)",
        type: "text",
        defaultValue: "[1,3,7]",
        helper: "Lista crescente de dias, ex.: [1,3,7].",
      },
    ],
  },
  {
    title: "Horário de silêncio e limite de mensagens",
    subtitle: "Dentro do horário de silêncio nenhuma mensagem de Marketing sai; ela espera o fim da janela. O limite conta as mensagens já enviadas à mesma pessoa, no mesmo canal e finalidade, nos últimos dias informados.",
    fields: [
      {
        key: "marketing.quiet_hours",
        label: "Horário de silêncio",
        type: "text",
        defaultValue: "21:00 a 08:00 America/Sao_Paulo",
        helper: "Formato HH:MM a HH:MM fuso. A janela pode passar da meia-noite.",
      },
      {
        key: "marketing.frequency_cap.global",
        label: "Limite de mensagens por pessoa, canal e finalidade",
        type: "text",
        defaultValue: "3 mensagens por 7 dias por pessoa, canal e finalidade",
        helper: "Formato: N mensagens por M dias (M até 365).",
      },
    ],
  },
];
