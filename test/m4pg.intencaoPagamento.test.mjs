// Marco 4 (Guia M4 §3 e §4; Caderno §8 e §9) — intenção de pagamento na tela: estados do livro e fase do envio ao banco, favorecido
// congelado, invalidação distinta do cancelamento comum, progresso "X de N aprovações", valor da parcela contra o saldo em aberto e as
// recusas da API em português.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTENT_STATUS_LABELS,
  approvalProgress,
  beneficiaryRows,
  hasApproved,
  intentAmountText,
  intentInvalidation,
  intentStatusLabel,
  intentStatusTone,
  isOpenIntent,
  isInFlight,
  isLegacySnapshot,
  openBalanceCents,
  nextInstallmentNumber,
  requiredApprovalsOf,
  riskSourceLabel,
  validateIntentAmount,
} from "@/lib/finance/paymentIntents.js";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors.js";

const CRU = /\b(DRAFT|PENDING_APPROVAL|APPROVED|EXECUTING|CONFIRMED|FAILED|CANCELED|SUBMITTING|SUBMITTED|UNCERTAIN|NOT_STARTED)\b/;

test("m4pg estados: os sete estados do Guia §3 têm rótulo em português e os nomes antigos saíram", () => {
  assert.deepEqual(Object.keys(INTENT_STATUS_LABELS), ["DRAFT", "PENDING_APPROVAL", "APPROVED", "EXECUTING", "CONFIRMED", "FAILED", "CANCELED"]);
  for (const label of Object.values(INTENT_STATUS_LABELS)) assert.doesNotMatch(label, CRU);
  for (const old of ["PENDING", "SUBMITTING", "SUBMITTED", "EXECUTED", "CANCELLED"]) assert.equal(INTENT_STATUS_LABELS[old], undefined, old);
  assert.equal(intentStatusLabel({ status: "WHATEVER" }), "Situação não reconhecida");
});

test("m4pg fase do envio: só aparece em EXECUTING; resposta incerta fica em tom de perigo", () => {
  assert.equal(intentStatusLabel({ status: "EXECUTING", submissionPhase: "SUBMITTING" }), "Em execução: enviando ao banco");
  assert.equal(intentStatusLabel({ status: "EXECUTING", submissionPhase: "SUBMITTED" }), "Em execução: enviado ao banco, aguardando confirmação");
  assert.equal(intentStatusLabel({ status: "EXECUTING", submissionPhase: "UNCERTAIN" }), "Em execução: resposta do banco incerta");
  assert.equal(intentStatusLabel({ status: "APPROVED", submissionPhase: "SUBMITTED" }), "Aprovada");
  assert.equal(intentStatusTone({ status: "EXECUTING", submissionPhase: "UNCERTAIN" }), "danger");
  assert.equal(intentStatusTone({ status: "EXECUTING", submissionPhase: "SUBMITTED" }), "warning");
  assert.equal(intentStatusTone({ status: "CONFIRMED" }), "success");
  assert.ok(isInFlight({ status: "EXECUTING" }));
  assert.ok(!isInFlight({ status: "APPROVED" }));
  for (const status of ["DRAFT", "PENDING_APPROVAL", "APPROVED", "EXECUTING"]) assert.ok(isOpenIntent({ status }), status);
  for (const status of ["CONFIRMED", "FAILED", "CANCELED"]) assert.ok(!isOpenIntent({ status }), status);
});

test("m4pg invalidação: favorecido ou lançamento alterado é distinto do cancelamento comum e mostra os campos em português", () => {
  const fav = intentInvalidation({ status: "CANCELED", cancelReason: "Favorecido alterado (pixKey, agency) na conta de destino depois da preparação: ..." });
  assert.equal(fav.kind, "BENEFICIARY");
  assert.match(fav.title, /Intenção invalidada/);
  assert.match(fav.reason, /\(chave PIX, agência\)/);
  assert.doesNotMatch(fav.reason, /pixKey|agency/);
  const lan = intentInvalidation({ status: "CANCELED", cancelReason: "Lançamento alterado após a preparação: a intenção..." });
  assert.equal(lan.kind, "ENTRY");
  assert.equal(intentInvalidation({ status: "CANCELED", cancelReason: "Fornecedor pediu para remarcar" }), null);
  assert.equal(intentInvalidation({ status: "PENDING_APPROVAL", cancelReason: "Favorecido alterado (pixKey)" }), null);
});

test("m4pg favorecido congelado: banco, agência, conta e PIX mascarados e nome, sem célula vazia", () => {
  const rows = beneficiaryRows({ name: "Fornecedor Alfa", bankCode: "341", branch: "0001", account: "123456-7", pixKey: "fornecedor@alfa.com.br" });
  const map = Object.fromEntries(rows);
  assert.equal(map.Nome, "Fornecedor Alfa");
  assert.match(map.Banco, /341/);
  assert.equal(map["Agência"], "0001");
  assert.doesNotMatch(map.Conta, /123456/);
  assert.match(map.Conta, /56-7$/);
  assert.doesNotMatch(map["Chave PIX"], /fornecedor@/);
  const empty = beneficiaryRows({ name: null, bankCode: null, branch: null, account: null, pixKey: null });
  for (const [, value] of empty) assert.ok(value && value.length > 2, value);
  assert.match(beneficiaryRows(null)[0][1], /Não congelado/);
  assert.ok(isLegacySnapshot({ snapshotJson: { amount: "1.00" } }));
  assert.ok(!isLegacySnapshot({ snapshotJson: { snapshotVersion: 2 } }));
});

test("m4pg aprovação: X de N com o número gravado pela API, origem do risco e quem já aprovou", () => {
  const approval = { riskLevel: "HIGH", requiredApprovals: 3, approvers: [{ approverUserId: "u2", decision: "APPROVED" }] };
  assert.equal(approvalProgress(approval).text, "1 de 3 aprovações");
  assert.equal(approvalProgress({ riskLevel: "LOW", requiredApprovals: 1, approvedCount: 0 }).text, "0 de 1 aprovação");
  assert.equal(approvalProgress({ riskLevel: "HIGH", approvedCount: 1 }).text, "1 de 2 aprovações", "pedido antigo sem o número usa a tabela de antes");
  assert.equal(approvalProgress(null), null);
  assert.equal(requiredApprovalsOf({ requiredApprovals: 4, riskLevel: "LOW" }), 4);
  assert.ok(hasApproved(approval, "u2"));
  assert.ok(!hasApproved(approval, "u3"));
  assert.match(riskSourceLabel("RULE"), /REG-FIN-002/);
  assert.match(riskSourceLabel("PARAMETERS"), /Faixas de valor/);
});

test("m4pg valor da parcela: vazio paga o saldo, parte gera texto decimal para a API e acima do saldo é recusado", () => {
  const entry = { id: "e1", amount: "100.00" };
  const all = [{ parentEntryId: "e1", status: "SETTLED", amount: "30.00" }, { parentEntryId: "e1", status: "PENDING", amount: "10.00" }, { parentEntryId: "x", status: "SETTLED", amount: "5" }];
  const balance = openBalanceCents(entry, all);
  assert.equal(balance, 7000);
  assert.equal(nextInstallmentNumber(entry, all), 2);
  assert.deepEqual(validateIntentAmount("", balance), { amount: null, cents: 7000, full: true, error: null });
  assert.deepEqual(validateIntentAmount("40,00", balance), { amount: "40.00", cents: 4000, full: false, error: null });
  assert.equal(validateIntentAmount("1.234,5", 200000).amount, "1234.50");
  assert.equal(validateIntentAmount("70", balance).full, true);
  assert.match(validateIntentAmount("70,01", balance).error, /saldo em aberto/);
  assert.match(validateIntentAmount("0", balance).error, /maior que zero/);
  assert.match(validateIntentAmount("abc", balance).error, /valor válido/);
  assert.match(validateIntentAmount("", 0).error, /não tem saldo/);
});

test("m4pg linha do valor: parcela aparece só quando é parte do lançamento", () => {
  assert.equal(intentAmountText({ amount: "40.00", installmentNumber: 1, snapshotJson: { entryAmount: "100.00" } }).replace(/\s/g, " "), "R$ 40,00 · parte do lançamento de R$ 100,00 · parcela 1");
  assert.doesNotMatch(intentAmountText({ amount: "100.00", installmentNumber: 1, snapshotJson: { entryAmount: "100.00" } }), /parcela/);
});

test("m4pg recusas da API em português: saldo, favorecido alterado, MFA e decisão repetida", () => {
  assert.match(financeAuthErrorMessage({ code: "FINANCE_PAYMENT_INTENT_AMOUNT_EXCEEDS_BALANCE", details: { amount: "80.00", openBalance: "70.00" } }).replace(/\s/g, " "), /R\$ 80,00.*R\$ 70,00/);
  const stale = financeAuthErrorMessage({ code: "FINANCE_PAYMENT_INTENT_STALE", details: { changedFields: ["beneficiary.pixKey", "beneficiary.account"] } });
  assert.match(stale, /chave PIX, conta/);
  assert.doesNotMatch(stale, /beneficiary/);
  assert.match(financeAuthErrorMessage({ code: "MFA_REQUIRED_NOT_ENABLED" }), /verificação em duas etapas/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_APPROVAL_DUPLICATE_DECISION" }), /já registrou/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_PAYMENT_INTENT_SELF_APPROVAL_FORBIDDEN" }), /outra pessoa/);
  assert.match(financeAuthErrorMessage({ code: "FINANCE_PAYMENT_INTENT_SNAPSHOT_OUTDATED" }), /prepare uma nova/);
  assert.match(financeAuthErrorMessage({ code: "X", message: "Failed to fetch" }), /conectar ao servidor/);
  assert.equal(financeAuthErrorMessage(null, "padrão"), "padrão");
});

test("m4pg Atividades: a mudança de estado da intenção aparece em português na trilha", async () => {
  const { summarizeChanges } = await import("@/lib/audit/humanize.js");
  const rows = summarizeChanges({ status: "PENDING_APPROVAL" }, { status: "EXECUTING" }, "PaymentIntent");
  const status = rows.find((r) => /situa|status/i.test(r.label));
  assert.ok(status, JSON.stringify(rows));
  assert.equal(status.before, "Pendente de aprovação");
  assert.equal(status.after, "Em execução");
  const canceled = summarizeChanges({ status: "APPROVED" }, { status: "CANCELED" }, "PaymentIntent").find((r) => /situa|status/i.test(r.label));
  assert.equal(canceled.after, "Cancelado");
});
