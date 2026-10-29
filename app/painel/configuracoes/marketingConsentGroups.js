// Consentimento, supressão e política de canal do Marketing (Marco 9, M9-D418). Padrão de Maturacao/demandas/parametros.csv; a API valida
// (422 "Valor inválido para o parâmetro.") e audita cada alteração. A lista de finalidades vale para todo envio automático.
export const MARKETING_CONSENT_GROUPS = [
  {
    title: "Consentimento por finalidade",
    subtitle: "Antes de qualquer mensagem automática o sistema confere o consentimento da pessoa. Finalidade da primeira lista só recebe com consentimento (OPT_IN) registrado; a da segunda lista (por exemplo, confirmação que a própria pessoa pediu) não exige. Finalidade fora das duas listas é recusada e nunca envia. Quem pediu para sair nunca recebe, em nenhuma finalidade.",
    fields: [
      {
        key: "marketing.consent.exige_opt_in_para",
        label: "Finalidades que exigem consentimento (OPT_IN)",
        type: "text",
        defaultValue: "MARKETING, NUTRICAO, RADAR, AVALIACAO, POS_VENDA",
        helper: "Nomes separados por vírgula (letras, números e _).",
      },
      {
        key: "marketing.consent.sem_opt_in_para",
        label: "Finalidades que não exigem consentimento",
        type: "text",
        defaultValue: "TRANSACTIONAL, ACOMPANHAMENTO",
        helper: "Nomes separados por vírgula. Uma finalidade que está nas duas listas conta como exigindo consentimento.",
      },
    ],
  },
  {
    title: "Pedido de saída e endereço",
    subtitle: "Resposta com uma destas palavras (a mensagem inteira, sem considerar acento, pontuação ou maiúsculas) bloqueia todo envio automático àquele endereço no canal. O telefone sem código do país recebe o código abaixo antes de ser guardado em forma de código (hash).",
    fields: [
      {
        key: "marketing.suppression.palavras_opt_out",
        label: "Palavras que significam pedido de saída",
        type: "text",
        defaultValue: "SAIR, PARAR, STOP, CANCELAR",
        helper: "Palavras separadas por vírgula.",
      },
      {
        key: "marketing.suppression.codigo_pais_padrao",
        label: "Código do país padrão dos telefones",
        type: "text",
        defaultValue: "55",
        helper: "De 1 a 3 dígitos, ex.: 55.",
      },
    ],
  },
  {
    title: "Janela de atendimento do WhatsApp",
    subtitle: "Depois da última mensagem recebida da pessoa, o WhatsApp só aceita mensagem livre dentro desta janela. Fora dela, só com template oficial aprovado (os canais que exigem template oficial ficam na seção de templates).",
    fields: [
      {
        key: "marketing.whatsapp.janela_atendimento_h",
        label: "Janela de atendimento (horas)",
        type: "integer",
        defaultValue: 24,
        helper: "Número inteiro de 1 a 168.",
      },
    ],
  },
];
