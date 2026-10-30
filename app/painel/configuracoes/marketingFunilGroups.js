// Parâmetros das automações de entrada do funil (Marco 9, M9-D420): lead novo e cliente frio. Os padrões são os de Maturacao/demandas/parametros.csv; a API valida.
// A cadência do "sem retorno" fica no grupo de cadência de contato.
export const MARKETING_FUNIL_GROUPS = [
  {
    title: "Lead novo",
    subtitle: "Quando chega um lead por formulário, site, portal ou WhatsApp, a pessoa recebe a confirmação e o corretor da carteira ganha uma tarefa de contato. A tarefa é criada mesmo quando a mensagem não pode ser enviada.",
    fields: [
      {
        key: "marketing.lead_novo.prazo_contato_min",
        label: "Prazo da tarefa de contato com o lead novo (minutos)",
        type: "integer",
        defaultValue: 60,
        helper: "Número inteiro de 1 a 10080. É o prazo para o corretor ligar, contado da chegada do lead.",
      },
      {
        key: "marketing.lead_novo.origens",
        label: "Origens do lead que recebem a confirmação",
        type: "text",
        defaultValue: "FORM, SITE, PORTAL, WHATSAPP",
        helper: "Origens separadas por vírgula (FORM, SITE, PORTAL, WHATSAPP, PHONE, EMAIL, SOCIAL, REFERRAL, OTHER). Lead de outra origem não recebe a confirmação automática.",
      },
    ],
  },
  {
    title: "Cliente frio",
    subtitle: "Toda segunda-feira, quem está sem interação há tempo e aceitou receber nutrição recebe um conteúdo aprovado, com limite de mensagens em uma janela móvel. Mensagem automática não conta como interação; a resposta do cliente tira da nutrição.",
    fields: [
      {
        key: "marketing.cliente_frio.dias_inatividade",
        label: "Dias sem interação para virar cliente frio",
        type: "integer",
        defaultValue: 60,
        helper: "Número inteiro de 1 a 3650.",
      },
      {
        key: "marketing.cliente_frio.max_mensagens",
        label: "Máximo de mensagens de nutrição na janela",
        type: "integer",
        defaultValue: 4,
        helper: "Número inteiro de 1 a 100. O limite geral de mensagens da empresa continua valendo; vale o menor.",
      },
      {
        key: "marketing.cliente_frio.janela_dias",
        label: "Janela móvel do limite de nutrição (dias)",
        type: "integer",
        defaultValue: 90,
        helper: "Número inteiro de 1 a 3650. Quando a contagem cai abaixo do máximo, a nutrição volta sozinha.",
      },
      {
        key: "marketing.cliente_frio.tipos_conteudo",
        label: "Tipos de conteúdo aprovado usados na nutrição",
        type: "text",
        defaultValue: "EDUCATIONAL_BLOG",
        helper: "Tipos separados por vírgula, em maiúsculas (ex.: EDUCATIONAL_BLOG, NEW_PROPERTY). Só sai conteúdo já aprovado; sem conteúdo aprovado, nada é enviado.",
      },
    ],
  },
];
