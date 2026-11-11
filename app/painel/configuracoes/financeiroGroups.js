// Parâmetros do Financeiro (Marco 4) que o administrador controla na aba "Financeiro". O caderno do Marco 4 pede cada controle e diz que ele é
// configurável, mas não traz os números: o padrão mostrado aqui é o da decisão DEC-007, o mesmo que a API usa enquanto a empresa não grava nada, e a
// faixa é a mesma que a API confere (SETTINGS_SCHEMA, src/modules/finance/application/services/finance-settings.js). Valor fora da faixa é recusado pela API.
// Os campos marcados "exige verificação em duas etapas" só gravam com o MFA recente de quem altera (a API pede o código e a tela abre o modal).
import { APROVACAO_GROUPS, APROVACAO_PREFIXES } from "./financeiroAprovacaoGroups";

const MFA = " Alterar exige a verificação em duas etapas (código do MFA).";

export const FINANCEIRO_GROUPS = [
  {
    title: "Conciliação manual recorrente",
    subtitle:
      "O caderno do Marco 4 (§17) pede um alerta para a gerência quando a equipe concilia à mão com frequência, sinal de que o extrato ou os lançamentos estão chegando com dados ruins. O caderno não fixa os números; a decisão DEC-007 definiu 5 conciliações à mão pela mesma pessoa em 7 dias ou mais de 30% das conciliações do mês, e a regra que já existia (3 em 30 dias na empresa) continua valendo. O alerta aparece nos casos de antifraude e no relatório semanal.",
    fields: [
      {
        key: "antifraude.conciliacao_manual_usuario_7d",
        label: "Conciliações à mão pela mesma pessoa em 7 dias que disparam o alerta",
        type: "integer",
        defaultValue: 5,
        min: 1,
        max: 100,
        helper: "Padrão: 5. Ao chegar a este número em 7 dias, o sistema abre um alerta ligado à pessoa (um a cada 7 dias).",
      },
      {
        key: "antifraude.conciliacao_manual_percentual_mes",
        label: "Percentual do mês conciliado à mão acima do qual há alerta (%)",
        type: "decimal",
        defaultValue: 30,
        min: 1,
        max: 100,
        maxDecimals: 2,
        helper: "Padrão: 30%. Acima deste percentual das conciliações do mês feitas à mão, o sistema abre um alerta da empresa (um por mês). Em 100 o alerta do mês não dispara.",
      },
      {
        key: "finance.antifraud_manual_reconciliation_min_count",
        label: "Conciliações feitas à mão na empresa que disparam o alerta",
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
        helper: `Padrão: desligado. Desligado, a correspondência forte fica esperando alguém da equipe confirmar.${MFA}`,
      },
    ],
  },
  {
    title: "Antifraude de pagamentos",
    subtitle:
      "O caderno do Marco 4 (§17) pede espera ou aprovação extra para conta bancária nova, revisão de valor fora do padrão, verificação de fornecedor novo de alto valor e bloqueio de pagamento duplicado, e diz que isso é configurável, sem fixar os números. Os padrões são os da decisão DEC-007.",
    fields: [
      {
        key: "finance.bank_account_cooldown_hours",
        label: "Espera de conta bancária nova ou alterada (horas)",
        type: "integer",
        defaultValue: 48,
        min: 0,
        max: 720,
        helper: `Padrão: 48 horas. Durante a espera, a conta não recebe pagamento. Zero tira a espera.${MFA}`,
      },
      {
        key: "finance.antifraud_new_account_threshold",
        label: "Primeiro pagamento a uma conta: valor a partir do qual fica retido para revisão (R$)",
        type: "decimal",
        defaultValue: 5000,
        min: 0,
        max: 999999999.99,
        maxDecimals: 2,
        helper: `Padrão: R$ 5.000,00. Vale para a conta bancária que ainda não recebeu nenhum pagamento; o lançamento só é pago depois que alguém da equipe revisar.${MFA}`,
      },
      {
        key: "finance.antifraud_history_multiplier",
        label: "Valor fora do padrão: quantas vezes a média que deixa o pagamento retido para revisão",
        type: "decimal",
        defaultValue: 3,
        min: 1,
        max: 100,
        maxDecimals: 2,
        helper: "Padrão: 3 vezes. Compara com a média dos pagamentos já feitos à mesma conta bancária; acima disso, o lançamento só é pago depois que alguém da equipe revisar. Não pode passar do múltiplo que bloqueia.",
      },
      {
        key: "antifraude.outlier_bloqueio_multiplicador",
        label: "Valor fora do padrão: quantas vezes a média que bloqueia o pagamento",
        type: "decimal",
        defaultValue: 10,
        min: 1,
        max: 1000,
        maxDecimals: 2,
        helper: "Padrão: 10 vezes. Acima disso, além de ficar retido, o pagamento não vira intenção nem pedido de aprovação até alguém da equipe revisar. Não pode ser menor que o múltiplo de revisão.",
      },
      {
        key: "antifraude.duplicidade_janela_dias",
        label: "Pagamento duplicado: dias em que o mesmo favorecido, valor e vencimento é bloqueado",
        type: "integer",
        defaultValue: 90,
        min: 1,
        max: 365,
        helper: "Padrão: 90 dias. Um pagamento com a mesma conta de destino, o mesmo valor e o mesmo vencimento de outro (não cancelado) lançado neste período fica retido e bloqueado até a revisão.",
      },
      {
        key: "antifraude.fornecedor_novo_dias",
        label: "Fornecedor novo: dias de cadastro da conta do favorecido",
        type: "integer",
        defaultValue: 30,
        min: 1,
        max: 365,
        helper: "Padrão: 30 dias. Conta de favorecido cadastrada há menos dias que isto (ou sem pagamento anterior) conta como fornecedor novo.",
      },
      {
        key: "antifraude.fornecedor_novo_valor_minimo",
        label: "Fornecedor novo: valor a partir do qual exige verificação (R$)",
        type: "decimal",
        defaultValue: 20000,
        min: 0.01,
        max: 999999999.99,
        maxDecimals: 2,
        helper: "Padrão: R$ 20.000,00. Pagamento a fornecedor novo a partir deste valor fica retido para a verificação do cadastro antes de pagar.",
      },
    ],
  },
  {
    title: "Estorno frequente",
    subtitle:
      "O caderno do Marco 4 (§17) pede um caso de anomalia quando há estornos frequentes. A decisão DEC-007 definiu 3 estornos pela mesma pessoa e 5 na empresa em 30 dias; como a regra que já existia abria o caso com 3 estornos na empresa, esse continua sendo o padrão da empresa até você mudar aqui.",
    fields: [
      {
        key: "antifraude.estorno_frequente_usuario_30d",
        label: "Estornos pela mesma pessoa em 30 dias que abrem o caso",
        type: "integer",
        defaultValue: 3,
        min: 1,
        max: 100,
        helper: "Padrão: 3. Ao chegar a este número de estornos feitos pela mesma pessoa em 30 dias, o sistema abre um caso de estorno frequente.",
      },
      {
        key: "antifraude.estorno_frequente_empresa_30d",
        label: "Estornos na empresa em 30 dias que abrem o caso",
        type: "integer",
        defaultValue: 3,
        min: 1,
        max: 1000,
        helper: "Padrão: 3. Ao chegar a este número de estornos na empresa em 30 dias, o sistema abre um caso de estorno frequente (a decisão DEC-007 sugere 5; o padrão fica no valor mais protetor, o que já valia).",
      },
    ],
  },
  // Autorização do pagamento, do estorno e da reabertura de período (DEC-003, DEC-004): grupos em arquivo próprio.
  ...APROVACAO_GROUPS,
];

export const FINANCEIRO_FIELDS = FINANCEIRO_GROUPS.flatMap((group) => group.fields);

// A tela lê só as chaves desta aba (nunca as credenciais do banco, que também começam com "finance.").
export const FINANCEIRO_PREFIXES = ["finance.antifraud_", "finance.bank_account_cooldown_hours", "finance.reconciliation.", "antifraude.", ...APROVACAO_PREFIXES];
