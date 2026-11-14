// Marco 4 (Guia M4 §8 e §15; Caderno §16) — autorização em duas pessoas na tela: montagem das chamadas da API (preparar com valor,
// pedir estorno, casos de estorno, pedidos de reabertura), quem pode decidir, contador do motivo da reabertura, encaminhamento dos
// pedidos com fluxo próprio na tela de Aprovações, rótulos das permissões novas e do pedido de MFA.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DEDICATED_FLOWS,
  dedicatedFlowOf,
  decisionBlock,
  decisionProgress,
  pendingReopenFor,
  reasonCounter,
  validateReversalAmount,
} from "@/lib/finance/approvalFlows.js";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors.js";
import { permissionLabel } from "@/lib/rbac/permissionLabels.js";
import { labelFor } from "@/components/organisms/MfaStepUpHost/MfaStepUpHost.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

let calls;
beforeEach(() => {
  const storage = new Map();
  calls = [];
  globalThis.window = {
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    location: { pathname: "/painel", search: "", href: "" },
  };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    calls.push({ path: String(url).replace(/^.*\/api\/v1/, ""), method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ success: true, data: { id: "c1" } }) };
  };
});

test("m4pg API: preparar com valor (ou sem, para o saldo) e pedir estorno parcial com a confirmação", async () => {
  const { createPaymentIntent, reverseFinancialEntry, requestPeriodReopen } = await import("@/lib/api/finance.js");
  await createPaymentIntent({ financialEntryId: "e1", amount: "40.00" });
  await createPaymentIntent({ financialEntryId: "e1" });
  await reverseFinancialEntry("e1", "duplicado", { impactToken: "t" }, "10.00");
  await reverseFinancialEntry("e1", "duplicado", { impactToken: "t" });
  await requestPeriodReopen("2026-10", "Correção de lançamento lançado no mês errado");
  assert.deepEqual(calls[0], { path: "/finance/payment-intents", method: "POST", body: { financialEntryId: "e1", amount: "40.00" } });
  assert.deepEqual(calls[1].body, { financialEntryId: "e1" });
  assert.deepEqual(calls[2], { path: "/finance/entries/e1/reverse", method: "POST", body: { reason: "duplicado", amount: "10.00", confirmation: { impactToken: "t" } } });
  assert.deepEqual(calls[3].body, { reason: "duplicado", confirmation: { impactToken: "t" } });
  assert.deepEqual(calls[4], { path: "/finance/period-closures/reopen", method: "POST", body: { referenceMonth: "2026-10", reason: "Correção de lançamento lançado no mês errado" } });
});

test("m4pg API: casos de estorno e pedidos de reabertura (listar com filtro, aprovar, recusar)", async () => {
  const api = await import("@/lib/api/financeApprovals.js");
  await api.listReversalCases({ status: "PENDING", entryId: "e1" });
  await api.listReversalCases();
  await api.approveReversalCase("c1");
  await api.rejectReversalCase("c1", "lançamento correto");
  await api.listPeriodReopenRequests({ status: "PENDING" });
  await api.approvePeriodReopenRequest("r1");
  await api.rejectPeriodReopenRequest("r1");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), [
    "GET /finance/reversal-cases?status=PENDING&entryId=e1",
    "GET /finance/reversal-cases",
    "POST /finance/reversal-cases/c1/approve",
    "POST /finance/reversal-cases/c1/reject",
    "GET /finance/period-closures/reopen-requests?status=PENDING",
    "POST /finance/period-closures/reopen-requests/r1/approve",
    "POST /finance/period-closures/reopen-requests/r1/reject",
  ]);
  assert.deepEqual(calls[3].body, { reason: "lançamento correto" });
});

test("m4pg duas pessoas: quem pediu e quem já decidiu não decidem; progresso pelo número gravado no pedido", () => {
  const request = { status: "PENDING", requestedByUserId: "u1", requiredApprovals: 2, decisions: [{ approverUserId: "u2", decision: "APPROVED" }] };
  assert.equal(decisionBlock(request, "u1").allowed, false);
  assert.match(decisionBlock(request, "u1").reason, /outra pessoa/);
  assert.equal(decisionBlock(request, "u2").allowed, false);
  assert.equal(decisionBlock(request, "u3").allowed, true);
  assert.equal(decisionBlock({ ...request, status: "APPROVED" }, "u3").allowed, false);
  assert.equal(decisionProgress(request).text, "1 de 2 aprovações");
  assert.equal(decisionProgress({ requiredApprovals: 1 }).text, "0 de 1 aprovação");
});

test("m4pg reabertura: contador do motivo contra o mínimo e pedido pendente por mês", () => {
  assert.equal(reasonCounter("curto", 20).ok, false);
  assert.match(reasonCounter("curto", 20).text, /5 de 20 caracteres mínimos — faltam 15/);
  assert.equal(reasonCounter("  " + "x".repeat(20) + "  ", 20).ok, true, "espaços nas pontas não contam");
  assert.match(reasonCounter("x".repeat(25), 20).text, /mínimo de 20 atingido/);
  assert.equal(reasonCounter("", undefined).missing, 20, "padrão de 20 caracteres");
  const requests = [{ status: "PENDING", payloadJson: { referenceMonth: "2026-09" } }, { status: "REJECTED", payloadJson: { referenceMonth: "2026-10" } }];
  assert.ok(pendingReopenFor(requests, "2026-09"));
  assert.equal(pendingReopenFor(requests, "2026-10"), null);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_PERIOD_REOPEN_REASON_TOO_SHORT", details: { minChars: 50 } }), /50 caracteres/);
});

test("m4pg estorno parcial: vazio estorna o total; acima do lançamento é recusado", () => {
  assert.deepEqual(validateReversalAmount("", "100.00"), { amount: null, error: null });
  assert.deepEqual(validateReversalAmount("25,5", "100.00"), { amount: "25.50", error: null });
  assert.match(validateReversalAmount("100,01", "100.00").error, /não pode passar/);
  assert.match(validateReversalAmount("0", "100.00").error, /maior que zero/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_REVERSAL_ALREADY_REQUESTED" }), /aguardando aprovação/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_APPROVAL_SELF_APPROVAL_FORBIDDEN" }), /outra pessoa/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_APPROVAL_STALE" }), /invalidado/);
});

test("m4pg Aprovações: pedido com fluxo próprio vai para a ação certa e nunca para /decide", () => {
  assert.deepEqual(Object.keys(DEDICATED_FLOWS).sort(), ["LedgerReversal", "PaymentIntent", "PeriodReopen"]);
  assert.equal(dedicatedFlowOf({ relatedEntityType: "PaymentIntent" }).href, "/painel/financeiro/intencoes-pagamento");
  assert.equal(dedicatedFlowOf({ relatedEntityType: "LedgerReversal" }).href, "#estornos-pendentes");
  assert.equal(dedicatedFlowOf({ relatedEntityType: "PeriodReopen" }).href, "/painel/financeiro/fechamento");
  assert.equal(dedicatedFlowOf({ relatedEntityType: "FinancialEntry" }), null);
  const page = read("app/painel/financeiro/aprovacoes/page.js");
  assert.doesNotMatch(page, /REQUIRED_STEPS_BY_RISK/);
  assert.match(page, /requiredApprovalsOf\(r\)/);
  assert.match(page, /r\.status === "PENDING" && flow \? \(\s*<Link href=\{flow\.href\}>/);
  assert.match(read("app/painel/financeiro/aprovacoes/ReversalCasesCard.js"), /id="estornos-pendentes"/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_APPROVAL_USE_DEDICATED_FLOW" }), /própria tela/);
});

test("m4pg permissões: Pedir estorno e Reabrir período fechado têm rótulo e controlam os botões", () => {
  assert.equal(permissionLabel("finance:reverse"), "Financeiro: Pedir estorno");
  assert.equal(permissionLabel("finance:periodReopen"), "Financeiro: Reabrir período fechado");
  assert.equal(permissionLabel("finance:settle"), "Financeiro: Liquidar");
  assert.match(read("app/painel/financeiro/lancamentos/[id]/ReversalRequest.js"), /requires="finance:reverse"/);
  assert.match(read("app/painel/financeiro/fechamento/page.js"), /requires="finance:periodReopen"[\s\S]{0,200}Solicitar reabertura/);
  assert.match(read("app/painel/financeiro/fechamento/ReopenRequestsCard.js"), /requires="finance:periodReopen"/);
  assert.match(read("app/painel/atividades/page.js"), /permission: "finance:reverse"/);
});

test("m4pg MFA: o pedido do código diz qual ação está sendo confirmada", () => {
  assert.equal(labelFor("/finance/payment-intents/x/approve"), "aprovar o pagamento");
  assert.equal(labelFor("/finance/reversal-cases/x/approve"), "aprovar o estorno");
  assert.equal(labelFor("/settings/exportacao.limite_linhas"), "alterar o parâmetro", "chave de parâmetro com \"export\" é parâmetro");
  assert.equal(labelFor("/legal/evidence-packages/x/export"), "exportar os dados");
  assert.equal(labelFor("/finance/reversal-cases/x/reject"), "recusar o estorno");
  assert.equal(labelFor("/finance/entries/x/reverse"), "pedir o estorno");
  assert.equal(labelFor("/finance/period-closures/reopen"), "pedir a reabertura do período");
  assert.equal(labelFor("/finance/period-closures/reopen-requests/x/approve"), "aprovar a reabertura do período");
  assert.equal(labelFor("/finance/period-closures/reopen-requests/x/reject"), "recusar a reabertura do período");
  assert.equal(labelFor("/settings/pagamentos.faixa.baixo_ate"), "alterar o parâmetro");
});
