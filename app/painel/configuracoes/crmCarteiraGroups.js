// Parâmetros do CRM que o administrador controla (Marco 3). A API valida (SETTINGS_SCHEMA, src/features/crm/carteira/carteira.settings.js)
// e audita cada alteração; o padrão mostrado é o valor que a API usa enquanto a empresa não gravou nada.
export const CARTEIRA_KEY = "crm.carteira.registro_sem_oportunidade";

export const CARTEIRA_OPTIONS = [
  {
    value: "CLIENTE_DA_CARTEIRA",
    label: "Do cliente da carteira: o corretor vê o que ele registrou e o que é de cliente que tem oportunidade com ele",
  },
  { value: "SOMENTE_PROPRIOS", label: "Só os próprios: o corretor vê apenas o que ele mesmo registrou" },
];

export const CRM_GROUPS = [
  {
    title: "Carteira do corretor",
    subtitle:
      "Quem tem a permissão de ver só a própria carteira nunca alcança a oportunidade de outro corretor, nem as visitas, mensagens, propostas, carrinhos, radares, ocorrências e tarefas ligadas a ela (listas, telas, painel e exportação). Esta regra decide o que ele vê dos registros que não estão ligados a nenhuma oportunidade (por exemplo, uma mensagem só com o cliente).",
    fields: [
      {
        key: CARTEIRA_KEY,
        label: "Registros sem oportunidade",
        type: "enum",
        defaultValue: "CLIENTE_DA_CARTEIRA",
        options: CARTEIRA_OPTIONS,
        helper: "Padrão: do cliente da carteira. A visita em que ele é o corretor designado e a tarefa ou ocorrência em que ele é o responsável sempre aparecem para ele.",
      },
    ],
  },
];

export const CRM_FIELDS = CRM_GROUPS.flatMap((group) => group.fields);
