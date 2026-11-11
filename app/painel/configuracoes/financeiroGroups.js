// Parâmetros do Financeiro (Marco 4) que o administrador controla na aba "Financeiro". O caderno do Marco 4 pede cada controle e diz que ele é
// configurável, mas não traz os números: o padrão mostrado aqui é o mesmo que a API usa enquanto a empresa não grava nada, e a faixa é a mesma que a
// API confere (SETTINGS_SCHEMA, src/features/finance/finance.settings.js). Valor fora da faixa é recusado pela API.
export const FINANCEIRO_GROUPS = [
  {
    title: "Conciliação manual recorrente",
    subtitle:
      "O caderno do Marco 4 (§17) pede um alerta para a gerência quando a equipe concilia à mão com frequência, sinal de que o extrato ou os lançamentos estão chegando com dados ruins. O caderno não fixa os números; o padrão é 3 conciliações feitas à mão em 30 dias. O alerta aparece nos casos de antifraude e no relatório semanal.",
    fields: [
      {
        key: "finance.antifraud_manual_reconciliation_min_count",
        label: "Conciliações feitas à mão que disparam o alerta",
        type: "integer",
        defaultValue: 3,
        min: 1,
        max: 100,
        helper: "Padrão: 3. Ao chegar a este número dentro do período abaixo, o sistema abre um alerta para a gerência (um por período).",
      },
      {
        key: "finance.antifraud_manual_reconciliation_window_days",
        label: "Período considerado (dias)",
        type: "integer",
        defaultValue: 30,
        min: 1,
        max: 365,
        helper: "Padrão: 30 dias. Contam as conciliações feitas à mão nos últimos dias informados aqui.",
      },
    ],
  },
  {
    title: "Conciliação automática",
    subtitle:
      "O caderno do Marco 4 (§11) diz que a correspondência exata, vinda de fonte confiável, é confirmada sozinha; a ambígua nunca é; e a forte (valor, cliente ou fornecedor, referência e data batendo) é \"automática ou revisão, conforme a regra\". Aqui você escolhe a regra da correspondência forte.",
    fields: [
      {
        key: "finance.reconciliation.auto_strong",
        label: "Confirmar sozinha a correspondência forte",
        type: "boolean",
        defaultValue: false,
        helper: "Padrão: desligado. Desligado, a correspondência forte fica esperando alguém da equipe confirmar.",
      },
    ],
  },
  {
    title: "Antifraude de pagamentos",
    subtitle:
      "O caderno do Marco 4 (§17) pede espera ou aprovação extra para conta bancária nova e revisão de valor fora do padrão, e diz que isso é configurável, sem fixar os números. Estes valores valem quando a regra de antifraude de pagamento está ativa na empresa; sem ela, o sistema usa os mesmos padrões abaixo.",
    fields: [
      {
        key: "finance.bank_account_cooldown_hours",
        label: "Espera de conta bancária nova ou alterada (horas)",
        type: "integer",
        defaultValue: 48,
        min: 0,
        max: 720,
        helper: "Padrão: 48 horas. Durante a espera, a conta não recebe pagamento. Zero tira a espera.",
      },
      {
        key: "finance.antifraud_new_account_threshold",
        label: "Primeiro pagamento a uma conta: valor a partir do qual fica retido para revisão (R$)",
        type: "decimal",
        defaultValue: 10000,
        min: 0,
        max: 999999999.99,
        maxDecimals: 2,
        helper: "Padrão: R$ 10.000,00. Vale para a conta bancária que ainda não recebeu nenhum pagamento; o lançamento só é pago depois que alguém da equipe revisar.",
      },
      {
        key: "finance.antifraud_history_multiplier",
        label: "Valor fora do padrão: quantas vezes a média que deixa o pagamento retido",
        type: "decimal",
        defaultValue: 3,
        min: 1,
        max: 100,
        maxDecimals: 2,
        helper: "Padrão: 3 vezes. Compara com a média dos pagamentos já feitos à mesma conta bancária; acima disso, o lançamento só é pago depois que alguém da equipe revisar.",
      },
    ],
  },
];

export const FINANCEIRO_FIELDS = FINANCEIRO_GROUPS.flatMap((group) => group.fields);

// A tela lê só as chaves desta aba (nunca as credenciais do banco, que também começam com "finance.").
export const FINANCEIRO_PREFIXES = ["finance.antifraud_", "finance.bank_account_cooldown_hours", "finance.reconciliation."];
