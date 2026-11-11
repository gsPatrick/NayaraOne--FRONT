// Parâmetros da autorização financeira (pagamento, estorno e reabertura de período) da aba "Financeiro". O livro (Marco 4 §2 FIN-005 "Limites
// vêm do Motor de Regras", Guia §4 REG-FIN-002, §8 "Step-up MFA para HIGH/CRITICAL", §16 "Reabertura requer permissão CRITICAL, MFA, motivo e
// auditoria") não traz os números: os padrões são os da DEC-004, da DEC-003 e do catálogo de parâmetros, os mesmos que a API usa enquanto a
// empresa não grava nada (PAYMENT_APPROVAL_SETTINGS_SCHEMA em src/modules/finance/application/services/payment-approval-settings.js da API).
// As faixas valem quando a versão publicada da regra REG-FIN-002 do Motor de Regras não define o risco.
const MFA = " Alterar exige a verificação em duas etapas (código do MFA).";
const MONEY = { type: "decimal", min: 0.01, max: 999999999.99, maxDecimals: 2 };
const APPROVERS = { type: "integer", min: 1, max: 5 };

export const RISK_OPTIONS = [
  { value: "LOW", label: "Baixo" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HIGH", label: "Alto" },
  { value: "CRITICAL", label: "Crítico" },
];

export const APROVACAO_GROUPS = [
  {
    title: "Risco do pagamento por faixa de valor",
    subtitle:
      "O caderno do Marco 4 (§2 e §8) manda o risco do pagamento vir da regra REG-FIN-002 do Motor de Regras. Quando a regra publicada não define o risco, valem estas faixas (decisão DEC-004): até o primeiro limite o risco é baixo, até o segundo é médio, até o terceiro é alto e acima dele é crítico. Cada limite precisa ser maior que o anterior.",
    fields: [
      { key: "pagamentos.faixa.baixo_ate", label: "Risco baixo vai até (R$)", ...MONEY, defaultValue: 5000, order: ["faixa", 0], helper: `Padrão: R$ 5.000,00. Pagamento até este valor tem risco baixo.${MFA}` },
      { key: "pagamentos.faixa.medio_ate", label: "Risco médio vai até (R$)", ...MONEY, defaultValue: 50000, order: ["faixa", 1], helper: `Padrão: R$ 50.000,00. Acima do limite do risco baixo e até este valor, o risco é médio.${MFA}` },
      { key: "pagamentos.faixa.alto_ate", label: "Risco alto vai até (R$)", ...MONEY, defaultValue: 200000, order: ["faixa", 2], helper: `Padrão: R$ 200.000,00. Acima do limite do risco médio e até este valor, o risco é alto; acima dele, crítico.${MFA}` },
    ],
  },
  {
    title: "Quantas pessoas aprovam o pagamento",
    subtitle:
      "O caderno do Marco 4 (§2 FIN-005) pede aprovação conforme o risco, sem fixar quantas pessoas. Aqui fica o número de aprovações, de pessoas diferentes de quem preparou, que cada risco exige antes do pagamento (decisão DEC-004). Um risco nunca pode exigir menos aprovações que o risco abaixo dele.",
    fields: [
      { key: "pagamentos.aprovadores.baixo", label: "Aprovações exigidas no risco baixo", ...APPROVERS, defaultValue: 1, order: ["aprovadores", 0], helper: `Padrão: 1 pessoa.${MFA}` },
      { key: "pagamentos.aprovadores.medio", label: "Aprovações exigidas no risco médio", ...APPROVERS, defaultValue: 1, order: ["aprovadores", 1], helper: `Padrão: 1 pessoa.${MFA}` },
      { key: "pagamentos.aprovadores.alto", label: "Aprovações exigidas no risco alto", ...APPROVERS, defaultValue: 2, order: ["aprovadores", 2], helper: `Padrão: 2 pessoas.${MFA}` },
      { key: "pagamentos.aprovadores.critico", label: "Aprovações exigidas no risco crítico", ...APPROVERS, defaultValue: 2, order: ["aprovadores", 3], helper: `Padrão: 2 pessoas.${MFA}` },
      {
        key: "pagamentos.mfa.aprovacao_medio",
        label: "Pedir a verificação em duas etapas também para aprovar pagamento de risco médio",
        type: "boolean",
        defaultValue: false,
        helper: `Padrão: desligado. Risco alto e crítico sempre pedem a verificação em duas etapas de quem aprova.${MFA}`,
      },
      {
        key: "pagamentos.risco_sem_valor",
        label: "Risco de aprovação de algo sem valor em dinheiro (como dados de conta bancária)",
        type: "select",
        options: RISK_OPTIONS,
        defaultValue: "CRITICAL",
        helper: `Padrão: crítico. Vale para pedidos de aprovação que não têm valor, como a alteração dos dados de uma conta bancária.${MFA}`,
      },
    ],
  },
  {
    title: "Estorno e reabertura de período",
    subtitle:
      "O estorno é pedido por uma pessoa e só é lançado quando outra aprova (decisão DEC-003). Reabrir um mês fechado é uma ação de risco crítico (caderno do Marco 4, §16): pede motivo e a aprovação de outra pessoa, ambas com verificação em duas etapas.",
    fields: [
      {
        key: "financeiro.estorno.aprovador_distinto",
        label: "O estorno precisa ser aprovado por outra pessoa, nunca por quem pediu",
        type: "boolean",
        defaultValue: true,
        helper: `Padrão: ligado. Desligado, quem pediu o estorno também pode aprová-lo.${MFA}`,
      },
      {
        key: "fechamento.reabertura_motivo_minimo_caracteres",
        label: "Tamanho mínimo do motivo para pedir a reabertura de um mês fechado (caracteres)",
        type: "integer",
        defaultValue: 20,
        min: 5,
        max: 500,
        helper: "Padrão: 20 caracteres. O pedido com motivo mais curto é recusado.",
      },
      {
        key: "fechamento.reabertura.aprovadores",
        label: "Aprovações exigidas para reabrir um mês fechado",
        ...APPROVERS,
        defaultValue: 1,
        helper: `Padrão: 1 pessoa além de quem pediu. Atingido este número, o mês reabre.${MFA}`,
      },
    ],
  },
];

export const APROVACAO_PREFIXES = ["pagamentos.", "financeiro.estorno.", "fechamento.reabertura"];

/** Limites em ordem (faixas e aprovadores): cada um precisa respeitar o anterior, como a API confere (registerOrderGuards). */
export function orderedFieldsError(fields, values, toNumberFn) {
  const groups = {};
  fields.filter((f) => f.order).forEach((f) => { (groups[f.order[0]] ||= [])[f.order[1]] = f; });
  for (const [name, list] of Object.entries(groups)) {
    for (let i = 1; i < list.length; i += 1) {
      const prev = toNumberFn(values[list[i - 1].key]);
      const curr = toNumberFn(values[list[i].key]);
      if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;
      if (name === "faixa" ? curr <= prev : curr < prev) {
        return name === "faixa"
          ? `"${list[i].label}" precisa ser maior que "${list[i - 1].label}".`
          : `"${list[i].label}" não pode ser menor que "${list[i - 1].label}".`;
      }
    }
  }
  return null;
}

/**
 * Ordem de gravação dos campos alterados: a API confere cada limite contra os vizinhos JÁ gravados, então o que sobe é gravado do maior para
 * o menor e o que desce, do menor para o maior (assim nenhuma gravação intermediária fica fora de ordem). Os demais campos vêm depois, na
 * ordem da tela.
 */
export function saveOrder(changed, values, original, toNumberFn) {
  const ordered = changed.filter((f) => f.order);
  const rest = changed.filter((f) => !f.order);
  const rising = ordered.filter((f) => toNumberFn(values[f.key]) > toNumberFn(original[f.key])).sort((a, b) => b.order[1] - a.order[1]);
  const falling = ordered.filter((f) => !rising.includes(f)).sort((a, b) => a.order[1] - b.order[1]);
  return [...rising, ...falling, ...rest];
}
