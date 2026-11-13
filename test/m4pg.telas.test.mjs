// Marco 4 — o que as telas novas mostram (render estático): linha da intenção com favorecido congelado, risco e progresso; aviso de
// intenção invalidada; preparo com saldo e parcela; pedido de estorno pendente; motivo da reabertura com contador; pedidos de reabertura
// com a trava de quem pediu. Nenhum nome técnico de estado aparece.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { html } from "./_loader/render.mjs";
import IntentRow from "@/app/painel/financeiro/intencoes-pagamento/IntentRow.js";
import PaymentIntentPrepare, { IntentInvalidatedNotice } from "@/app/painel/financeiro/lancamentos/[id]/PaymentIntentPrepare.js";
import { PendingReversalNotice } from "@/app/painel/financeiro/lancamentos/[id]/ReversalRequest.js";
import ReopenFormCard from "@/app/painel/financeiro/fechamento/ReopenFormCard.js";
import ReopenRequestsCard from "@/app/painel/financeiro/fechamento/ReopenRequestsCard.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const text = (markup) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const CRU = /\b(DRAFT|PENDING_APPROVAL|EXECUTING|CONFIRMED|CANCELED|SUBMITTING|SUBMITTED|UNCERTAIN|PARAMETERS|beneficiary|undefined|NaN)\b/;
const noop = () => {};

const beneficiary = { bankAccountId: "b1", personId: "p1", name: "Fornecedor Alfa", bankCode: "341", branch: "0001", account: "123456-7", pixKey: "fornecedor@alfa.com.br" };
const base = {
  id: "i1", status: "PENDING_APPROVAL", submissionPhase: "NOT_STARTED", amount: "40.00", installmentNumber: 2, createdBy: "u1", createdAt: "2026-11-10T12:00:00Z",
  snapshotHash: "abcdef0123456789", beneficiarySnapshot: beneficiary, snapshotJson: { snapshotVersion: 2, amount: "40.00", entryAmount: "100.00", installmentNumber: 2, beneficiary },
  approval: { id: "a1", status: "PENDING", riskLevel: "HIGH", riskSource: "PARAMETERS", requiredApprovals: 2, approvedCount: 1, approvers: [{ approverUserId: "u2", decision: "APPROVED" }] },
};
const rowProps = { entry: { description: "Manutenção elétrica" }, busy: false, onApprove: noop, onExecute: noop, onCancel: noop, onReconcile: noop, onResolve: noop };

test("m4pg tela: a linha da intenção mostra favorecido congelado, valor da parcela, risco, origem e 1 de 2 aprovações", () => {
  const out = text(html(IntentRow, { ...rowProps, intent: base, currentUserId: "u3" }));
  assert.match(out, /Favorecido congelado na preparação: Nome: Fornecedor Alfa/);
  assert.match(out, /Agência: 0001/);
  assert.match(out, /parte do lançamento de R\$ 100,00 · parcela 2/);
  assert.match(out, /Risco Alto/);
  assert.match(out, /Faixas de valor das Configurações do Financeiro/);
  assert.match(out, /1 de 2 aprovações/);
  assert.match(out, /Aguardando aprovação/);
  assert.match(out, /Aprovar/);
  assert.doesNotMatch(out, /123456-7|fornecedor@alfa/);
  assert.doesNotMatch(out, CRU);
});

test("m4pg tela: quem preparou e quem já aprovou não veem o Aprovar; em execução aparece a fase do envio", () => {
  const mine = text(html(IntentRow, { ...rowProps, intent: base, currentUserId: "u1" }));
  assert.match(mine, /Você preparou: a aprovação é de outra pessoa/);
  const again = text(html(IntentRow, { ...rowProps, intent: base, currentUserId: "u2" }));
  assert.match(again, /Você já aprovou: falta outra pessoa/);
  const executing = text(html(IntentRow, { ...rowProps, intent: { ...base, status: "EXECUTING", submissionPhase: "UNCERTAIN" }, currentUserId: "u3" }));
  assert.match(executing, /Em execução: resposta do banco incerta/);
  assert.match(executing, /Consultar banco/);
  assert.doesNotMatch(executing, CRU);
});

test("m4pg tela: intenção invalidada pelo favorecido tem aviso próprio, diferente do cancelamento comum", () => {
  const invalidated = { ...base, status: "CANCELED", cancelReason: "Favorecido alterado (pixKey) na conta de destino depois da preparação: prepare uma nova intenção." };
  const out = text(html(IntentRow, { ...rowProps, intent: invalidated, currentUserId: "u3" }));
  assert.match(out, /Intenção invalidada: os dados bancários do favorecido mudaram/);
  assert.match(out, /\(chave PIX\)/);
  assert.match(out, /Invalidada/);
  const common = text(html(IntentRow, { ...rowProps, intent: { ...base, status: "CANCELED", cancelReason: "Fornecedor pediu para adiar" }, currentUserId: "u3" }));
  assert.doesNotMatch(common, /invalidada/i);
  assert.match(common, /Cancelada: Fornecedor pediu para adiar/);
  assert.match(text(html(IntentInvalidatedNotice, { intent: { status: "CANCELED", cancelReason: "Lançamento alterado após a preparação." } })), /Intenção invalidada: o lançamento mudou/);
  assert.equal(html(IntentInvalidatedNotice, { intent: { status: "CANCELED", cancelReason: "outro" } }), "");
});

test("m4pg tela: preparar pagamento mostra o saldo em aberto, a parcela e o campo de valor decimal", () => {
  const markup = html(PaymentIntentPrepare, { entry: { id: "e1", amount: "100.00" }, balanceCents: 7000, installmentNumber: 2, onCancel: noop, onCreated: noop });
  const out = text(markup);
  assert.match(out, /Saldo em aberto R\$ 70,00/);
  assert.match(out, /2ª deste lançamento/);
  assert.match(out, /Deixe em branco para pagar o saldo em aberto inteiro/);
  assert.match(markup, /id="intent-amount"/);
  assert.doesNotMatch(markup, /type="number"/);
});

test("m4pg tela: estorno pedido aparece como aguardando outra pessoa, com motivo e valor", () => {
  const out = text(html(PendingReversalNotice, { pendingCase: { id: "c1", amount: "100.00", reason: "cobrança duplicada", createdAt: "2026-11-10T12:00:00Z", payloadJson: { partialAmount: "25.00" } } }));
  assert.match(out, /aguardando a aprovação de outra pessoa/);
  assert.match(out, /R\$ 25,00 \(estorno parcial\)/);
  assert.match(out, /cobrança duplicada/);
  assert.equal(html(PendingReversalNotice, { pendingCase: null }), "");
});

test("m4pg tela: solicitar reabertura mostra o contador do mínimo e explica que o mês continua fechado", () => {
  const out = text(html(ReopenFormCard, { target: { referenceMonth: "2026-09", mode: "REOPEN" }, onCancel: noop, onDone: noop }));
  assert.match(out, /Solicitar reabertura de 09\/2026/);
  assert.match(out, /0 de 20 caracteres mínimos — faltam 20/);
  assert.match(out, /continua fechado até outra pessoa/);
  const back = text(html(ReopenFormCard, { target: { referenceMonth: "2026-09", mode: "RETURN" }, onCancel: noop, onDone: noop }));
  assert.match(back, /Devolver para aberto 09\/2026/);
  assert.doesNotMatch(back, /caracteres mínimos/);
});

test("m4pg tela: pedidos de reabertura com progresso; quem pediu não decide", () => {
  const requests = [
    { id: "r1", status: "PENDING", riskLevel: "CRITICAL", reason: "Lançamento de setembro classificado no centro de custo errado", requestedByUserId: "u1", requiredApprovals: 1, decisions: [], payloadJson: { referenceMonth: "2026-09" }, createdAt: "2026-11-10T12:00:00Z" },
  ];
  const other = text(html(ReopenRequestsCard, { requests, currentUserId: "u2", onChanged: noop }));
  assert.match(other, /Reabrir 09\/2026/);
  assert.match(other, /Risco Crítico/);
  assert.match(other, /0 de 1 aprovação/);
  assert.match(other, /Aprovar reabertura/);
  const mine = text(html(ReopenRequestsCard, { requests, currentUserId: "u1", onChanged: noop }));
  assert.match(mine, /Você fez este pedido: a decisão precisa ser de outra pessoa/);
  assert.doesNotMatch(mine, /Aprovar reabertura/);
  assert.match(text(html(ReopenRequestsCard, { requests: [], currentUserId: "u1", onChanged: noop })), /Nenhum pedido de reabertura aguardando decisão/);
});

test("m4pg telas: nenhum nome de estado antigo nas telas do Financeiro e o preparo não manda mais approvalRequestId", () => {
  const files = ["app/painel/financeiro/intencoes-pagamento/page.js", "app/painel/financeiro/intencoes-pagamento/IntentRow.js", "app/painel/financeiro/lancamentos/[id]/page.js",
    // a ficha foi dividida em cartões e hooks (M4LR): as ações e a baixa também não podem ter estado antigo
    "app/painel/financeiro/lancamentos/[id]/EntryActions.js", "app/painel/financeiro/lancamentos/[id]/useSettlementActions.js"];
  for (const file of files) {
    const src = read(file);
    assert.doesNotMatch(src, /"SUBMITTING"|"SUBMITTED"|"EXECUTED"|"CANCELLED"/, file);
    assert.ok(src.split("\n").length < 709, file);
  }
  for (const f of ["page.js", "useSettlementActions.js", "EntryActions.js"]) assert.doesNotMatch(read(`app/painel/financeiro/lancamentos/[id]/${f}`), /approvalRequestId/, f);
  assert.ok(read("app/painel/financeiro/intencoes-pagamento/page.js").split("\n").length <= 400);
  const api = read("lib/api/finance.js");
  assert.match(api, /createPaymentIntent\(\{ financialEntryId, amount \}\)/);
  assert.doesNotMatch(api, /approvalRequestId \? \{ approvalRequestId \}/);
});
