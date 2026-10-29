// Parâmetros do roteamento de modelo (Marco 9, M9-D012). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_ROTEAMENTO_GROUPS = [
  {
    title: "Roteamento de modelo da NAY",
    subtitle: "A NAY escolhe o caminho mais barato que resolve com segurança: regra do sistema, resposta guardada, modelo pequeno e, só quando necessário, modelo avançado.",
    fields: [
      {
        key: "ia.router.resumo_simples_max_tokens",
        label: "Tamanho máximo da entrada para o modelo pequeno (tokens)",
        type: "integer",
        min: 1,
        max: 1000000,
        defaultValue: 2000,
        helper: "Número inteiro. Tarefas simples com entrada maior que isso vão ao modelo avançado.",
      },
      {
        key: "ia.router.confianca_minima",
        label: "Confiança mínima da resposta do modelo pequeno",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.6,
        helper: "Número de 0 a 1 (use vírgula). Abaixo disso, ou com a resposta fora do formato, a NAY tenta uma única vez no modelo avançado.",
      },
      {
        key: "ia.router.escalonar_para_avancado",
        label: "Tentar o modelo avançado quando o pequeno não der conta",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão. Desligado, a resposta do modelo pequeno segue para a validação mesmo com confiança baixa.",
      },
    ],
  },
];
