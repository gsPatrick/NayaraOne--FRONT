// Marco 4 — Guia §9 "regra AUTO_STRONG" parametrizada e Guia §11 comissão (REG-FIN-001 com arredondamento definido, DI-M4CC-1): o que a tela mostra.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { describeAutoStrongPolicy, sourceLabel, AUTO_BLOCKED_REASON } from "@/app/painel/financeiro/conciliacao/autoStrongPolicy.js";
import { ROUNDING_OPTIONS, roundingLabel, roundingExample } from "@/app/painel/financeiro/regra-comissao/rounding.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("m4 G§9: a tela de conciliação mostra cada parâmetro da regra AUTO_STRONG vigente, em português", () => {
  const itens = describeAutoStrongPolicy({ autoScoreMin: 0.9, suggestionScoreMin: 0.45, dateWindowDays: 3, ambiguityGap: 0.05, autoStrong: false });
  assert.deepEqual(itens.map((i) => i.key), ["auto", "sugestao", "janela", "folga", "forte"]);
  const byKey = Object.fromEntries(itens.map((i) => [i.key, i.value]));
  assert.equal(byKey.auto, "0,90 ponto(s)");
  assert.equal(byKey.sugestao, "0,45 ponto(s)");
  assert.equal(byKey.janela, "3 dia(s)");
  assert.equal(byKey.folga, "0,05 ponto(s)");
  assert.match(byKey.forte, /^Não/);
  const ligada = describeAutoStrongPolicy({ autoScoreMin: 0.95, suggestionScoreMin: 0.6, dateWindowDays: 0, ambiguityGap: 0, autoStrong: true });
  assert.equal(ligada.find((i) => i.key === "auto").value, "0,95 ponto(s)");
  assert.match(ligada.find((i) => i.key === "forte").value, /fonte confiável/);
  assert.deepEqual(describeAutoStrongPolicy(null), []);
});

test("m4 G§9 / FIN-009: origem da linha do extrato e motivo de não confirmar sozinha", () => {
  assert.equal(sourceLabel("MANUAL", false), "Digitada à mão");
  assert.equal(sourceLabel("FILE_IMPORT", true), "Arquivo de extrato (fonte confiável)");
  assert.equal(sourceLabel("LEGACY", false), "Anterior à origem registrada");
  for (const code of ["UNTRUSTED_SOURCE", "AUTO_STRONG_OFF", "BELOW_AUTO_SCORE", "ENTRY_UNDER_REVIEW", "CLASS_REQUIRES_HUMAN", "ALREADY_RECONCILED"]) {
    assert.ok(AUTO_BLOCKED_REASON[code] && !/_/.test(AUTO_BLOCKED_REASON[code]), code);
  }
});

test("m4 G§9: a página de conciliação monta o cartão da regra e mostra a origem de cada linha; a API tem a rota da regra", () => {
  const page = read("app/painel/financeiro/conciliacao/page.js");
  assert.match(page, /<AutoStrongPolicyCard \/>/);
  assert.match(page, /sourceLabel\(t\.source, t\.sourceTrusted\)/);
  assert.match(read("lib/api/finance.js"), /apiFetch\("\/finance\/reconciliation\/policy"\)/);
  assert.match(read("app/painel/financeiro/conciliacao/AutoStrongPolicyCard.js"), /<AsyncState result=\{policyQuery\}/);
});

test("m4 G§11/G§18.1: regra de comissão REG-FIN-001 com arredondamento escolhido na publicação, campos com DecimalInput e toNumber", () => {
  assert.deepEqual(ROUNDING_OPTIONS.map((o) => o.value), ["HALF_UP", "HALF_EVEN"]);
  assert.equal(roundingLabel(undefined), roundingLabel("HALF_UP"), "versão antiga sem modo vale o padrão");
  assert.match(roundingExample("HALF_UP"), /R\$ 0,29 = R\$ 0,15/);
  assert.match(roundingExample("HALF_EVEN"), /R\$ 0,29 = R\$ 0,14/);
  const page = read("app/painel/financeiro/regra-comissao/page.js");
  assert.match(page, /REG-FIN-001/);
  assert.doesNotMatch(page, /REG-FIN-002/);
  assert.match(page, /<DecimalInput/);
  assert.doesNotMatch(page, /<Input\b/);
  assert.match(page, /toNumber\(raw\)/);
  assert.doesNotMatch(page, /(?<!to)Number\(raw\)/);
  assert.match(page, /publishCommissionRule\(buildPayload\(\), values\.rounding\)/);
  assert.match(read("lib/api/finance.js"), /body: \{ componentPercentages, rounding \}/);
});

test("m4 G§13: a tela da NAY Financeira cita o read model (retrato) como fonte e a data do retrato, não o ledger", () => {
  const page = read("app/painel/financeiro/nay/page.js");
  assert.match(page, /"analytics\.rm_finance_health": "Retrato da saúde financeira \(read model\)"/);
  assert.match(page, /"analytics\.rm_finance_sector_margin"/);
  assert.match(page, /data\.fontes\?\.readModels/);
  assert.match(page, /data\.fontes\?\.asOfDate/);
  assert.match(page, /item\.resultCenterId/);
  assert.match(page, /if \(value == null\) return "Indisponível"/);
});
