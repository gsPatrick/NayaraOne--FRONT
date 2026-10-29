// Parâmetros da NAY Atendimento (Marco 9, M9-D041): a triagem da mensagem do cliente, o encaminhamento a uma pessoa e os textos que o cliente lê. Padrão de Maturacao/demandas/parametros.csv; a API valida.
const TERMOS = "Lista separada por vírgula. A comparação ignora maiúsculas e acentos.";

export const IA_ATENDIMENTO_GROUPS = [
  {
    title: "Atendimento ao cliente: triagem da mensagem",
    subtitle: "A NAY Atendimento conversa com clientes pelo site e pelo WhatsApp. Antes de responder, a mensagem é triada por estas listas: o que sai da política vai a um atendente, e o que fala de outro cliente é recusado.",
    fields: [
      {
        key: "ia.atendimento.termos_fora_da_politica",
        label: "Termos de pedidos fora da política (vão para um atendente)",
        type: "text",
        defaultValue: "desconto,abatimento,renegociar,renegociação,parcelar,parcelamento,prazo,multa,juros,isenção,rescisão,reembolso,acordo,condição especial,negociar",
        helper: `${TERMOS} Mensagem com algum destes termos não é respondida pela NAY: o pedido é registrado para um atendente e o cliente recebe o texto de encaminhamento.`,
      },
      {
        key: "ia.atendimento.termos_canal_externo",
        label: "Termos de pedido de envio por WhatsApp, e-mail ou SMS (vão para um atendente)",
        type: "text",
        defaultValue: "envie um whatsapp,envie uma mensagem,mande um whatsapp,mande uma mensagem,mande um e-mail,envie um e-mail,enviar sms,dispare",
        helper: `${TERMOS} A NAY nunca envia mensagem por conta própria: o envio é do fluxo de Marketing e Integrações, então o pedido vai para um atendente.`,
      },
      {
        key: "ia.atendimento.termos_outro_cliente",
        label: "Termos de pedido sobre outro cliente (recusados)",
        type: "text",
        defaultValue: "outro cliente,outra pessoa,meu vizinho,dados de terceiro,contrato de outro,do inquilino,do proprietário",
        helper: `${TERMOS} A conversa é só do contato que está falando. Mensagem com algum destes termos recebe o texto de fora do escopo.`,
      },
      {
        key: "ia.atendimento.termos_anuncios",
        label: "Termos de pedido de lista de imóveis (respondidos pela lista de anúncios públicos)",
        type: "text",
        defaultValue: "anúncios,anuncios,imóveis disponíveis,imoveis disponiveis,imóveis à venda,imóveis para alugar,o que vocês têm,casas à venda,apartamentos para alugar",
        helper: `${TERMOS} A resposta vem direto dos anúncios públicos da empresa, sem uso de modelo de IA.`,
      },
      {
        key: "ia.atendimento.termos_promessa",
        label: "Termos de promessa que a resposta da NAY não pode conter",
        type: "text",
        defaultValue: "prometo,garanto,garantimos,fica combinado,pode contar que,eu te dou,vamos dar desconto,conseguimos fazer por",
        helper: `${TERMOS} Se a resposta da NAY tiver algum destes trechos, ela é trocada pelo texto de resposta sem promessa.`,
      },
      {
        key: "ia.atendimento.max_anuncios",
        label: "Máximo de anúncios por resposta",
        type: "integer",
        min: 1,
        max: 20,
        defaultValue: 5,
        helper: "Número inteiro de 1 a 20. Quantos anúncios públicos a NAY lista quando o cliente pede imóveis disponíveis.",
      },
    ],
  },
  {
    title: "Atendimento ao cliente: encaminhamento e textos",
    subtitle: "O encaminhamento chega à pessoa do papel indicado como uma recomendação da NAY; ela marca como vista e abre a tarefa pelo CRM. A NAY não cria tarefa sozinha.",
    fields: [
      {
        key: "ia.atendimento.papel_handoff",
        label: "Papel que recebe os encaminhamentos do atendimento",
        type: "text",
        defaultValue: "atendimento",
        helper: "Nome do papel (sem diferenciar maiúsculas). O encaminhamento vai para a pessoa mais antiga da empresa com esse papel; sem ninguém com o papel, o encaminhamento é registrado sem destinatário e aparece para quem audita a NAY.",
      },
      {
        key: "ia.atendimento.mensagem_encaminhamento",
        label: "Texto ao cliente quando o pedido vai para um atendente",
        type: "text",
        defaultValue: "Registrei o seu pedido e um atendente da equipe vai retornar para você. Não posso informar valores, descontos, prazos ou condições por aqui.",
        helper: "Até 500 caracteres. Não escreva valores nem promessas: este texto é enviado como está.",
      },
      {
        key: "ia.atendimento.mensagem_fora_do_escopo",
        label: "Texto ao cliente quando o pedido foge do que a NAY pode fazer",
        type: "text",
        defaultValue: "Isso foge do que este assistente pode fazer.",
        helper: "Até 300 caracteres.",
      },
      {
        key: "ia.atendimento.mensagem_sem_promessa",
        label: "Texto ao cliente quando a resposta da NAY continha uma promessa",
        type: "text",
        defaultValue: "Não posso assumir compromissos em nome da empresa. Um atendente pode confirmar isso com você.",
        helper: "Até 300 caracteres.",
      },
    ],
  },
];
