// Segmentação sem dado sensível (Marco 9, M9-D419). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_SEGMENTACAO_GROUPS = [
  {
    title: "Campos que nunca servem para segmentar",
    subtitle: "Dado sensível não pode ser critério de público de campanha. Se um filtro de público usar qualquer um destes campos (em qualquer nível do filtro), a campanha é recusada com o aviso de que o critério usa dado sensível. A lista vale para a empresa toda.",
    fields: [
      {
        key: "marketing.segment.campos_proibidos",
        label: "Campos proibidos como critério de segmentação",
        type: "text",
        defaultValue: "renda_exata, renda, saude, deficiencia, cpf, cnpj, rg, documento, restricao_credito, divida, score_credito, orientacao_sexual, religiao, etnia",
        helper: "Nomes de campo separados por vírgula, em minúsculas, com números e _ (ex.: renda_exata, cpf). Pelo menos um nome.",
      },
    ],
  },
];
