// Parâmetros da NAY Correspondente (Marco 9, M9-D039). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_CORRESPONDENTE_GROUPS = [
  {
    title: "NAY Correspondente",
    subtitle: "A NAY Correspondente confere pendências, compara simulações já registradas e informa o status do financiamento. Ela nunca decide crédito, não promete taxa, prazo ou parcela, não envia documento ao banco e não altera o caso.",
    fields: [
      {
        key: "ia.correspondente.termos_escopo",
        label: "Termos do assunto da NAY Correspondente",
        type: "text",
        defaultValue: "caso,financiamento,financiar,simulacao,simulacoes,pendencia,pendente,documento,exigencia,requisito,checklist,status,etapa,andamento,parado,banco,provider,proposta,correspondente,credito,parcela,taxa,prazo,politica,regra,norma,procedimento,situacao,proponente,imovel",
        helper: "Pedido sem nenhum destes termos é recusado com \"Isso foge do que este assistente pode fazer.\". Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.proibicao.decidir_credito",
        label: "Pedidos para decidir ou prever aprovação de crédito",
        type: "text",
        defaultValue: "aprovar o credito,aprove o credito,aprovar credito,aprove credito,reprovar o credito,reprove o credito,negar o credito,negue o credito,conceder o credito,conceda o credito,liberar o credito,libere o credito,aprovar o financiamento,aprove o financiamento,reprovar o financiamento,reprove o financiamento,sera aprovado,sera aprovada,vai ser aprovado,vai ser aprovada,sera reprovado,sera reprovada,sera negado,sera negada,vai conseguir o financiamento,vai conseguir o credito,vai conseguir aprovar,chance de aprovacao,chances de aprovacao,probabilidade de aprovacao,devo aprovar,posso aprovar,classifique o credito,classificar o credito,avalie o credito,avaliar o credito,analise o credito,analisar o credito,score de credito",
        helper: "A NAY Correspondente nunca decide nem prevê aprovação de crédito. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.proibicao.prometer_condicoes",
        label: "Pedidos para prometer ou estimar taxa, prazo e parcela",
        type: "text",
        defaultValue: "prometa,prometer,promete,garanta,garantir,assegure,simule,simular,estime,estimar,calcule a parcela,calcular a parcela,calcule a taxa,calcule o prazo,qual taxa vou conseguir,qual a taxa que vou,qual taxa o cliente vai,qual sera a taxa,qual sera a parcela,qual sera o prazo,quanto vai ficar a parcela,quanto ficara a parcela,taxa que vou conseguir,taxa que ele vai conseguir,taxa que o cliente vai conseguir,projete a parcela,projetar a parcela,preveja a taxa",
        helper: "A NAY só mostra valores de simulações já registradas. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.proibicao.enviar_documento_banco",
        label: "Pedidos para enviar documento ao banco",
        type: "text",
        defaultValue: "enviar ao banco,envie ao banco,enviar para o banco,envie para o banco,mandar ao banco,mande ao banco,mandar para o banco,mande para o banco,enviar o documento ao,envie o documento ao,enviar documento ao,envie documento ao,enviar os documentos ao,envie os documentos ao,enviar o caso ao,envie o caso ao,submeter o caso,submeta o caso,submeter a proposta,submeta a proposta,protocolar no banco,protocole no banco,encaminhar ao banco,encaminhe ao banco,encaminhar para o banco,encaminhe para o banco,envie o documento,enviar o documento,envie os documentos,enviar os documentos,envie documento,enviar documento,mande o documento,mandar o documento,mande os documentos,mandar os documentos,envie a documentacao,enviar a documentacao,envie o caso,enviar o caso,envie a proposta,enviar a proposta,submeta,submeter,protocole,protocolar",
        helper: "O envio ao banco é sempre de uma pessoa. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.proibicao.chamar_provider",
        label: "Pedidos para chamar o provider de financiamento",
        type: "text",
        defaultValue: "chame o provider,chamar o provider,chame o provedor,chamar o provedor,acione o provider,acionar o provider,acione o banco,acionar o banco,consulte o provider,consultar o provider,consulte o provedor,consulte o banco,consultar o banco,ligue para o banco,ligar para o banco,contate o banco,contatar o banco",
        helper: "A NAY trabalha só com o que já está registrado no caso. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.proibicao.alterar_status",
        label: "Pedidos para alterar o status do caso",
        type: "text",
        defaultValue: "alterar o status,altere o status,mudar o status,mude o status,atualizar o status,atualize o status,avancar o status,avance o status,definir o status,defina o status,alterar a etapa,altere a etapa,mudar a etapa,mude a etapa,avancar o caso,avance o caso,cancelar o caso,cancele o caso,reabrir o caso,reabra o caso,concluir o caso,conclua o caso,marcar o caso como,marque o caso como,colocar o caso em,coloque o caso em,mover o caso,mova o caso",
        helper: "A mudança de status é sempre de uma pessoa. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.termos_resposta_proibida",
        label: "Trechos que a NAY não pode dizer na resposta",
        type: "text",
        defaultValue: "sera aprovado,sera aprovada,vai ser aprovado,vai ser aprovada,sera reprovado,sera reprovada,vai ser reprovado,aprovacao garantida,aprovacao certa,aprovacao assegurada,voce vai conseguir,o cliente vai conseguir,ele vai conseguir,ela vai conseguir,o proponente vai conseguir,chance de aprovacao,chances de aprovacao,garanto,garantimos,prometo,prometemos,a taxa sera,sua taxa sera,a parcela sera,sua parcela sera,a taxa vai ficar,a parcela vai ficar,o prazo sera,o prazo vai ser,recomendo aprovar,recomendo a simulacao,recomendo o banco,recomendo a opcao,sugiro aprovar,sugiro a simulacao,melhor opcao de credito",
        helper: "Se a resposta gerada tiver algum destes trechos (promessa de aprovação, taxa, prazo ou parcela), ela é trocada por um aviso. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.correspondente.max_casos_parados",
        label: "Máximo de casos parados listados na resposta",
        type: "integer",
        min: 1,
        max: 200,
        defaultValue: 20,
        helper: "Número inteiro. O limiar de dias para o caso ser considerado parado é o do Correspondente (Parâmetros do Correspondente)."
      },
      {
        key: "ia.correspondente.max_simulacoes",
        label: "Máximo de simulações comparadas na resposta",
        type: "integer",
        min: 1,
        max: 50,
        defaultValue: 10,
        helper: "Número inteiro. Só entram simulações já registradas no caso."
      }
    ],
  },
];
