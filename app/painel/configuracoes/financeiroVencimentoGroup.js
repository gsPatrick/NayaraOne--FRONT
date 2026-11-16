// Vencimento das contas a pagar que o próprio sistema gera, sem ninguém informar data (decisão do Patrick, 16/11/2026): medição de obra
// aprovada, recebimento de compra confirmado e ressarcimento ou desconto de garantia. Os cadernos não fixam o prazo, então ele é do
// administrador. Mesmas chaves, faixa e padrão da API (GENERATED_DUE_SETTINGS_SCHEMA em
// src/modules/finance/application/services/generated-entry-due-settings.js).
const DAYS = { type: "integer", min: 0, max: 365, defaultValue: 30 };

export const FINANCEIRO_VENCIMENTO_PREFIX = "financeiro.vencimento.";

export const FINANCEIRO_VENCIMENTO_GROUP = {
  title: "Vencimento das contas a pagar geradas pelo sistema",
  subtitle:
    "Algumas contas a pagar nascem sozinhas, de outro módulo (Obras e Compras). O caderno do Marco 4 e os de Obras e Compras não dizem em quantos dias elas vencem: defina aqui. O prazo conta em dias corridos a partir do fato, no calendário de São Paulo; 0 faz a conta vencer no próprio dia. Vale para as contas criadas depois da alteração.",
  fields: [
    {
      key: "financeiro.vencimento.medicao_aprovada_dias",
      label: "Medição de obra aprovada: vence em quantos dias",
      ...DAYS,
      helper: "Padrão: 30 dias depois da aprovação da medição.",
    },
    {
      key: "financeiro.vencimento.recebimento_compra_dias",
      label: "Recebimento de compra confirmado: vence em quantos dias",
      ...DAYS,
      helper: "Padrão: 30 dias depois da confirmação do recebimento. Se o valor for recalculado por uma divergência, a conta mantém o mesmo vencimento.",
    },
    {
      key: "financeiro.vencimento.resolucao_garantia_dias",
      label: "Ressarcimento ou desconto de garantia: vence em quantos dias",
      ...DAYS,
      helper: "Padrão: 30 dias depois da aprovação da resolução.",
    },
  ],
};
