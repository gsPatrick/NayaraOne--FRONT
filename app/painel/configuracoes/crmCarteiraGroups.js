// Parâmetros do CRM da rodada M3CB (Marco 3: carteira do corretor e exportação da base de clientes), na aba "CRM: carteira e exportação". A API valida (SETTINGS_SCHEMA, src/features/crm/carteira/carteira.settings.js)
// e audita cada alteração; o padrão mostrado é o valor que a API usa enquanto a empresa não gravou nada.
export const CARTEIRA_KEY = "crm.carteira.registro_sem_oportunidade";

export const CARTEIRA_OPTIONS = [
  {
    value: "CLIENTE_DA_CARTEIRA",
    label: "Do cliente da carteira: o corretor vê o que ele registrou e o que é de cliente que tem oportunidade com ele",
  },
  { value: "SOMENTE_PROPRIOS", label: "Só os próprios: o corretor vê apenas o que ele mesmo registrou" },
];

export const CRM_CARTEIRA_GROUPS = [
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
  {
    title: "Exportação de oportunidades",
    subtitle:
      "A exportação da base de clientes (oportunidades do CRM) sempre pede a permissão de exportar, a finalidade com justificativa e a confirmação do código de verificação (MFA), e fica registrada. Acima do limite de registros, o pedido é recusado (nunca sai cortado); vale o menor entre este limite e o da política de proteção contra vazamento da aba Governança.",
    fields: [
      {
        key: "exportacao.crm.linhas_maximo",
        label: "Máximo de registros por exportação",
        type: "integer",
        defaultValue: 5000,
        min: 1,
        max: 100000,
        helper: "Padrão: 5.000. Número inteiro de 1 a 100.000.",
      },
      {
        key: "exportacao.crm.exige_mfa",
        label: "Exigir a confirmação do código de verificação (MFA) para exportar",
        type: "boolean",
        defaultValue: true,
        helper: "Padrão: ligado. O livro exige o código na exportação da base de clientes: o sistema não aceita desligar. Alterar pede o seu código.",
      },
    ],
  },
];

export const CRM_CARTEIRA_FIELDS = CRM_CARTEIRA_GROUPS.flatMap((group) => group.fields);
