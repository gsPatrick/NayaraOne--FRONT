// Parâmetros das automações prontas do Marketing (Marco 9, M9-D422 a M9-D424): pós-chaves, cadência de locação, lembretes de restrição e pedido de avaliação.
// Os padrões são os de Maturacao/demandas/parametros.csv; a API valida (422 "Valor inválido para o parâmetro.") e audita cada alteração.
export const MARKETING_AUTOMACOES_PRONTAS_GROUPS = [
  {
    title: "Locação e pós-chaves",
    subtitle: "A cadência de mensagens da locação só funciona quando a empresa a liga. As mensagens do pós-chaves e da locação que pedem a opinião do cliente levam o endereço da pesquisa de satisfação do CRM; sem endereço, essa mensagem não sai.",
    fields: [
      {
        key: "marketing.locacao.cadencia_ativa",
        label: "Enviar a cadência de mensagens da locação",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: o livro só pede a cadência quando a política da empresa exige.",
      },
      {
        key: "marketing.locacao.tipos_contrato",
        label: "Tipos de contrato que contam como locação",
        type: "text",
        defaultValue: "LEASE,LEASE_RESIDENTIAL,LEASE_COMMERCIAL,LEASE_SEASONAL",
        helper: "Códigos em maiúsculas separados por vírgula.",
      },
      {
        key: "marketing.pos_chaves.link_pesquisa",
        label: "Endereço da pesquisa de satisfação do CRM",
        type: "text",
        defaultValue: "",
        helper: "Endereço https permitido pela regra de URL externa. A pesquisa e a nota são do CRM; o Marketing só leva o endereço na mensagem.",
      },
    ],
  },
  {
    title: "Lembretes de restrição e regularização",
    subtitle: "Pendência de documento, restrição ou regularização gera um lembrete a cada tantos dias, sem revelar o motivo na mensagem. Quando a série expira, ela para e uma tarefa é criada para o responsável. Resolver ou cancelar a pendência encerra a série.",
    fields: [
      {
        key: "marketing.restricao.intervalo_dias",
        label: "Dias entre um lembrete e o seguinte",
        type: "integer",
        defaultValue: 7,
        helper: "Número inteiro de 1 a 365, contado em dias corridos desde a abertura da pendência.",
      },
      {
        key: "marketing.restricao.expiracao_dias",
        label: "Dias para a série de lembretes expirar",
        type: "integer",
        defaultValue: 60,
        helper: "Número inteiro de 1 a 3650. No primeiro dia a partir deste, a série para e a tarefa ao responsável é criada.",
      },
    ],
  },
];
