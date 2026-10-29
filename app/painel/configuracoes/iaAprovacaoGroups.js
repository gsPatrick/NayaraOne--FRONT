// Parâmetros da aprovação humana das ações da NAY (Marco 9, M9-D019). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_APROVACAO_GROUPS = [
  {
    title: "Ações que a NAY propõe",
    subtitle: "A NAY nunca paga, assina, publica nem altera permissão ou banco sozinha: ela monta uma proposta e uma pessoa autorizada decide. Aqui você escolhe o quanto dessa fila pode ser liberado.",
    fields: [
      {
        key: "ia.escrita_direta_baixo_risco",
        label: "Permitir que a NAY execute direto uma ação de baixo risco",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: toda ação que a NAY pede vira proposta para aprovação. Ligado, só ações de risco baixo ou médio, fora de financeiro, jurídico, banco, permissões e publicação, executam direto (por exemplo, criar uma tarefa de retorno para quem está conversando com a NAY).",
      },
      {
        key: "ia.financeira.permitir_proposta_pagamento",
        label: "Permitir que a NAY proponha a intenção de pagamento de um lançamento",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: o pedido \"pague o boleto\" é recusado e a pessoa é orientada a usar a rota de pagamentos do Financeiro. Ligado, a NAY só cria uma proposta; o pagamento continua exigindo as aprovações e o código de segurança do Financeiro.",
      },
    ],
  },
];
