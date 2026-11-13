// Marco 4 (DEC-003, DEC-004; Caderno §16) — parâmetros da autorização financeira na aba Financeiro de Configurações: lista fechada do
// risco sem valor, limites em ordem como a API confere e a ordem de gravação que nunca deixa um limite intermediário fora de ordem.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toNumber } from "@/lib/format.js";
import { FINANCEIRO_FIELDS, FINANCEIRO_PREFIXES } from "@/app/painel/configuracoes/financeiroGroups.js";
import { APROVACAO_GROUPS, RISK_OPTIONS, orderedFieldsError, saveOrder } from "@/app/painel/configuracoes/financeiroAprovacaoGroups.js";
import { allSettingLabels } from "@/lib/settings/allLabels.js";

const field = (key) => FINANCEIRO_FIELDS.find((f) => f.key === key);
const defaults = () => Object.fromEntries(FINANCEIRO_FIELDS.map((f) => [f.key, f.type === "boolean" || f.type === "select" ? f.defaultValue : String(f.defaultValue).replace(".", ",")]));

test("m4pg parâmetros: risco sem valor é lista fechada LOW..CRITICAL com rótulos em português, padrão crítico", () => {
  const f = field("pagamentos.risco_sem_valor");
  assert.equal(f.type, "select");
  assert.deepEqual(f.options.map((o) => o.value), ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  assert.deepEqual(RISK_OPTIONS.map((o) => o.label), ["Baixo", "Médio", "Alto", "Crítico"]);
  assert.equal(f.defaultValue, "CRITICAL");
});

test("m4pg parâmetros: as chaves novas são lidas pelos prefixos da aba e aparecem com rótulo na tela de Atividades", () => {
  const labels = allSettingLabels();
  for (const group of APROVACAO_GROUPS) {
    for (const f of group.fields) {
      assert.ok(FINANCEIRO_PREFIXES.some((p) => f.key.startsWith(p)), f.key);
      assert.equal(labels[f.key], f.label, f.key);
    }
  }
});

test("m4pg parâmetros: faixas estritamente crescentes e aprovadores que nunca diminuem com o risco", () => {
  const values = defaults();
  assert.equal(orderedFieldsError(FINANCEIRO_FIELDS, values, toNumber), null);
  assert.match(orderedFieldsError(FINANCEIRO_FIELDS, { ...values, "pagamentos.faixa.medio_ate": "5.000,00" }, toNumber), /maior que "Risco baixo vai até/);
  assert.match(orderedFieldsError(FINANCEIRO_FIELDS, { ...values, "pagamentos.aprovadores.critico": "1" }, toNumber), /não pode ser menor/);
  assert.equal(orderedFieldsError(FINANCEIRO_FIELDS, { ...values, "pagamentos.aprovadores.medio": "2" }, toNumber), null, "igual ao seguinte vale");
  assert.equal(orderedFieldsError(FINANCEIRO_FIELDS, { ...values, "pagamentos.faixa.baixo_ate": "" }, toNumber), null, "campo vazio não acusa ordem");
});

// Simula a conferência da API (registerOrderGuards): cada gravação é comparada com os vizinhos JÁ gravados.
function simulateSave(original, values) {
  const saved = { ...original };
  const changed = FINANCEIRO_FIELDS.filter((f) => String(values[f.key]) !== String(original[f.key]));
  for (const f of saveOrder(changed, values, original, toNumber)) {
    saved[f.key] = values[f.key];
    const err = orderedFieldsError(FINANCEIRO_FIELDS, saved, toNumber);
    if (err) return `recusado em ${f.key}: ${err}`;
  }
  return "ok";
}

test("m4pg parâmetros: subir ou descer várias faixas de uma vez grava numa ordem que a API aceita", () => {
  const original = defaults();
  const cases = [
    { "pagamentos.faixa.baixo_ate": "60.000,00", "pagamentos.faixa.medio_ate": "100.000,00" },
    { "pagamentos.faixa.medio_ate": "3.000,00", "pagamentos.faixa.baixo_ate": "1.000,00" },
    { "pagamentos.faixa.baixo_ate": "20.000,00", "pagamentos.faixa.medio_ate": "30.000,00" },
    { "pagamentos.faixa.medio_ate": "250.000,00", "pagamentos.faixa.alto_ate": "300.000,00" },
    { "pagamentos.aprovadores.baixo": "3", "pagamentos.aprovadores.medio": "3", "pagamentos.aprovadores.alto": "4", "pagamentos.aprovadores.critico": "5" },
  ];
  for (const change of cases) assert.equal(simulateSave(original, { ...original, ...change }), "ok", JSON.stringify(change));
  const naOrdemDaTela = (values) => {
    const saved = { ...original };
    for (const f of FINANCEIRO_FIELDS.filter((x) => String(values[x.key]) !== String(original[x.key]))) {
      saved[f.key] = values[f.key];
      if (orderedFieldsError(FINANCEIRO_FIELDS, saved, toNumber)) return "recusado";
    }
    return "ok";
  };
  assert.equal(naOrdemDaTela({ ...original, ...cases[0] }), "recusado", "sem a ordem, a primeira gravação seria recusada pela API");
});
