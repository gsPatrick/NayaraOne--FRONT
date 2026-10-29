// M9-D850 — lista auxiliar que falha não vira lista vazia em silêncio.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import { lookupFallback, reportLookupProblem, getLookupProblems, clearLookupProblems } from "@/lib/asyncState/lookup.js";
import { LookupProblemsList, lookupProblemText } from "@/components/molecules/AsyncState/LookupProblems.js";

beforeEach(() => clearLookupProblems());
const err = (status, extra = {}) => Object.assign(new Error("x"), { status, ...extra });

test("m9d850 lista auxiliar com 403 registra o motivo e a tela mostra aviso com a permissão", async () => {
  const list = await Promise.reject(err(403, { code: "PERMISSION_DENIED", details: { required: "properties:read" } })).catch(lookupFallback("os imóveis"));
  assert.deepEqual(list, [], "a tela recebe lista vazia só para não quebrar");
  const [problem] = getLookupProblems();
  assert.deepEqual([problem.label, problem.state, problem.permission], ["os imóveis", "PERMISSION_DENIED", "properties:read"]);
  const out = html(LookupProblemsList, { problems: getLookupProblems() });
  assert.match(out, /Não foi possível carregar os imóveis\. Você não tem acesso a esta área\. Permissão necessária: properties:read\. Peça ao administrador da sua empresa\./);
  assert.match(out, /data-lookup-problems/);
});

test("m9d850 falha de lista auxiliar: rede vira OFFLINE, 500 vira RETRY com código de suporte e sessão não gera aviso", async () => {
  await Promise.reject(err(0, { code: "NETWORK_ERROR" })).catch(lookupFallback("as pessoas"));
  await Promise.reject(err(500, { traceId: "t-55" })).catch(lookupFallback("os contratos", null));
  reportLookupProblem("as obras", err(401, { code: "MISSING_ACCESS_TOKEN" }));
  const problems = getLookupProblems();
  assert.deepEqual(problems.map((p) => [p.label, p.state]), [["as pessoas", "OFFLINE"], ["os contratos", "RETRY"]]);
  assert.match(lookupProblemText(problems[0]), /Sem conexão\. Verifique a internet e tente novamente\./);
  assert.match(lookupProblemText(problems[1]), /Código de suporte: t-55\./);
  assert.equal(await Promise.reject(err(500)).catch(lookupFallback("o x", null)), null);
  reportLookupProblem("as pessoas", err(403, { code: "PERMISSION_DENIED" }));
  assert.equal(getLookupProblems().filter((p) => p.label === "as pessoas").length, 1, "uma linha por lista");
});
