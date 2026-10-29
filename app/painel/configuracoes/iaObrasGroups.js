// Parâmetros da NAY Obras (Marco 9, M9-D037): o que o agente atende e o que ele recusa. Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_OBRAS_GROUPS = [
  {
    title: "NAY Obras: o que atende e o que recusa",
    subtitle: "A NAY Obras é somente leitura: responde sobre progresso, custos, diário, qualidade e pós-obra, sempre com fonte. Ela nunca altera medição, aprova pagamento a empreiteiro, altera cronograma ou orçamento nem encerra garantia; os termos abaixo definem como esses pedidos são reconhecidos e recusados.",
    fields: [
      {
        key: "ia.nay_obras.termos_escopo",
        label: "Assuntos que a NAY Obras atende",
        type: "text",
        defaultValue: "obra,obras,projeto,cronograma,prazo,atraso,atrasad,custo,orcamento,orcado,realizado,diario,rdo,medicao,qualidade,conformidade,garantia,pos-obra,pos obra,chamado,etapa,empreiteiro,canteiro,engenharia,material,desperdicio,avanco,progresso",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. Pedido sem nenhum desses termos é recusado com \"Isso foge do que este assistente pode fazer.\"",
      },
      {
        key: "ia.nay_obras.proibicao.alterar_medicao",
        label: "Pedidos para alterar medição (recusados)",
        type: "text",
        defaultValue: "alterar a medicao,alterar medicao,altere a medicao,altere medicao,mudar a medicao,mude a medicao,ajustar a medicao,ajuste a medicao,corrigir a medicao,corrija a medicao,aprovar a medicao,aprove a medicao,aprovar medicao,rejeitar a medicao,rejeite a medicao",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Obras só consulta: pedido com um desses termos é recusado e nada é alterado.",
      },
      {
        key: "ia.nay_obras.proibicao.aprovar_pagamento_empreiteiro",
        label: "Pedidos para aprovar pagamento a empreiteiro (recusados)",
        type: "text",
        defaultValue: "aprovar pagamento,aprove o pagamento,aprove pagamento,aprovar o pagamento,liberar pagamento,libere o pagamento,libere pagamento,liberar o pagamento,pagar o empreiteiro,pague o empreiteiro,pagar empreiteiro",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Obras nunca aprova pagamento.",
      },
      {
        key: "ia.nay_obras.proibicao.alterar_cronograma_orcamento",
        label: "Pedidos para alterar cronograma ou orçamento (recusados)",
        type: "text",
        defaultValue: "alterar o cronograma,alterar cronograma,altere o cronograma,altere cronograma,mudar o cronograma,mude o cronograma,adiar a obra,adie a obra,adiar o prazo,adie o prazo,alterar o orcamento,alterar orcamento,altere o orcamento,altere orcamento,mudar o orcamento,mude o orcamento,reduzir o orcamento,aumentar o orcamento,aumente o orcamento",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Obras nunca altera cronograma nem orçamento.",
      },
      {
        key: "ia.nay_obras.proibicao.encerrar_garantia",
        label: "Pedidos para encerrar garantia (recusados)",
        type: "text",
        defaultValue: "encerrar a garantia,encerrar garantia,encerre a garantia,encerre garantia,fechar a garantia,feche a garantia,fechar garantia,dar baixa na garantia,de baixa na garantia",
        helper: "Lista de termos separados por vírgula, sem diferenciar maiúsculas nem acentos. A NAY Obras nunca encerra garantia.",
      },
      {
        key: "ia.nay_obras.max_itens_lista",
        label: "Máximo de itens por lista",
        type: "integer",
        min: 1,
        max: 100,
        defaultValue: 20,
        helper: "Número inteiro de 1 a 100. Vale para obras atrasadas, diários, não conformidades e chamados de garantia numa resposta.",
      },
      {
        key: "ia.nay_obras.diario_janela_dias",
        label: "Janela do diário de obra (dias)",
        type: "integer",
        min: 1,
        max: 90,
        defaultValue: 15,
        helper: "Número inteiro de 1 a 90. Quantos dias para trás a NAY Obras olha o diário ao resumi-lo.",
      },
    ],
  },
];
