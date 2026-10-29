// Parâmetros do orçamento de uso da NAY (Marco 9, M9-D014). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_ORCAMENTO_GROUPS = [
  {
    title: "Orçamento de uso da NAY",
    subtitle: "Cada empresa define quanto pode gastar com a NAY por mês, por agente e por modelo (API: /v1/ai/budgets). Aqui ficam as regras de aviso e de degradação.",
    fields: [
      {
        key: "ia.orcamento.limiares",
        label: "Avisos de consumo do orçamento (% do limite)",
        type: "text",
        defaultValue: "50,75,90,100",
        helper: "De 1 a 10 porcentagens inteiras, crescentes, separadas por vírgula. Cada uma avisa uma vez por mês quem tem permissão de orçamento. Um orçamento pode ter limiares próprios.",
      },
      {
        key: "ia.orcamento.acao_ao_100",
        label: "Ao chegar em 100% do orçamento (agentes não críticos)",
        type: "text",
        defaultValue: "BLOCK",
        helper: "BLOCK bloqueia as respostas por modelo (padrão, o mais seguro em custo); DEGRADE segue só com regra e resposta guardada. Agentes críticos seguem só com modelo pequeno.",
      },
      {
        key: "ia.orcamento.limiar_degradacao",
        label: "A partir de quantos % agentes não críticos só usam respostas simples",
        type: "integer",
        min: 1,
        max: 100,
        defaultValue: 90,
        helper: "Número inteiro de 1 a 100. Vale só para a degradação; retirar o 90 dos avisos não a desliga.",
      },
    ],
  },
];
