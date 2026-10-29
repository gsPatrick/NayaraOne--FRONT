// Parâmetros do fallback seguro de modelo (Marco 9, M9-D013). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_FALLBACK_GROUPS = [
  {
    title: "Troca de modelo quando o principal cai",
    subtitle: "Se o modelo principal fica fora do ar, a NAY só usa outro que seja tão seguro quanto ele. Sem um assim, ela para e avisa, sem executar nenhuma ação.",
    fields: [
      {
        key: "ia.fallback.max_saltos",
        label: "Máximo de trocas de modelo por consulta",
        type: "integer",
        min: 1,
        max: 5,
        defaultValue: 2,
        helper: "Número inteiro de 1 a 5. Depois desse número de quedas seguidas, a consulta falha em vez de continuar tentando.",
      },
      {
        key: "ia.fallback.exigir_avaliacao_verde",
        label: "Exigir avaliação aprovada do modelo reserva",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão. O modelo reserva só entra se já passou na avaliação do agente; desligado, vale só a equivalência de segurança.",
      },
    ],
  },
];
