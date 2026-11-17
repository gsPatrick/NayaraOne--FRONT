// Segunda leva (16/11/2026), item 16 e partes "A" dos itens 14 e 15a (DI-BI2-6): vencimento obrigatório na conta a pagar ou a receber
// PRÓPRIA (Caderno M4 §19: contas e recebíveis 7/30/60 e inadimplência) e centros obrigatórios (M4 §4), iguais à API
// (open-entry-guards.js, 422 FINANCE_ENTRY_DUE_DATE_REQUIRED / LOSS_CASE_CHARGE_DUE_REQUIRED). Antes as telas deixavam criar sem a data,
// classificar o excedente como despesa sem vencimento e como receita sem centro de resultado, e cobrar a perda sem vencimento.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  classificationPayload, classificationProblems, editDueAtMode, editDueAtPayload, editProblems, lossChargeDueMissing, lossChargePayload,
  newEntryDueMissing, OPEN_ENTRY_ERROR_MESSAGES, requiresDueDate,
} from "@/lib/finance/openEntryRequired.js";
import { friendlyFinanceError } from "@/lib/finance/extras.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const NOON_SP = "2026-11-20T15:00:00.000Z";

test("novo lançamento: a pagar e a receber próprios sem vencimento não criam; terceiro, ajuste e transferência não exigem", () => {
  for (const nature of ["PAYABLE", "RECEIVABLE"]) {
    for (const dueAt of ["", "  ", null, undefined]) assert.equal(newEntryDueMissing({ nature, dueAt }), true, `${nature} ${dueAt}`);
    assert.equal(newEntryDueMissing({ nature, dueAt: "2026-11-20" }), false);
    assert.equal(requiresDueDate({ nature, isThirdPartyFunds: true }), false, "dinheiro de terceiro fica fora");
  }
  for (const nature of ["TRANSFER", "ADJUSTMENT"]) assert.equal(newEntryDueMissing({ nature, dueAt: "" }), false, nature);
  const page = read("app/painel/financeiro/lancamentos/novo/page.js");
  assert.match(page, /newEntryDueMissing\(form\)/);
  assert.match(page, /!dueMissing &&/, "o botão de criar depende do vencimento");
  assert.match(page, /required=\{dueRequired\}/);
});

test("edição: vencimento gravado travado; conta própria sem data recebe a data uma vez; centros não somem", () => {
  const payable = { nature: "PAYABLE", dueAt: NOON_SP, costCenterId: "cc" };
  assert.equal(editDueAtMode(payable), "locked");
  assert.equal(editDueAtPayload(payable, "2026-11-25"), undefined, "a data gravada nunca é reenviada nem trocada");
  const legado = { nature: "RECEIVABLE", dueAt: null, resultCenterId: "rc" };
  assert.equal(editDueAtMode(legado), "required");
  assert.match(editProblems(legado, { dueAt: "", resultCenterId: "rc" }).join(" "), /vencimento/);
  assert.equal(editDueAtPayload(legado, "2026-11-20"), NOON_SP, "data do formulário ao meio-dia de São Paulo");
  assert.equal(editDueAtMode({ nature: "PAYABLE", isThirdPartyFunds: true, dueAt: null }), "optional");
  assert.match(editProblems(payable, { costCenterId: "" }).join(" "), /centro de custo/);
  assert.match(editProblems({ nature: "RECEIVABLE", dueAt: NOON_SP }, { resultCenterId: "" }).join(" "), /centro de resultado/);
  assert.deepEqual(editProblems(payable, { costCenterId: "cc" }), []);
  const hook = read("app/painel/financeiro/lancamentos/[id]/useEntryEdit.js");
  assert.match(hook, /editProblems\(entry, editForm\)/);
  assert.match(hook, /editDueAtPayload\(entry, editForm\.dueAt\)/);
  assert.doesNotMatch(hook, /dueAt: editForm\.dueAt \? dateOnlyInputToIso/, "a forma antiga reenviava a data gravada");
  assert.match(read("app/painel/financeiro/lancamentos/[id]/EditEntryCard.js"), /disabled=\{dueMode === "locked"\}/);
});

test("classificação do excedente: receita exige centro de resultado; despesa exige centro de custo e vencimento", () => {
  assert.match(classificationProblems("RECEIVABLE", {}).join(" "), /centro de resultado/);
  assert.match(classificationProblems("PAYABLE", { costCenterId: "cc" }).join(" "), /vencimento/);
  assert.match(classificationProblems("PAYABLE", { dueAt: "2026-11-20" }).join(" "), /centro de custo/);
  assert.deepEqual(classificationProblems("ADJUSTMENT", {}), []);
  assert.deepEqual(classificationPayload("RECEIVABLE", { resultCenterId: "rc", costCenterId: "cc", dueAt: "2026-11-20" }), { finalNature: "RECEIVABLE", resultCenterId: "rc" });
  assert.deepEqual(classificationPayload("PAYABLE", { costCenterId: "cc", dueAt: "2026-11-20" }), { finalNature: "PAYABLE", costCenterId: "cc", dueAt: NOON_SP });
  const modal = read("app/painel/financeiro/lancamentos/ClassifyPendingModal.js");
  assert.match(modal, /id="classify-rc"/);
  assert.match(modal, /id="classify-due"/);
  assert.match(modal, /classificationPayload\(form\.finalNature, form\)/);
  const api = read("lib/api/finance.js");
  assert.match(api, /resultCenterId \? \{ resultCenterId \}/);
  assert.match(api, /dueAt \? \{ dueAt \}/);
});

test("cobrança de perda: cobrar exige o vencimento da cobrança; sem cobrar, não", () => {
  assert.equal(lossChargeDueMissing({ chargeResponsible: true, chargeDueAt: "" }), true);
  assert.equal(lossChargeDueMissing({ chargeResponsible: true, chargeDueAt: "2026-11-20" }), false);
  assert.equal(lossChargeDueMissing({ chargeResponsible: false, chargeDueAt: "" }), false);
  assert.deepEqual(lossChargePayload({ responsiblePersonId: "p", chargeAmount: 10, chargeDueAt: "2026-11-20" }), { chargeResponsible: true, responsiblePersonId: "p", chargeAmount: 10, chargeDueAt: NOON_SP });
  const page = read("app/painel/estoque/perdas/page.js");
  assert.match(page, /id="loss-decision-due"/);
  assert.match(page, /!chargeDueMissing/);
  assert.match(page, /lossChargePayload\(/);
});

test("os códigos de erro novos viram texto em português (nunca o código cru na tela)", () => {
  for (const code of ["FINANCE_ENTRY_DUE_DATE_REQUIRED", "FINANCE_ENTRY_DUE_DATE_IMMUTABLE", "LOSS_CASE_CHARGE_DUE_REQUIRED", "FINANCE_ENTRY_RESULT_CENTER_REQUIRED"]) {
    const msg = friendlyFinanceError(Object.assign(new Error(code), { code, status: 422 }));
    assert.equal(msg, OPEN_ENTRY_ERROR_MESSAGES[code]);
    assert.doesNotMatch(msg, /\b[A-Z]{2,}_[A-Z_]+\b/);
  }
});
