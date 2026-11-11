// Relatório semanal de saúde do Financeiro (Caderno M4 §19 "Recebíveis 7/30/60 dias — direitos previstos ponderados por status"). O caderno
// manda ponderar por status mas não diz os pesos: o administrador define aqui, de 0 a 1 (0% a 100%), por status do recebível. Padrão = o que o
// relatório fazia antes (em dia e o saldo do parcialmente recebido contam inteiros; o vencido não conta como entrada provável). A faixa é a
// mesma que a API confere (finance-health-settings.js, decisão DI-M4LR-2).
export const FINANCEIRO_RELATORIO_GROUP = {
  title: "Relatório semanal: recebíveis ponderados",
  subtitle:
    "O caderno do Marco 4 (§19) pede os recebíveis dos próximos 7, 30 e 60 dias ponderados pelo status, e a necessidade para respirar usa as entradas altamente prováveis. O caderno não fixa os pesos: informe de 0 (não conta) a 1 (conta inteiro) para cada status.",
  fields: [
    {
      key: "finance.relatorio.peso_recebivel_em_dia",
      label: "Peso do recebível em dia (0 a 1)",
      type: "decimal",
      defaultValue: 1,
      min: 0,
      max: 1,
      maxDecimals: 2,
      helper: "Padrão: 1 (conta inteiro). Recebível ainda não vencido e sem baixa.",
    },
    {
      key: "finance.relatorio.peso_recebivel_parcial",
      label: "Peso do saldo do recebível parcialmente recebido (0 a 1)",
      type: "decimal",
      defaultValue: 1,
      min: 0,
      max: 1,
      maxDecimals: 2,
      helper: "Padrão: 1 (conta inteiro). Vale para o saldo que falta receber depois de uma baixa parcial.",
    },
    {
      key: "finance.relatorio.peso_recebivel_vencido",
      label: "Peso do recebível vencido (0 a 1)",
      type: "decimal",
      defaultValue: 0,
      min: 0,
      max: 1,
      maxDecimals: 2,
      helper: "Padrão: 0 (vencido não é entrada provável). Entra no total a receber ponderado.",
    },
  ],
};

export const FINANCEIRO_RELATORIO_PREFIX = "finance.relatorio.";

// Ledger (Caderno M4 §7: conta bancária no movimento realizado). No pagamento confirmado pelo banco e no estorno a conta vem sempre; na baixa
// manual o administrador decide se ela passa a ser obrigatória (decisão DI-M4LR-1 na API, ledger-settings.js).
export const FINANCEIRO_LEDGER_GROUP = {
  title: "Ledger: conta bancária na baixa",
  subtitle:
    "O caderno do Marco 4 (§7) registra cada movimento realizado com a conta bancária. No pagamento confirmado pelo banco e no estorno a conta vem sempre; aqui você decide se a baixa manual (recebimento informado, baixa com comprovante) também precisa ter a conta.",
  fields: [
    {
      key: "finance.ledger.conta_bancaria_obrigatoria_na_baixa",
      label: "Exigir a conta bancária em toda baixa",
      type: "boolean",
      defaultValue: false,
      helper: "Padrão: desligado. Ligado, a baixa de lançamento sem conta bancária é recusada até alguém informar a conta.",
    },
  ],
};

export const FINANCEIRO_LEDGER_PREFIX = "finance.ledger.";
