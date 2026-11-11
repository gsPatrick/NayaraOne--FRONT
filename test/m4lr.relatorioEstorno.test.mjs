// Marco 4 (verificação 11/11/2026, M4LR): a tela do relatório semanal (Caderno §19) e o estorno de baixa parcial (§6) acompanham a API —
// o recebível de R$ 0,30 com 0,10 recebido mostra 0,20 a receber, o caixa disponível é o conciliado, a inadimplência é só dos recebíveis,
// o estorno do lançamento com baixas parciais estorna cada baixa e o saldo volta a ser baixável (complemento).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { receivableDelta, freeCashDelta, delinquencyView, breathingDelta, windowRows, pendingRows, weightsText } from "@/app/painel/financeiro/relatorio/reportView.js";
import { ledgerBalance, reversalPreview, reversalNotice, canComplement } from "@/app/painel/financeiro/lancamentos/[id]/ledgerBalance.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const bucket = (total, count = 1, weighted = total) => ({ count, total, weighted });

// O relatório da API para o R$ 0,30 depois da baixa parcial de 0,10 (números da sonda P6 já corrigida).
const report = {
  receivablePending: bucket(0.2),
  payablePending: { count: 0, total: 0 },
  receivableWeights: { EM_DIA: 1, PARCIAL: 0.5, VENCIDO: 0 },
  dueNextSevenDays: { payable: { count: 0, total: 0 }, receivable: bucket(0.2, 1, 0.1) },
  dueNext30Days: { payable: { count: 0, total: 0 }, receivable: bucket(0.2) },
  dueNext60Days: { payable: { count: 0, total: 0 }, receivable: bucket(0.2) },
  freeCash: { value: 500, grossBankBalance: 1500, conciliatedBankBalance: 1500, thirdPartyHeld: 1000, thirdPartyHeldConciliated: 1000 },
  thirdPartyFunds: { total: 0 },
  delinquencyRatio: 0,
  delinquency: { receivable: { overdue: 0, eligible: 200, ratio: 0 }, payable: { overdue: 100, eligible: 100, ratio: 1 } },
  breathingNeed: { value: -500.1, mandatoryOutflows: 0, probableInflows: 0.1 },
  pendingReconciliations: { count: 2, total: 200, inflow: 100, outflow: 100 },
  provisionedCommissions: { count: 0, total: 0 },
  pendingOwnerRepasses: { count: 1, total: 700, approvedNotPaid: { count: 1, total: 700 } },
};
const brl = (s) => s.replace(/ /g, " ");

test("§19 relatório: saldo em aberto, ponderado por status, caixa conciliado, inadimplência dos recebíveis e pendências em valor absoluto", () => {
  assert.match(brl(receivableDelta(report)), /saldo em aberto; ponderado por status: R\$ 0,20/);
  assert.equal(weightsText(report), "em dia 100% · parcialmente recebido 50% · vencido 0%");
  assert.match(brl(freeCashDelta(report)), /Saldo conciliado R\$ 1\.500,00 − terceiros contidos nele R\$ 1\.000,00/);
  const d = delinquencyView(report);
  assert.equal(d.value, "0,0%", "conta a pagar em atraso não entra na inadimplência");
  assert.match(d.delta, /Contas a pagar em atraso \(à parte\): 100,0%/);
  assert.match(brl(breathingDelta(report)), /entradas prováveis \(ponderadas\) R\$ 0,10/);
  const rows = windowRows(report);
  assert.match(brl(rows.find((r) => r.key === "7 dias-r").count), /^1 · ponderado R\$ 0,10$/, "§19.3: recebíveis ponderados por status");
  assert.equal(rows.find((r) => r.key === "30 dias-r").count, "1", "sem diferença, o ponderado não é repetido");
  assert.match(brl(rows.find((r) => r.key === "7 dias-r").value), /R\$ 0,20/);
  const pend = pendingRows(report);
  assert.match(brl(pend[0].count), /entradas R\$ 100,00, saídas R\$ 100,00/);
  assert.match(brl(pend[2].count), /aprovados e não pagos: 1 \(R\$ 700,00\)/);
});

test("§19 tela: o relatório usa as funções novas e mostra o caixa conciliado e os terceiros retidos", () => {
  const page = read("app/painel/financeiro/relatorio/page.js");
  for (const fn of ["receivableDelta", "freeCashDelta", "delinquencyView", "breathingDelta", "windowRows", "pendingRows"]) assert.match(page, new RegExp(`${fn}\\(report\\)`));
  assert.match(page, /Caixa disponível \(conciliado\)/);
  assert.match(page, /Dinheiro de terceiros retido/);
  assert.ok(page.split("\n").length <= 400);
});

test("§6 estorno de parcial: o saldo segue o ledger e o estorno do lançamento com baixas estorna cada baixa", () => {
  const pai = { id: "p", amount: "0.30", status: "SETTLED" };
  const b1 = { id: "b1", parentEntryId: "p", amount: "0.10", status: "REVERSED", nature: "RECEIVABLE", movementKind: "PARTIAL" };
  const b2 = { id: "b2", parentEntryId: "p", amount: "0.20", status: "SETTLED", nature: "RECEIVABLE", movementKind: "PARTIAL" };
  const est = { id: "r1", reversalOfEntryId: "b1", amount: "0.10", status: "SETTLED" };
  const excedente = { id: "x", parentEntryId: "p", amount: "5.00", status: "PENDING", nature: "PENDING_CLASSIFICATION", movementKind: "EXCESS" };
  const all = [pai, b1, b2, est, excedente];
  assert.deepEqual({ ...ledgerBalance({ ...pai, status: "PARTIALLY_SETTLED" }, all), children: undefined }, { realizedCents: 20, remainingCents: 10, children: undefined });
  assert.equal(canComplement({ ...pai, status: "PARTIALLY_SETTLED" }, all), true, "o saldo de 0,10 volta a ser baixável");
  assert.equal(canComplement({ id: "n", amount: "1.00", status: "PENDING" }, all), false, "sem baixa anterior não há complemento");
  assert.equal(reversalPreview(pai, all).kind, "PARENT_WITH_SETTLEMENTS");
  assert.match(brl(reversalPreview(pai, all).text), /cada baixa ainda de pé \(1\) ganha o seu estorno, somando R\$ 0,20/);
  assert.equal(reversalPreview(b2, all).kind, "MOVEMENT_CHILD");
  assert.equal(reversalPreview({ id: "z", amount: "50.00", status: "PENDING" }, all).kind, "NOT_REALIZED");
  assert.match(reversalNotice({ ledgerEffect: "PARENT_WITH_SETTLEMENTS", reversals: [1, 2] }), /2 baixa\(s\) parcial\(is\) estornada\(s\)/);
  assert.match(reversalNotice({ ledgerEffect: "NOT_REALIZED" }), /nada entrou no ledger/);
});

test("§6 tela do lançamento: estorno também no parcialmente recebido, complemento com chave e saldo conferido", () => {
  const page = read("app/painel/financeiro/lancamentos/[id]/page.js");
  assert.match(page, /entry\.status === "PARTIALLY_SETTLED" && partialChildren\.length > 0\) \? \(\s*<Button requires="finance:settle" variant="secondary" onClick=\{handleReverse\}/);
  assert.match(page, /\{reversalInfo\.text\}/);
  assert.match(page, /setNotice\(\{ tone: "info", text: reversalNotice\(result\) \}\)/);
  assert.match(page, /Quitar saldo/);
  const hook = read("app/painel/financeiro/lancamentos/[id]/useComplementAction.js");
  assert.match(hook, /settleFinancialEntryComplement\(entry\.id, \(remainingCents \/ 100\)\.toFixed\(2\), keyRef\.current\.key\)/);
  const api = read("lib/api/finance.js");
  assert.match(api, /\/finance\/entries\/\$\{id\}\/settle-complement/);
  assert.match(api, /body: \{ expectedAmount, idempotencyKey/);
});
