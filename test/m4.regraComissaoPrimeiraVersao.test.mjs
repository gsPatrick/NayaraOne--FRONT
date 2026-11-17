// Financeiro > Regra de comissão (REG-FIN-001), dois defeitos achados pelos e2e marco4-5-consolidacao e m45-varredura-codigo-cru (17/11/2026):
// 1) Empresa sem regra: a API responde 422 FINANCE_COMMISSION_RULE_NOT_CONFIGURED e a tela só tratava 404 como "sem regra" — mostrava o erro e
//    "Publicar regra" ficava desligado (!ruleQuery.fresh): a primeira regra não podia ser publicada pela tela. Agora decide pelo código do erro.
// 2) O código técnico aparecia na tela ("regra REG-FIN-001" no resumo e "(REG-FIN-001)" na mensagem da API). Nenhuma chave técnica na tela.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ApiError } from "@/lib/api/client.js";
import { currentRuleSummary, isNoCommissionRule, loadCurrentCommissionRule, NO_RULE_CODE } from "@/app/painel/financeiro/regra-comissao/currentRule.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const semRegra = (reason) => new ApiError("Não há regra de comissão publicada para esta empresa — publique o percentual de cada componente.", { code: NO_RULE_CODE, status: 422, details: reason ? { reason } : undefined });
const falha = (err) => () => Promise.reject(err);

test("empresa sem regra (422 FINANCE_COMMISSION_RULE_NOT_CONFIGURED) é 'nenhuma regra publicada', e o formulário fica liberado", async () => {
  for (const reason of [undefined, "RULE_NOT_FOUND", "RULE_NO_ACTIVE_VERSION", "RULE_NO_MATCHING_SCOPE"]) {
    assert.deepEqual(await loadCurrentCommissionRule(falha(semRegra(reason))), { current: null }, String(reason));
  }
  const vigente = { versionNumber: 2, components: { BROKER: 3 } };
  assert.deepEqual(await loadCurrentCommissionRule(() => Promise.resolve(vigente)), { current: vigente });
});

test("decide pelo código, nunca pelo status: outro 422, 404 genérico, conflito ou erro do motor, sem acesso e sem conexão continuam erro", async () => {
  const outros = [
    new ApiError("x", { code: "VALIDATION_ERROR", status: 422 }),
    new ApiError("x", { code: "NOT_FOUND", status: 404 }),
    semRegra("RULE_CONFLICT"),
    semRegra("RULE_ENGINE_ERROR"),
    new ApiError("x", { code: "PERMISSION_DENIED", status: 403 }),
    new TypeError("Failed to fetch"),
  ];
  for (const err of outros) {
    assert.equal(isNoCommissionRule(err), false, `${err.code} ${err.status}`);
    await assert.rejects(loadCurrentCommissionRule(falha(err)), (e) => e === err);
  }
});

test("a tela usa o carregamento por código e o botão depende só do dado fresco (que agora chega na empresa sem regra)", () => {
  const page = read("app/painel/financeiro/regra-comissao/page.js");
  assert.match(page, /useAsyncState\(\(\) => loadCurrentCommissionRule\(getCommissionRule\)/);
  assert.doesNotMatch(page, /status === 404/, "a forma antiga só aceitava 404");
  assert.match(page, /disabled=\{saving \|\| !ruleQuery\.fresh\}/);
});

test("nenhuma chave técnica no resumo da versão vigente", () => {
  const comps = [{ key: "BROKER", label: "Corretor (%)" }, { key: "MANAGER", label: "Gerente (%)" }];
  const texto = currentRuleSummary({ ruleCode: "REG-FIN-001", versionNumber: 3, components: { BROKER: 5 }, rounding: "HALF_EVEN" }, comps);
  assert.doesNotMatch(texto, /REG-|ruleCode|HALF_|BROKER|MANAGER/);
  assert.match(texto, /^Versão 3 · base: valor do recebimento · Corretor: .+ · Gerente: não se aplica · arredondamento: /);
  const page = read("app/painel/financeiro/regra-comissao/page.js");
  assert.doesNotMatch(page, /rule\.ruleCode/, "a forma antiga escrevia 'regra REG-FIN-001' na tela");
  assert.match(page, /\{currentRuleSummary\(rule, COMPONENTS\)\}/);
  // Mesma regra na tela de comissões: o texto de ajuda do componente citava "(REG-FIN-001)".
  const comissoes = read("app/painel/financeiro/comissoes-repasses/page.js");
  assert.doesNotMatch(comissoes.match(/htmlFor="nc-component"[^>]*>/)[0], /REG-/);
});
