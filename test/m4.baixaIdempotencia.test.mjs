// Marco 4 — FIN-004 (Caderno M4 §2): a baixa parcial e a integral levam uma chave de idempotência
// gerada pela tela uma vez por baixa e reaproveitada nas novas tentativas (inclusive depois do MFA),
// para que um duplo clique ou retry não registre a baixa duas vezes.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("m4 FIN-004 o cliente da API envia idempotencyKey na baixa parcial e na integral", () => {
  const api = read("lib/api/finance.js");
  assert.match(api, /settleFinancialEntryPartial\(id, partialAmount, manual = null, idempotencyKey\)[\s\S]{0,200}body: \{ partialAmount, idempotencyKey/);
  assert.match(api, /settleFinancialEntry\(id, manual = null, idempotencyKey = null\)[\s\S]{0,250}idempotencyKey \? \{ idempotencyKey \}/);
});

test("m4 FIN-004 a tela gera a chave uma vez por baixa, reaproveita no retry e só troca quando o valor muda ou a baixa conclui", () => {
  // M4LR: a lógica da baixa saiu da página para o hook useSettlementActions.js (limite de 400 linhas), sem mudar o comportamento.
  const page = read("app/painel/financeiro/lancamentos/[id]/useSettlementActions.js");
  assert.match(page, /const partialKeyRef = useRef\(null\)/);
  assert.match(page, /if \(!partialKeyRef\.current \|\| partialKeyRef\.current\.amount !== amount\)/);
  assert.match(page, /settleFinancialEntryPartial\(entry\.id, amount, null, partialKeyRef\.current\.key\);\s*partialKeyRef\.current = null;/);
  assert.match(page, /if \(!settleKeyRef\.current\) settleKeyRef\.current = generateIdempotencyKey\(\)/);
  assert.match(page, /settleFinancialEntry\(entry\.id, null, settleKeyRef\.current\);\s*settleKeyRef\.current = null;/);
});

test("m4 FIN-004 a chave gerada tem de 8 a 180 caracteres e não se repete", () => {
  const a = generateIdempotencyKey();
  const b = generateIdempotencyKey();
  assert.ok(a.length >= 8 && a.length <= 180, a);
  assert.notEqual(a, b);
});
