// Financeiro > Intercompany: rótulo da conta de destino. Conta cadastrada só com a chave PIX (sem banco, agência e número) aparecia como
// "null · ag. sem agência · Sem número da conta" (varredura e2e m45-varredura-codigo-cru, 17/11/2026). Na devolução de dinheiro de terceiro a
// conta sem número dizia "Conta sem agência".
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { destinationAccountLabel } from "@/lib/finance/labels.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("conta só com chave PIX: rótulo sem null e sem campos vazios", () => {
  const label = destinationAccountLabel({ id: "x", bankCode: null, agency: null, accountNumber: null, status: "COOLING" });
  assert.equal(label, "Conta por chave PIX");
  assert.doesNotMatch(label, /null|undefined/);
});

test("conta com banco: nome do banco, agência e número mascarado; banco ausente não vira null", () => {
  const label = destinationAccountLabel({ bankCode: "001", agency: "0021", accountNumber: "88213-4" });
  assert.match(label, /· ag\. 0021 · •+13-4$/);
  assert.doesNotMatch(label, /^001 /, "o código cru do banco não aparece sozinho");
  assert.equal(destinationAccountLabel({ bankCode: null, agency: "0021", accountNumber: "****1234" }), "Banco não informado · ag. 0021 · ****1234");
});

test("as telas usam o rótulo (a forma antiga interpolava a.bankCode direto)", () => {
  const page = read("app/painel/financeiro/intercompany/page.js");
  assert.match(page, /const accountLabel = destinationAccountLabel;/);
  assert.doesNotMatch(page, /`\$\{a\.bankCode\} · ag\./);
  assert.doesNotMatch(read("app/painel/financeiro/lancamentos/[id]/ThirdPartyReleaseModal.js"), /accountNumber \|\| "sem agência"/);
});
