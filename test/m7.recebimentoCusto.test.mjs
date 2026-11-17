// Resposta de 16/11/2026, item 10 parte A: M7:82, "Entrada confirmada atualiza saldo e custo".
// A tela de recebimentos passa a exigir custo unitário (>= 0) em toda linha e a enviá-lo sempre,
// como a API (422 INVENTORY_RECEIPT_UNIT_COST_REQUIRED).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { receiptLineError, isReceiptFormValid, toReceiptItems, UNIT_COST_PLACEHOLDER } from "@/app/painel/estoque/recebimentos/receiptRules.js";

const linha = (over = {}) => ({ inventoryItemId: "item-1", quantity: "5", unitCost: "10,50", ...over });
const form = (lines) => ({ destinationLocationId: "loc-1", lines });

test("m7: linha sem custo unitário não deixa criar o recebimento (antes, custo vazio passava)", () => {
  for (const vazio of ["", "   ", null, undefined]) {
    assert.match(receiptLineError(linha({ unitCost: vazio })), /custo unitário/);
    assert.equal(isReceiptFormValid(form([linha({ unitCost: vazio })])), false);
  }
  assert.equal(isReceiptFormValid(form([linha(), linha({ unitCost: "" })])), false, "uma linha sem custo barra o recebimento inteiro");
});

test("m7: custo zero é aceito; negativo ou não numérico é recusado", () => {
  assert.equal(receiptLineError(linha({ unitCost: "0" })), "");
  assert.equal(receiptLineError(linha({ unitCost: "0,00" })), "");
  assert.match(receiptLineError(linha({ unitCost: "-1" })), /maior ou igual a zero/);
  assert.match(receiptLineError(linha({ unitCost: "abc" })), /maior ou igual a zero/);
  assert.equal(isReceiptFormValid(form([linha(), linha({ unitCost: "0" })])), true);
});

test("m7: item, quantidade e local continuam obrigatórios", () => {
  assert.match(receiptLineError(linha({ inventoryItemId: "" })), /item/);
  assert.match(receiptLineError(linha({ quantity: "0" })), /quantidade/);
  assert.match(receiptLineError(linha({ quantity: "" })), /quantidade/);
  assert.equal(isReceiptFormValid({ destinationLocationId: "", lines: [linha()] }), false);
  assert.equal(isReceiptFormValid(form([])), false);
});

test("m7: o envio manda sempre o custo unitário como número, inclusive zero", () => {
  assert.deepEqual(toReceiptItems([linha(), linha({ inventoryItemId: "item-2", quantity: "1,5", unitCost: "0" })]), [
    { inventoryItemId: "item-1", quantity: 5, unitCost: 10.5 },
    { inventoryItemId: "item-2", quantity: 1.5, unitCost: 0 },
  ]);
});

test("m7: a tela usa as regras e marca o custo como obrigatório no campo", () => {
  const page = readFileSync(new URL("../app/painel/estoque/recebimentos/page.js", import.meta.url), "utf8");
  assert.equal(UNIT_COST_PLACEHOLDER, "Custo unit. *");
  assert.match(page, /isReceiptFormValid\(form\)/);
  assert.match(page, /items: toReceiptItems\(form\.lines\)/);
  assert.match(page, /placeholder=\{UNIT_COST_PLACEHOLDER\} required/);
  assert.doesNotMatch(page, /unitCost: l\.unitCost \? toNumber\(l\.unitCost\) : undefined/, "o custo não pode mais ser omitido no envio");
});
