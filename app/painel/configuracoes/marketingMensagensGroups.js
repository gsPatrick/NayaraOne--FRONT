// Parâmetros das mensagens de WhatsApp e e-mail do Marketing (Marco 9, M9-D429). Padrão de Maturacao/demandas/parametros.csv; a API valida cada valor.
export const MARKETING_MENSAGENS_GROUPS = [
  {
    title: "Pré-visualização sem dado sensível",
    subtitle: "O começo da mensagem de WhatsApp (e o assunto e o pré-cabeçalho do e-mail) aparece na notificação do celular e não pode revelar CPF, CNPJ, número de contrato, endereço completo, valor de dívida ou de saldo, motivo de restrição nem dado de saúde. CPF, CNPJ, contrato e endereço viram [REDIGIDO]; o restante é recusado.",
    fields: [
      {
        key: "marketing.preview.max_chars",
        label: "Caracteres do WhatsApp que aparecem na notificação",
        type: "integer",
        defaultValue: 60,
        helper: "Número inteiro de 1 a 500. Só o que começa dentro deste trecho é verificado.",
      },
      {
        key: "marketing.preview.termos_sensiveis",
        label: "Termos que marcam a frase como sensível",
        type: "text",
        defaultValue: "divida: parcela, dívida, débito, atraso, vencid, multa, cobrança; saldo: saldo, extrato, limite; restricao: restrição, negativad, SPC, Serasa, protesto, score; saude: doença, laudo, CID, diagnóstico, tratamento, deficiência",
        helper: "Quatro grupos (divida, saldo, restricao, saude) no formato grupo: termo, termo; grupo: termo. Termo com mais de 3 letras vale como começo de palavra. Dívida e saldo só contam junto de um valor em reais.",
      },
      {
        key: "marketing.preview.padrao_contrato",
        label: "Padrão do número de contrato",
        type: "text",
        defaultValue: "\\b(?:loc|adm|ven|srv|obr)-\\d{4}-\\d{4,}\\b",
        helper: "Expressão regular (até 200 caracteres). O padrão é o do módulo Contratos: PREFIXO-ANO-SEQUÊNCIA, ex.: LOC-2026-0001.",
      },
      {
        key: "marketing.preview.texto_seguro",
        label: "Texto enviado no lugar de uma mensagem sensível",
        type: "text",
        defaultValue: "Você tem uma atualização. Acesse o portal.",
        helper: "Frase de 10 a 160 caracteres, enviada com o link seguro do portal.",
      },
    ],
  },
  {
    title: "Descadastro do e-mail de marketing",
    subtitle: "Todo e-mail de marketing leva o link de descadastro no rodapé e o cabeçalho List-Unsubscribe. Quem clica deixa de receber e entra na lista de supressão.",
    fields: [
      {
        key: "marketing.email.url_descadastro",
        label: "Endereço da página de descadastro",
        type: "text",
        defaultValue: "nenhuma",
        helper: "Endereço https que contenha {token} (ex.: https://www.suaempresa.com.br/descadastro?t={token}) ou nenhuma. Sem endereço, o e-mail de marketing só sai se o envio informar o link.",
      },
    ],
  },
];
