// Kill switch do Marketing (Marco 9, M9-D425). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_KILLSWITCH_GROUPS = [
  {
    title: "Kill switch do Marketing",
    subtitle: "Botão de emergência das ações de saída automáticas (mensagens, posts, e-mails e publicações): pode ser ligado para tudo, por canal, por campanha ou por automação, sem apagar nenhuma configuração. Ligar não exige MFA; reativar exige MFA, motivo e fica na auditoria.",
    fields: [
      {
        key: "marketing.killswitch.motivo_min_caracteres",
        label: "Mínimo de caracteres do motivo ao ligar ou reativar",
        type: "integer",
        defaultValue: 10,
        helper: "Número inteiro de 3 a 500. O motivo é obrigatório nas duas ações e fica na auditoria.",
      },
    ],
  },
];
