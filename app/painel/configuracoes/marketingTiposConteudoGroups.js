// Parâmetros dos 10 tipos de conteúdo do Marketing (Marco 9, M9-D409). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_TIPOS_CONTEUDO_GROUPS = [
  {
    title: "Tipos de conteúdo e rascunhos automáticos",
    subtitle: "O sistema cria sozinho o rascunho de alguns tipos (imóvel novo, redução de preço, vendido ou alugado, obra, pós-venda e aniversário). Nunca publica: o rascunho segue o fluxo normal de validação e aprovação.",
    fields: [
      {
        key: "marketing.conteudo.tipos_rascunho_automatico",
        label: "Tipos que geram rascunho automático",
        type: "text",
        defaultValue: "NEW_PROPERTY, PRICE_REDUCTION, SOLD_RENTED, NAYARA_CONSTRUCTION, POST_SALE, BIRTHDAY_RELATIONSHIP",
        helper: "Tipos separados por vírgula. Tire da lista o tipo que não deve gerar rascunho sozinho.",
      },
      {
        key: "marketing.conteudo.aniversario_hora",
        label: "Hora do rascunho de aniversário",
        type: "text",
        defaultValue: "08:00",
        helper: "Formato HH:MM, no fuso de horário da empresa (padrão Brasília). Todo dia, a partir dessa hora, nasce o rascunho de cada aniversariante.",
      },
      {
        key: "marketing.conteudo.varredura_obras_min",
        label: "Intervalo da busca por marcos públicos de obra (minutos)",
        type: "integer",
        defaultValue: 60,
        helper: "Número inteiro de 1 a 1440. A cada intervalo o sistema procura etapas de obra marcadas como públicas e cria o rascunho.",
      },
      {
        key: "marketing.conteudo.finalidade_pos_venda",
        label: "Finalidade de consentimento do pós-venda",
        type: "text",
        defaultValue: "POS_VENDA",
        helper: "O conteúdo de pós-venda só é criado para quem deu consentimento (opt-in) nesta finalidade.",
      },
    ],
  },
  {
    title: "Regras dos textos de imóvel",
    subtitle: "Valem para conteúdo de imóvel novo, redução de preço, vendido ou alugado e obra.",
    fields: [
      {
        key: "marketing.conteudo.minimo_fotos",
        label: "Mínimo de fotos autorizadas",
        type: "integer",
        defaultValue: 1,
        helper: "Número inteiro de 1 a 50. Sem esse mínimo de fotos autorizadas, o conteúdo não é criado.",
      },
      {
        key: "marketing.conteudo.reducao_casas_decimais",
        label: "Casas decimais do percentual de redução de preço",
        type: "integer",
        defaultValue: 2,
        helper: "Número inteiro de 0 a 6. Exemplo com 2 casas: de 800.000 para 780.000 a redução é 2,50%.",
      },
    ],
  },
];
