// Parâmetros da NAY Comercial (Marco 9, M9-D034): os prazos de alerta do CRM, o tamanho da lista do Radar, a liberação das propostas e as
// listas de palavras da fronteira do agente. Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_COMERCIAL_GROUPS = [
  {
    title: "NAY Comercial: alertas e listas",
    subtitle: "A NAY Comercial resume a oportunidade, sugere a próxima ação e lista os imóveis do Radar, sempre só consultando. Aqui ficam os prazos das regras de próxima ação e o tamanho das listas.",
    fields: [
      {
        key: "ia.comercial.dias_sem_contato_alerta",
        label: "Dias sem contato para sugerir retomar o contato",
        type: "integer",
        min: 1,
        max: 365,
        defaultValue: 7,
        helper: "Número inteiro de 1 a 365. Passando desse número de dias sem mensagem ou visita, a sugestão é Retomar contato.",
      },
      {
        key: "ia.comercial.dias_proposta_sem_resposta",
        label: "Dias de proposta enviada sem resposta para sugerir follow-up",
        type: "integer",
        min: 1,
        max: 365,
        defaultValue: 5,
        helper: "Número inteiro de 1 a 365. Proposta enviada há mais dias que isso, sem retorno do cliente, gera a sugestão Fazer follow-up da proposta.",
      },
      {
        key: "ia.comercial.radar_max_imoveis",
        label: "Máximo de imóveis do Radar na resposta",
        type: "integer",
        min: 1,
        max: 50,
        defaultValue: 10,
        helper: "Número inteiro de 1 a 50. Os imóveis de maior pontuação aparecem primeiro; o que passar do limite vira o aviso de quantos mais existem.",
      },
      {
        key: "ia.comercial.resumo_max_interacoes",
        label: "Interações recentes consideradas no resumo",
        type: "integer",
        min: 1,
        max: 20,
        defaultValue: 5,
        helper: "Número inteiro de 1 a 20. Quantas das últimas mensagens e visitas entram no resumo da oportunidade.",
      },
    ],
  },
  {
    title: "NAY Comercial: propostas de tarefa",
    subtitle: "No piloto a NAY Comercial não cria nada: só consulta e sugere. As propostas de tarefa de follow-up só podem ser liberadas depois que a avaliação do agente passar e uma pessoa homologar a versão ativa.",
    fields: [
      {
        key: "ia.comercial.permitir_propostas",
        label: "Permitir que a NAY Comercial proponha tarefas de follow-up",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão. Para ligar, a versão ativa da NAY Comercial precisa ter avaliação aprovada e homologação de uma pessoa; sem isso o sistema recusa. Ligado, a tarefa continua dependendo da aprovação de uma pessoa.",
      },
    ],
  },
  {
    title: "NAY Comercial: palavras da fronteira",
    subtitle: "Listas de palavras ou trechos separados por vírgula (sem diferenciar maiúsculas nem acentos) que decidem o que a NAY Comercial atende e o que ela recusa sem consultar nada.",
    fields: [
      {
        key: "ia.comercial.termos_escopo",
        label: "Assuntos que a NAY Comercial atende",
        type: "text",
        defaultValue: "resum,sugir,sugest,proxima,listar,liste,rascunh,descreva,recuper,retom,oportunidade,oportunidades,cliente,clientes,lead,leads,corretor,funil,pipeline,etapa,contato,interacao,interacoes,proposta,propostas,visita,visitas,radar,imovel,imoveis,follow,retomar,recuperacao,descricao,anuncio,negociacao,documento,documentos pendentes,tarefa",
        helper: "Lista separada por vírgula. Pedido sem nenhuma dessas palavras é respondido como fora do que o assistente pode fazer.",
      },
      {
        key: "ia.comercial.proibicao.criar_tarefa",
        label: "Pedidos para criar tarefa (recusados)",
        type: "text",
        defaultValue: "crie uma tarefa,criar uma tarefa,crie tarefa,criar tarefa,cria uma tarefa,agende uma tarefa,agendar uma tarefa,crie um follow,criar um follow,crie um lembrete,criar um lembrete,registre uma tarefa,registrar uma tarefa",
        helper: "Lista separada por vírgula. Enquanto as propostas estiverem desligadas, estes pedidos recebem a resposta de que a NAY só consulta e sugere.",
      },
      {
        key: "ia.comercial.proibicao.alterar_etapa",
        label: "Pedidos para mudar a etapa (recusados)",
        type: "text",
        defaultValue: "mude a etapa,mudar a etapa,altere a etapa,alterar a etapa,troque a etapa,trocar a etapa,mova a oportunidade,mover a oportunidade,avance a oportunidade,avancar a oportunidade,marque como ganha,marcar como ganha,marque como perdida,marcar como perdida,feche a oportunidade,fechar a oportunidade,arquive a oportunidade,arquivar a oportunidade",
        helper: "Lista separada por vírgula. A mudança de etapa é sempre feita por uma pessoa no CRM.",
      },
      {
        key: "ia.comercial.proibicao.enviar_mensagem",
        label: "Pedidos para enviar mensagem (recusados)",
        type: "text",
        defaultValue: "envie a mensagem,enviar a mensagem,envie uma mensagem,enviar uma mensagem,mande a mensagem,mandar a mensagem,mande uma mensagem,mandar uma mensagem,envie um whatsapp,enviar um whatsapp,mande um whatsapp,envie um e-mail,enviar um e-mail,mande um e-mail,dispare a mensagem,disparar a mensagem",
        helper: "Lista separada por vírgula. A NAY só redige o rascunho; o envio é de uma pessoa.",
      },
      {
        key: "ia.comercial.proibicao.publicar_descricao",
        label: "Pedidos para publicar descrição (recusados)",
        type: "text",
        defaultValue: "publique a descricao,publicar a descricao,publique o anuncio,publicar o anuncio,atualize o anuncio,atualizar o anuncio,salve a descricao,salvar a descricao,grave a descricao,gravar a descricao",
        helper: "Lista separada por vírgula. A NAY só redige o rascunho; a publicação é de uma pessoa.",
      },
    ],
  },
];
