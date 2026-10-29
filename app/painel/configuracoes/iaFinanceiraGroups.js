// Parâmetros da NAY Financeira (M9-D036). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_FINANCEIRA_GROUPS = [
  {
    title: "NAY Financeira",
    subtitle: "Tamanho da lista de anomalias e fronteira do agente financeiro. A NAY Financeira explica fluxo, inadimplência, anomalias e projeções e nunca paga. A liberação da proposta de pagamento fica em Aprovação.",
    fields: [
      {
        key: "ia.financeira.anomalias_max_itens",
        label: "Máximo de anomalias listadas",
        type: "integer",
        min: 1,
        max: 200,
        defaultValue: 20,
        helper: "Número inteiro de 1 a 200. Limita quantos casos de anomalia abertos a NAY Financeira lista na resposta."
      },
      {
        key: "ia.financeira.termos_escopo",
        label: "Termos do assunto da Financeira",
        type: "text",
        defaultValue: "fluxo,caixa,saldo,inadimpl,vencid,atraso,atrasad,receber,pagar,pagamento,anomalia,anomalias,projecao,projetar,lancamento,lancamentos,financeir,cobranca,fornecedor,receita,despesa,conciliacao,extrato,antifraude,semana,titulo,titulos,parcela,parcelas,favorecido,conta bancaria,periodo,devedor,devedores,cliente,clientes,recomend",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. Pedido sem nenhum destes termos é recusado como fora do propósito, sem chamar modelo."
      },
      {
        key: "ia.financeira.proibicao.pagar",
        label: "Termos que pedem pagamento",
        type: "text",
        defaultValue: "pague,faca o pagamento,fazer o pagamento,efetue o pagamento,efetuar o pagamento,realize o pagamento,realizar o pagamento,quite,quitar,mande pagar,mandar pagar,transfira,transferir,pagar agora",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. Valem enquanto Financeira - permitir proposta de pagamento estiver desligada: o pedido é recusado e a pessoa é orientada à rota humana de pagamento."
      },
      {
        key: "ia.financeira.proibicao.liquidar",
        label: "Termos que pedem liquidar ou dar baixa",
        type: "text",
        defaultValue: "liquide,liquidar,de baixa,dar baixa,baixe o titulo,baixar o titulo,marque como pago,marcar como pago,marque como liquidado",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Financeira nunca liquida; pedido com estes termos é recusado."
      },
      {
        key: "ia.financeira.proibicao.alterar_favorecido",
        label: "Termos que pedem alterar favorecido",
        type: "text",
        defaultValue: "altere o favorecido,alterar o favorecido,alterar favorecido,troque o favorecido,trocar o favorecido,mude o favorecido,mudar o favorecido",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Financeira nunca altera favorecido; pedido com estes termos é recusado."
      },
      {
        key: "ia.financeira.proibicao.alterar_conta_bancaria",
        label: "Termos que pedem alterar conta bancária",
        type: "text",
        defaultValue: "altere a conta bancaria,alterar a conta bancaria,alterar conta bancaria,troque a conta bancaria,trocar a conta bancaria,mude a conta bancaria,mudar a conta bancaria,altere os dados bancarios,alterar os dados bancarios,altere o pix,alterar o pix",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Financeira nunca altera conta bancária; pedido com estes termos é recusado."
      },
      {
        key: "ia.financeira.proibicao.fechar_periodo",
        label: "Termos que pedem fechar período",
        type: "text",
        defaultValue: "feche o periodo,fechar o periodo,fechar periodo,encerre o periodo,encerrar o periodo,feche o mes,fechar o mes,fechamento do periodo",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Financeira nunca fecha período; pedido com estes termos é recusado."
      },
      {
        key: "ia.financeira.proibicao.criar_lancamento",
        label: "Termos que pedem criar lançamento",
        type: "text",
        defaultValue: "crie um lancamento,criar um lancamento,criar lancamento,crie lancamento,registre um lancamento,registrar um lancamento,inclua um lancamento,incluir um lancamento",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Financeira nunca cria lançamento; pedido com estes termos é recusado."
      }
    ],
  },
];
