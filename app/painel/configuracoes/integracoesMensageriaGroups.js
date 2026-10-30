// Mensageria do CRM (Marco 9, M9-D229): telefone no formato internacional e prazo do contato novo. Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Entra na aba "Registro de integrações".
export const MENSAGERIA_GROUPS = [
  {
    title: "Mensageria e atendimento (WhatsApp)",
    subtitle:
      "O CRM envia mensagens pelo fornecedor de mensageria ativo, sem saber qual é. A mensagem fica na fila até o fornecedor aceitar; só vira entregue ou lida quando o fornecedor confirma. Quem escreve pela primeira vez vira um contato novo com a primeira ação para responder.",
    fields: [
      { key: "integration.messaging.country_code", label: "Código do país dos telefones das mensagens", type: "text", defaultValue: "55", helper: "Só dígitos (de 1 a 3). O número do destinatário precisa vir completo, com o sinal de + e este código (ex.: +5511999990000). Sem ele, a mensagem é recusada." },
      { key: "integration.messaging.inbound_lead_prazo_horas", label: "Prazo para responder um contato novo que escreveu primeiro (horas)", type: "integer", defaultValue: 24, helper: "De 1 a 720. É o prazo da primeira ação da oportunidade criada quando um número desconhecido envia mensagem." },
    ],
  },
  {
    title: "WhatsApp: janela, consentimento e mídia",
    subtitle:
      "Regras do canal. Fora da janela de atendimento só sai modelo aprovado no fornecedor. Quem não autorizou (ou pediu para sair por uma palavra-chave) não recebe, nem o que já estava na fila. A mídia só sai de arquivo verificado pelo antivírus, e o fornecedor a busca por um link que expira.",
    fields: [
      { key: "integration.whatsapp.session_window_h", label: "Janela de atendimento (horas desde a última mensagem do cliente)", type: "integer", defaultValue: 24, helper: "De 1 a 168. O livro e o WhatsApp usam 24 horas. Passado esse prazo, texto livre e mídia são recusados e só vai modelo aprovado." },
      { key: "integration.whatsapp.optout_keywords", label: "Palavras de saída (separadas por vírgula)", type: "text", defaultValue: "PARAR,SAIR,CANCELAR", helper: "Quando o cliente responde só com uma destas palavras, o consentimento do WhatsApp é revogado na hora. Frases que apenas contêm a palavra não contam. Letras maiúsculas, acentos e pontuação são ignorados." },
      { key: "integration.whatsapp.transactional_requires_opt_in", label: "Exigir consentimento explícito também nas mensagens transacionais", type: "boolean", defaultValue: false, helper: "Desligado: o contato que nunca revogou recebe avisos transacionais (visita, cobrança). Ligado: só recebe quem aceitou. Marketing sempre exige o aceite." },
      { key: "integration.whatsapp.max_media_bytes", label: "Tamanho máximo da mídia enviada (bytes)", type: "integer", defaultValue: 16777216, helper: "De 1024 a 104857600. O padrão é 16 MiB, limite típico do canal." },
      { key: "integration.whatsapp.media_allowed_types", label: "Tipos de mídia aceitos", type: "text", defaultValue: "image/jpeg,image/png,image/webp,application/pdf,video/mp4,audio/ogg", helper: "Tipos separados por vírgula (até 40)." },
      { key: "integration.whatsapp.media_max_classification", label: "Classificação mais alta do arquivo que pode ir como mídia", type: "enum", defaultValue: "PUBLIC", options: [{ value: "PUBLIC", label: "Público" }, { value: "INTERNAL", label: "Interno" }, { value: "CONFIDENTIAL", label: "Confidencial" }], helper: "O padrão do livro é só arquivo público. Documento restrito ou sem classificação nunca sai." },
      { key: "integration.whatsapp.media_link_ttl_min", label: "Validade do link da mídia (minutos)", type: "integer", defaultValue: 15, helper: "De 1 a 60. O fornecedor busca o arquivo por um link assinado que deixa de valer depois deste prazo (o livro usa 15). Exige armazenamento que assine links (S3 compatível)." },
    ],
  },
];
