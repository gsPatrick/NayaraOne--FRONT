// Fechamento M5 (vistorias/prazos) — regras da tela que antecipam a API: entrega de chaves (identificação, via assinada, fotos mínimas),
// destinatário da notificação, laudo assinado imutável, comparação pela NAY, vencimentos das obrigações da locação, bases do recebível
// do processo, recusas novas da API em português e rótulos das ações novas de auditoria.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { distinctFiles, keyReleaseProblems, minPhotosOf, minPhotosText } from "@/lib/legal/keyDeliveryRelease.js";
import { hasNoticeRecipient } from "@/lib/legal/noticeRecipient.js";
import { fullySignedAt, inspectionReportState, REPORT_STATE } from "@/lib/legal/inspectionReport.js";
import { comparisonRows, decidedStatus, nayComparisonView, rejectReasonProblem, sourceText } from "@/lib/legal/inspectionNay.js";
import { isIsoDate, openCycles, paymentPayload, paymentProblems, waiveReasonProblem, CYCLE_STATUS_LABELS } from "@/lib/legal/obligationCycles.js";
import { receivableBasisOptions } from "@/lib/legal/receivableBases.js";
import { legalErrorMessage } from "@/lib/legal/legalErrors.js";
import { auditActionLabel } from "@/lib/audit/actionLabels.js";
import { activityTitle } from "@/lib/audit/activityPresent.js";
import { entityTypeLabel } from "@/lib/audit/labels.js";

const CRU = /\b[A-Z]{2,}_[A-Z_]+\b/;
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const apiError = (code, extra = {}) => Object.assign(new Error(extra.message || "x"), { code, status: extra.status || 400, details: extra.details });

test("m5vp entrega de chaves: identificação obrigatória, via assinada e o mínimo de fotos diferentes da política", () => {
  const ok = { keysCount: "2", keysIdentification: "2 chaves da porta", hasTermFile: true, photoCount: 2, minPhotos: 2 };
  assert.deepEqual(keyReleaseProblems(ok), []);
  assert.match(keyReleaseProblems({ ...ok, keysIdentification: "   " }).join(" "), /identificação/);
  assert.match(keyReleaseProblems({ ...ok, keysCount: "0" }).join(" "), /quantidade/);
  assert.match(keyReleaseProblems({ ...ok, keysCount: "1,5" }).join(" "), /inteiro/);
  assert.match(keyReleaseProblems({ ...ok, hasTermFile: false }).join(" "), /via do termo/);
  assert.match(keyReleaseProblems({ ...ok, photoCount: 1 }).join(" "), /pelo menos 2 fotos diferentes .*anexadas: 1/);
  assert.deepEqual(keyReleaseProblems({ ...ok, photoCount: 0, minPhotos: 0 }), []);
  assert.equal(minPhotosOf({ photosRequired: true, minPhotos: 3 }), 3);
  assert.equal(minPhotosOf({ photosRequired: false, minPhotos: 3 }), 0);
  assert.equal(minPhotosOf({ photosRequired: true }), 1);
  assert.equal(minPhotosOf(null), 0);
  assert.equal(minPhotosText(1), "mínimo de 1 foto");
  assert.equal(minPhotosText(4), "mínimo de 4 fotos");
  const a = { name: "a.jpg", size: 10, lastModified: 1 };
  assert.equal(distinctFiles([a, { ...a }, { ...a, name: "b.jpg" }]).length, 2);
  const modal = read("app/painel/contratos/entrega-chaves/[id]/ReleaseKeysModal.js");
  assert.match(modal, /disabled=\{busy \|\| problems\.length > 0\}/);
  assert.match(modal, /keysIdentification: form\.keysIdentification\.trim\(\),/);
});

test("m5vp notificação: destinatário é a pessoa escolhida ou uma descrição que não seja só espaço", () => {
  assert.equal(hasNoticeRecipient({ recipientPersonId: "p1" }), true);
  assert.equal(hasNoticeRecipient({ recipientDescription: " Locatário — João " }), true);
  assert.equal(hasNoticeRecipient({ recipientDescription: "   " }), false);
  assert.equal(hasNoticeRecipient({}), false);
  assert.equal(hasNoticeRecipient(), false);
  assert.match(read("app/painel/contratos/notificacoes/page.js"), /!hasNoticeRecipient\(createForm\)\}>Criar como rascunho/);
  assert.match(read("app/painel/contratos/notificacoes/NoticeVersions.js"), /!recipientOk\}>Criar nova versão/);
});

test("m5vp laudo: assinado por locador e locatário e emitido depois disso fica imutável", () => {
  const sigs = [{ partyRole: "LANDLORD", signedAt: "2026-11-01T10:00:00Z" }, { partyRole: "TENANT", signedAt: "2026-11-02T10:00:00Z" }];
  assert.equal(fullySignedAt(sigs).toISOString(), "2026-11-02T10:00:00.000Z");
  assert.equal(fullySignedAt([sigs[0], { partyRole: "GUARANTOR", signedAt: "2026-11-03T10:00:00Z" }]), null);
  const done = { status: "COMPLETED" };
  assert.equal(inspectionReportState({ status: "SCHEDULED" }, sigs), REPORT_STATE.UNAVAILABLE);
  assert.equal(inspectionReportState(done, sigs), REPORT_STATE.MISSING);
  const before = { ...done, reportHash: "h", reportGeneratedAt: "2026-11-01T12:00:00Z" };
  assert.equal(inspectionReportState(before, [sigs[0]]), REPORT_STATE.DRAFT);
  assert.equal(inspectionReportState(before, sigs), REPORT_STATE.NEEDS_SIGNED);
  assert.equal(inspectionReportState({ ...done, reportHash: "h", reportGeneratedAt: "2026-11-02T10:00:00Z" }, sigs), REPORT_STATE.FROZEN);
  assert.match(legalErrorMessage(apiError("LEGAL_INSPECTION_REPORT_FROZEN", { status: 409 })), /Laudo assinado é imutável|laudo assinado é imutável/i);
  assert.match(legalErrorMessage(apiError("LEGAL_INSPECTION_REPORT_FROZEN", { status: 409 })), /revisão/);
});

test("m5vp NAY: com IA mostra resposta, fontes e sugestões; desligada mostra a comparação item a item", () => {
  const det = nayComparisonView({ mode: "DETERMINISTIC", reason: "AI_OFF", comparison: { divergences: [{ itemName: "Sala — Piso", entryCondition: "GOOD", exitCondition: "DAMAGED" }] }, nay: null });
  assert.equal(det.aiMode, false);
  assert.equal(det.notice, "A NAY está desligada; abaixo a comparação item a item.");
  assert.equal(comparisonRows(det.comparison)[0].after, "DAMAGED");
  assert.match(nayComparisonView({ mode: "DETERMINISTIC", reason: "AI_PROVIDER_UNAVAILABLE", comparison: {} }).notice, /não respondeu/);
  const ai = nayComparisonView({
    mode: "AI",
    comparison: { items: [{ itemName: "Piso", before: "GOOD", after: "GOOD", changed: false }] },
    nay: { answer: " O piso da sala mudou. ", runId: "r1", sources: [{ ref: "s1", title: "Vistoria de saída", clause: "Sala — Piso", excerpt: "Danificado" }], recommendations: [{ id: "x", title: "Piso danificado", status: "PENDING" }] },
  });
  assert.equal(ai.aiMode, true);
  assert.equal(ai.answer, "O piso da sala mudou.");
  assert.equal(ai.runId, "r1");
  assert.equal(ai.recommendations.length, 1);
  assert.deepEqual(sourceText(ai.sources[0]), { head: "Vistoria de saída — Sala — Piso", excerpt: "Danificado" });
  assert.equal(nayComparisonView({ mode: "AI", nay: { answer: "", sources: [] } }).blocked, true);
  assert.equal(comparisonRows({ items: [{ changed: false }] }).length, 1);
  assert.match(rejectReasonProblem("ok"), /mínimo 5 caracteres/);
  assert.match(rejectReasonProblem("x".repeat(501)), /500/);
  assert.equal(rejectReasonProblem("  não procede  "), "");
  assert.equal(decidedStatus({ recommendation: { status: "REJECTED" } }, "ACCEPTED"), "REJECTED");
  assert.equal(decidedStatus(null, "ACCEPTED"), "ACCEPTED");
  const api = read("lib/api/legalLease.js");
  assert.match(api, /apiFetch\("\/legal\/nay\/inspections\/compare", \{ method: "POST", body: \{ entryInspectionId, exitInspectionId \} \}\)/);
  const ai2 = read("lib/api/aiRecommendations.js");
  assert.match(ai2, /\/ai\/recommendations\/\$\{encodeURIComponent\(id\)\}\/accept`, \{ method: "POST", body: \{\} \}/);
  assert.match(ai2, /\/reject`, \{ method: "POST", body: \{ reason \} \}/);
});

test("m5vp obrigações: pagamento exige comprovante e vencimento; dispensa exige motivo de 10 caracteres", () => {
  const cycles = [
    { id: "c3", dueOn: "2026-12-10", status: "OPEN" },
    { id: "c1", dueOn: "2026-10-10", status: "PAID" },
    { id: "c2", dueOn: "2026-11-10", status: "OVERDUE" },
    { id: "c0", dueOn: "2026-09-10", status: "WAIVED" },
  ];
  assert.deepEqual(openCycles(cycles).map((c) => c.id), ["c2", "c3"]);
  for (const code of ["OPEN", "OVERDUE", "PAID", "WAIVED"]) assert.ok(CYCLE_STATUS_LABELS[code] && !CRU.test(CYCLE_STATUS_LABELS[code]));
  const base = { amount: "150,90", proofFileId: "f1", cycleId: "c2", referenceDueOn: "", hasOpenCycles: true };
  assert.deepEqual(paymentProblems(base), []);
  assert.match(paymentProblems({ ...base, proofFileId: "" }).join(" "), /comprovante/);
  assert.match(paymentProblems({ ...base, cycleId: "" }).join(" "), /Escolha o vencimento/);
  assert.match(paymentProblems({ ...base, amount: "abc" }).join(" "), /valor/);
  assert.match(paymentProblems({ ...base, amount: "0" }).join(" "), /valor/);
  assert.match(paymentProblems({ ...base, hasOpenCycles: false, cycleId: "", referenceDueOn: "2026-02-31" }).join(" "), /data do vencimento/);
  assert.deepEqual(paymentProblems({ ...base, hasOpenCycles: false, cycleId: "", referenceDueOn: "2026-02-28" }), []);
  assert.deepEqual(paymentPayload({ amount: "1.546,73", paidByParty: "TENANT", proofFileId: "f1", cycleId: "c2", referenceDueOn: "2026-01-01" }), { amount: 1546.73, paidByParty: "TENANT", proofFileId: "f1", cycleId: "c2" });
  assert.deepEqual(paymentPayload({ amount: "10", paidByParty: "COMPANY", proofFileId: "f1", cycleId: "", referenceDueOn: "2026-01-05" }), { amount: 10, paidByParty: "COMPANY", proofFileId: "f1", referenceDueOn: "2026-01-05" });
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.match(waiveReasonProblem("curto"), /10 caracteres/);
  assert.equal(waiveReasonProblem("pago pelo proprietário direto"), "");
  const closeout = read("app/painel/contratos/locacao/CloseoutTab.js");
  assert.match(closeout, /OVERDUE_OBLIGATION_CYCLE: "Obrigação da locação vencida sem comprovante"/);
  assert.match(closeout, /PENDING_REIMBURSEMENT: "Reembolso de utilidade a receber"/);
});

test("m5vp recebível: bases vindas da API, rótulo da tela, sem repetição nem código cru", () => {
  const options = receivableBasisOptions([
    { code: "SETTLEMENT", label: "acordo homologado" },
    { code: "EXTRAJUDICIAL_TITLE", label: "título executivo extrajudicial" },
    { code: "SETTLEMENT", label: "acordo homologado" },
    { code: "NEW_BASIS", label: "base nova da API" },
    { code: "NO_LABEL" },
  ]);
  assert.deepEqual(options, [
    { code: "SETTLEMENT", label: "Acordo homologado" },
    { code: "EXTRAJUDICIAL_TITLE", label: "Título executivo extrajudicial" },
    { code: "NEW_BASIS", label: "Base nova da API" },
  ]);
  assert.deepEqual(receivableBasisOptions(null), []);
  assert.match(read("app/painel/contratos/processos/[id]/CaseReceivableCard.js"), /listReceivableBases\(\)/);
});

test("m5vp recusas novas da API em português, sem código cru", () => {
  const cases = {
    LEGAL_KEY_DELIVERY_IDENTIFICATION_REQUIRED: /identificação das chaves/,
    LEGAL_KEY_DELIVERY_GUARANTEE_REQUIRED: /não substitui a garantia/,
    LEGAL_NOTICE_RECIPIENT_REQUIRED: /destinatário/,
    LEGAL_GUARANTEE_REPLACED_IMMUTABLE: /substituída/,
    LEGAL_GUARANTEE_VALIDITY_REQUIRED: /fim da vigência/,
    LEGAL_GUARANTEE_ACTIVE_DATA_REQUIRED: /Garantia ativa/,
    LEGAL_CASE_RECEIVABLE_BASIS_INVALID: /base jurídica/,
    UTILITY_RECEIPT_REQUIRED: /comprovante/,
    UTILITY_RECEIPT_NOT_FOUND: /comprovante/,
    UTILITY_RECEIPT_ALREADY_USED: /outro vencimento/,
    UTILITY_CYCLE_ALREADY_SETTLED: /pago ou dispensado/,
    UTILITY_PAYMENT_CYCLE_REQUIRED: /vencimento/,
    UTILITY_CYCLE_NOT_FOUND: /vencimento/,
    UTILITY_WAIVE_REASON_REQUIRED: /10 caracteres/,
  };
  for (const [code, re] of Object.entries(cases)) {
    const text = legalErrorMessage(apiError(code, { message: `"campoInterno" ${code}` }));
    assert.match(text, re, code);
    assert.doesNotMatch(text, CRU, code);
  }
  assert.match(legalErrorMessage(apiError("LEGAL_KEY_DELIVERY_PHOTOS_REQUIRED", { status: 409, details: { minPhotos: 3, informed: 1 } })), /no mínimo 3 fotos diferentes .* foram anexadas 1/);
  assert.match(legalErrorMessage(apiError("LEGAL_KEY_DELIVERY_PHOTOS_REQUIRED", { status: 409, details: { minPhotos: 1, informed: 0 } })), /no mínimo 1 foto diferente .* nenhuma foi anexada/);
  assert.match(legalErrorMessage(apiError("LEGAL_KEY_DELIVERY_REQUIREMENTS_PENDING", { status: 409, details: { missingRequirementCodes: ["LEASE_GUARANTEE", "X"] } })), /entregar as chaves.*2 exigências pendentes/);
  assert.match(legalErrorMessage(apiError("PERMISSION_DENIED", { status: 403, details: { required: "billing:approve" } })), /aprovação na cobrança/);
});

test("m5vp auditoria: ações novas com nome em português e tipos novos traduzidos", () => {
  for (const action of [
    "legal.evidence.file_access", "legal.evidence_package.list", "billing.lease_obligation.advance", "billing.lease_obligation_cycle.pay",
    "billing.lease_obligation_cycle.overdue", "billing.lease_obligation_cycle.waive", "billing.lease_obligation.overdue", "billing.penalty_rule.publish",
    "legal.deadline.occurrence_open",
  ]) {
    assert.ok(auditActionLabel(action), action);
    assert.equal(activityTitle({ action, entityType: "X" }), auditActionLabel(action));
  }
  assert.equal(auditActionLabel("legal.evidence.file_access"), "Prova acessada");
  assert.equal(auditActionLabel("legal.evidence_package.list"), "Lista de dossiês consultada");
  assert.equal(activityTitle({ action: "billing.lease_obligation_cycle.pay", reason: "Pagamento registrado com comprovante." }), "Pagamento registrado com comprovante.");
  assert.equal(entityTypeLabel("LeaseObligationCycle"), "Vencimento de obrigação da locação");
});
