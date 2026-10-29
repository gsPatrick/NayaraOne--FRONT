// Parâmetros da NAY Jurídica (Marco 9, M9-D038): o que o agente atende e o que ele recusa. Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_JURIDICA_GROUPS = [
  {
    title: "NAY Jurídica: o que atende e o que recusa",
    subtitle: "A NAY Jurídica resume contratos, compara versões, monta o checklist de requisitos e rascunha minutas, sem decisão jurídica final. Ela nunca decide validade, aprova ou assina, envia para assinatura, altera versão assinada, afirma prazo legal como definitivo nem dá parecer final; os termos abaixo definem como esses pedidos são reconhecidos.",
    fields: [
      {
        key: "ia.nay_juridica.termos_escopo",
        label: "Assuntos que a NAY Jurídica atende",
        type: "text",
        defaultValue: "contrato,clausula,versao,versoes,minuta,aditivo,rascunho,checklist,requisito,prazo,vencimento,juridic,assinatura,assinado,assinada,rescisao,locacao,documento,parecer,validade,valido,valida,processo,legal",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. Pedido sem nenhum desses termos é recusado com \"Isso foge do que este assistente pode fazer.\"",
      },
      {
        key: "ia.nay_juridica.proibicao.decidir_validade",
        label: "Pedidos para decidir a validade do contrato",
        type: "text",
        defaultValue: "esta valido,esta valida,ja esta valido,ja esta valida,validar o contrato,valide o contrato,declare valido,declarar valido,contrato valido,contrato e valido",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Jurídica não decide: lista os requisitos satisfeitos e pendentes e devolve a decisão ao responsável jurídico.",
      },
      {
        key: "ia.nay_juridica.proibicao.aprovar_ou_assinar",
        label: "Pedidos para aprovar ou assinar contrato (recusados)",
        type: "text",
        defaultValue: "aprovar o contrato,aprove o contrato,aprovar contrato,aprove contrato,assinar o contrato,assine o contrato,assinar contrato,assine contrato,assine por mim,aprovar a minuta,aprove a minuta",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Jurídica nunca aprova nem assina.",
      },
      {
        key: "ia.nay_juridica.proibicao.enviar_para_assinatura",
        label: "Pedidos para enviar contrato para assinatura (recusados)",
        type: "text",
        defaultValue: "enviar para assinatura,envie para assinatura,enviar o contrato para assinatura,envie o contrato para assinatura,mandar para assinatura,mande para assinatura,disparar a assinatura,dispare a assinatura,enviar ao clicksign,enviar ao zapsign",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. O envio é feito por uma pessoa autorizada.",
      },
      {
        key: "ia.nay_juridica.proibicao.alterar_versao_assinada",
        label: "Pedidos para alterar versão assinada (recusados)",
        type: "text",
        defaultValue: "alterar a versao assinada,altere a versao assinada,alterar versao assinada,altere versao assinada,editar o contrato assinado,edite o contrato assinado,modificar o contrato assinado,modifique o contrato assinado,alterar o contrato assinado,altere o contrato assinado,mudar a versao assinada,mude a versao assinada",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. Versão assinada nunca é alterada pela NAY Jurídica.",
      },
      {
        key: "ia.nay_juridica.proibicao.afirmar_prazo_definitivo",
        label: "Pedidos para afirmar prazo legal como definitivo (recusados)",
        type: "text",
        defaultValue: "prazo definitivo,prazo e definitivo,prazo legal definitivo,garanta o prazo,garantir o prazo,confirme o prazo legal,prazo final garantido,prazo e certo",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. Todo prazo exige a fonte exata e a confirmação humana.",
      },
      {
        key: "ia.nay_juridica.proibicao.parecer_final",
        label: "Pedidos de parecer jurídico final (recusados)",
        type: "text",
        defaultValue: "parecer juridico,parecer final,emita um parecer,emitir parecer,dar parecer,de um parecer,decisao juridica final,decisao final",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Jurídica nunca emite parecer final.",
      },
      {
        key: "ia.nay_juridica.termos_minuta",
        label: "Termos que indicam um pedido de minuta",
        type: "text",
        defaultValue: "minuta,rascunho,rascunhar,redija o contrato,elabore o contrato,redigir o contrato",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. Resposta a pedido de minuta sai marcada \"RASCUNHO — requer revisão jurídica humana\".",
      },
      {
        key: "ia.nay_juridica.max_itens_lista",
        label: "Máximo de itens por lista",
        type: "integer",
        min: 1,
        max: 200,
        defaultValue: 50,
        helper: "Número inteiro de 1 a 200. Vale para trechos comparados, requisitos e prazos numa resposta.",
      },
    ],
  },
];
