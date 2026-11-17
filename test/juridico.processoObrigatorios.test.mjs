// Risco e valor estimado do processo (Caderno M5:244): obrigatórios na abertura e nunca apagados na edição, igual à API
// (legalCaseRequired.js). Valor 0 vale (DI-BI2-1). Porta do valor na aprovação do contrato principal (DI-BI2-5).
// Antes a tela de abertura não tinha os dois campos e o formulário de valores mandava null quando o campo ficava vazio.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_RISK_OPTIONS, amountPayload, caseValuesPayload, caseValuesValid, isValidEstimatedAmount, isValidRisk, newCaseProblems, newCaseRiskValuePayload,
} from "@/lib/legal/caseRequired.js";
import { legalErrorMessage } from "@/lib/legal/legalErrors.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const apiError = (code) => Object.assign(new Error("x"), { code, status: 422 });
const CRU = /\b[A-Z]{2,}_[A-Z_]+\b/;

test("processo: risco só da lista; valor estimado obrigatório, ≥ 0 e 0 vale", () => {
  assert.deepEqual(CASE_RISK_OPTIONS, ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  assert.equal(isValidRisk("HIGH"), true);
  for (const sem of ["", null, undefined, "ALTISSIMO"]) assert.equal(isValidRisk(sem), false, String(sem));
  for (const ok of ["0", "0,00", "1.234,56", "1500", 0]) assert.equal(isValidEstimatedAmount(ok), true, String(ok));
  for (const ruim of ["", "   ", null, undefined, "abc", "-1"]) assert.equal(isValidEstimatedAmount(ruim), false, String(ruim));
  assert.equal(amountPayload("1.234,56"), "1234.56");
  assert.equal(amountPayload("0"), "0.00");
});

test("abertura do processo: sem risco ou sem valor não cria; o payload leva os dois", () => {
  const ok = { riskLevel: "MEDIUM", estimatedAmount: "0" };
  assert.deepEqual(newCaseProblems(ok), []);
  assert.match(newCaseProblems({ ...ok, riskLevel: "" }).join(" "), /risco/);
  assert.match(newCaseProblems({ ...ok, estimatedAmount: "" }).join(" "), /valor estimado/);
  assert.deepEqual(newCaseRiskValuePayload({ riskLevel: "HIGH", estimatedAmount: "12.500,50" }), { riskLevel: "HIGH", estimatedAmount: "12500.50" });
});

test("edição dos valores: a estimativa nunca vai como null; o confirmado vazio vira null só quando não está travado", () => {
  assert.equal(caseValuesValid({ estimatedAmount: "", confirmedAmount: "" }), false, "estimativa vazia é inválida");
  assert.equal(caseValuesValid({ estimatedAmount: "0", confirmedAmount: "" }), true);
  assert.equal(caseValuesValid({ estimatedAmount: "10", confirmedAmount: "-1" }), false);
  assert.deepEqual(caseValuesPayload({ estimatedAmount: "0", confirmedAmount: "" }, false), { estimatedAmount: "0.00", confirmedAmount: null });
  assert.deepEqual(caseValuesPayload({ estimatedAmount: "1.000,00", confirmedAmount: "250,5" }, false), { estimatedAmount: "1000.00", confirmedAmount: "250.50" });
  assert.deepEqual(caseValuesPayload({ estimatedAmount: "5", confirmedAmount: "9" }, true), { estimatedAmount: "5.00" }, "confirmado travado não vai");
});

test("recusas novas da API em português, sem código cru", () => {
  for (const code of ["LEGAL_CASE_RISK_REQUIRED", "LEGAL_CASE_ESTIMATED_AMOUNT_REQUIRED", "LEGAL_CONTRACT_TOTAL_VALUE_REQUIRED"]) {
    const text = legalErrorMessage(apiError(code));
    assert.ok(text && text !== "x", code);
    assert.doesNotMatch(text, CRU, code);
  }
  assert.match(legalErrorMessage(apiError("LEGAL_CASE_RISK_REQUIRED")), /risco/);
  assert.match(legalErrorMessage(apiError("LEGAL_CASE_ESTIMATED_AMOUNT_REQUIRED")), /use 0/);
  assert.match(legalErrorMessage(apiError("LEGAL_CONTRACT_TOTAL_VALUE_REQUIRED")), /maior que zero/);
});

test("telas: abertura com Risco e Valor estimado; detalhe com risco sempre visível e editável; valores sem null", () => {
  const novo = read("app/painel/contratos/processos/novo/page.js");
  assert.match(novo, /label="Risco" htmlFor="f-risk" required/);
  assert.match(novo, /label="Valor estimado \(R\$\)" htmlFor="f-estimated" required/);
  assert.match(novo, /newCaseProblems\(form\)\.length === 0/);
  assert.match(novo, /\.\.\.newCaseRiskValuePayload\(form\)/);
  assert.match(novo, /legalErrorMessage\(err/);
  const detalhe = read("app/painel/contratos/processos/[id]/page.js");
  assert.doesNotMatch(detalhe, /legalCase\.riskLevel \? <div/, "o risco não some quando vazio");
  assert.match(detalhe, /<CaseRiskForm/);
  const risco = read("app/painel/contratos/processos/[id]/CaseRiskForm.js");
  assert.match(risco, /updateLegalCase\(legalCase\.id, \{ riskLevel \}\)/);
  assert.match(risco, /disabled=\{busy \|\| invalid\}/);
  const valores = read("app/painel/contratos/processos/[id]/CaseValuesForm.js");
  assert.match(valores, /caseValuesPayload\(form, locked\)/);
  assert.doesNotMatch(valores, /=== "" \? null/, "o campo vazio não vira null");
});
