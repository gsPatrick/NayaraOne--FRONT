// Fechamento M5 (front) — cada código que a API do Marco 5 grava/devolve tem rótulo em português; a máquina de
// estados do contrato é a do livro (sem CANCELLED como alvo); recusas da API viram texto claro; a cobrança reenvia o
// mesmo pedido com a mesma Idempotency-Key.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "@/lib/labels/juridico.js";
import { legalErrorMessage } from "@/lib/legal/legalErrors.js";
import { createRequestKeys, postIdempotent } from "@/lib/asyncState/requestKey.js";

// Códigos copiados da API (wt/api-m5): contracts.service CONTRACT_TYPES/VALID_TRANSITIONS, contractVersions (CHECK),
// template_versions (CHECK), guaranteeTypeData GUARANTEE_TYPES, guarantees.service GUARANTEE_STATUSES, inspections
// INSPECTION_TYPES/CONDITIONS, legal_deadlines (CHECK), requirementRules STAGES, leaseObligationSchedule PERIODICITIES.
const API = {
  contractTypes: ["SALE", "SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS", "LEASE", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN", "SERVICE", "CONSTRUCTION", "ADDENDUM", "KEY_DELIVERY", "USED_PROPERTY_DELIVERY"],
  transitions: {
    DRAFT: ["DOCUMENTS_PENDING", "LEGAL_REVIEW"], DOCUMENTS_PENDING: ["LEGAL_REVIEW"], LEGAL_REVIEW: ["APPROVED", "DRAFT"], APPROVED: ["SIGNING"],
    SIGNING: ["SIGNED", "APPROVED"], SIGNED: ["ACTIVE"], ACTIVE: ["SUSPENDED", "TERMINATED"], SUSPENDED: ["ACTIVE", "TERMINATED"], TERMINATED: ["CLOSED"],
  },
  versionStatuses: ["DRAFT", "APPROVED", "SUPERSEDED"],
  templateVersionStatuses: ["DRAFT", "PUBLISHED", "SUPERSEDED"],
  guaranteeTypes: ["GUARANTOR", "INSURANCE", "SECURITY_DEPOSIT", "CAPITALIZATION", "OTHER"],
  guaranteeStatuses: ["PENDING", "ACTIVE", "RELEASED", "CANCELLED"],
  inspectionTypes: ["ENTRY", "EXIT", "INTERMEDIATE", "FINAL"],
  conditions: ["NEW", "GOOD", "REGULAR", "DAMAGED"],
  deadlineStatuses: ["PENDING", "DONE", "CANCELLED"],
  stages: ["LEGAL_REVIEW", "LEGAL_APPROVAL", "SIGNING", "ACTIVATION", "KEY_DELIVERY"],
  periodicities: ["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ONE_TIME"],
  caseParties: ["PLAINTIFF", "DEFENDANT", "WITNESS", "THIRD_PARTY"],
  documentPurposes: ["DOCUMENT", "EVIDENCE", "PETITION", "DECISION", "NOTICE", "OTHER"],
  receivableBases: ["SETTLEMENT", "FINAL_JUDGMENT"],
};
const CRU = /\b[A-Z]{2,}_[A-Z_]+\b/;

function assertLabels(map, codes, what) {
  for (const code of codes) {
    assert.ok(map[code], `${what}: falta rótulo para ${code}`);
    assert.doesNotMatch(map[code], CRU, `${what}: rótulo de ${code} tem código cru`);
  }
}

test("m5fech rótulos: todo código do servidor tem rótulo em português", () => {
  assertLabels(L.CONTRACT_TYPE_LABELS, API.contractTypes, "tipo de contrato");
  assertLabels(L.CONTRACT_STATUS_LABELS, [...Object.keys(API.transitions), "CLOSED", "CANCELLED"], "status do contrato");
  assertLabels(L.CONTRACT_VERSION_STATUS_LABELS, API.versionStatuses, "versão do contrato");
  assertLabels(L.TEMPLATE_VERSION_STATUS_LABELS, API.templateVersionStatuses, "versão do modelo");
  assertLabels(L.GUARANTEE_TYPE_LABELS, [...API.guaranteeTypes, "DEPOSIT", "CAPITALIZATION_TITLE"], "tipo de garantia");
  assertLabels(L.GUARANTEE_STATUS_LABELS, API.guaranteeStatuses, "situação da garantia");
  assertLabels(L.INSPECTION_TYPE_LABELS, [...API.inspectionTypes, "CHECK_IN", "CHECK_OUT", "PERIODIC"], "tipo de vistoria");
  assertLabels(L.CONDITION_LABELS, API.conditions, "condição do item");
  assertLabels(L.DEADLINE_STATUS_LABELS, API.deadlineStatuses, "status do prazo");
  assertLabels(L.REQUIREMENT_STAGE_LABELS, API.stages, "etapa do checklist");
  assertLabels(L.OBLIGATION_PERIODICITY_LABELS, API.periodicities, "periodicidade");
  assertLabels(L.CASE_PARTY_ROLE_LABELS, API.caseParties, "parte do processo");
  assertLabels(L.CASE_DOCUMENT_PURPOSE_LABELS, API.documentPurposes, "documento do processo");
  assertLabels(L.CASE_RECEIVABLE_BASIS_LABELS, API.receivableBases, "base do recebível");
});

test("m5fech máquina de estados do contrato = a do livro; CANCELLED não é alvo nem origem", () => {
  for (const [from, targets] of Object.entries(API.transitions)) assert.deepEqual(L.allowedContractTransitions(from), targets, from);
  for (const targets of Object.values(L.CONTRACT_TRANSITIONS)) assert.ok(!targets.includes("CANCELLED"));
  assert.deepEqual(L.allowedContractTransitions("CANCELLED"), []);
  assert.deepEqual(L.allowedContractTransitions("CLOSED"), []);
});

test("m5fech tipos de criação: só códigos do livro (vinculados incluídos; garantia e vistoria sem os antigos)", () => {
  for (const t of L.LINKED_CONTRACT_TYPES) assert.ok(L.CONTRACT_TYPE_CREATE_OPTIONS.includes(t));
  assert.deepEqual(L.GUARANTEE_TYPES, API.guaranteeTypes);
  assert.deepEqual(L.INSPECTION_TYPES, API.inspectionTypes);
  assert.equal(L.normalizeGuaranteeType("DEPOSIT"), "SECURITY_DEPOSIT");
  assert.equal(L.normalizeInspectionType("CHECK_OUT"), "EXIT");
  assert.equal(L.INSPECTION_COUNTERPART.ENTRY, "EXIT");
});

const apiError = (code, extra = {}) => Object.assign(new Error(extra.message || "x"), { code, status: extra.status || 409, details: extra.details });

test("m5fech recusas da API em português: checklist pela descrição, sem código de exigência", () => {
  const text = legalErrorMessage(apiError("LEGAL_REQUIREMENTS_PENDING", {
    message: "Não é possível avançar para LEGAL_REVIEW: há requirement(s) obrigatório(s) pendente(s): LEASE_GUARANTEE, LEASE_INSPECTION.",
    details: { stage: "LEGAL_REVIEW", pending: [{ requirementCode: "LEASE_GUARANTEE", description: "Garantia locatícia." }, { requirementCode: "LEASE_INSPECTION", description: "Vistoria de entrada do imóvel." }] },
  }));
  assert.match(text, /Faltam documentos do checklist \(antes da análise jurídica\): Garantia locatícia; Vistoria de entrada do imóvel\./);
  assert.doesNotMatch(text, CRU);
});

test("m5fech recusas da API em português: termos travados, via assinada, origem do prazo, responsável, MFA e permissão", () => {
  assert.match(legalErrorMessage(apiError("LEGAL_CONTRACT_TERMS_LOCKED_USE_ADDENDUM")), /por aditivo/);
  assert.match(legalErrorMessage(apiError("LEGAL_KEY_DELIVERY_TERM_EVIDENCE_REQUIRED", { status: 400 })), /via do termo de entrega assinada/);
  assert.match(legalErrorMessage(apiError("DEADLINE_SOURCE_REQUIRED", { status: 400 })), /origem do prazo/);
  assert.match(legalErrorMessage(apiError("LEGAL_DEADLINE_NOT_RESPONSIBLE", { status: 403 })), /Só o responsável/);
  assert.match(legalErrorMessage(apiError("MFA_REQUIRED_NOT_ENABLED", { status: 403 })), /verificação em duas etapas/);
  assert.match(legalErrorMessage(apiError("MFA_STEP_UP_CANCELLED", { status: 403 })), /verificação em duas etapas/);
  assert.match(legalErrorMessage(apiError("PERMISSION_DENIED", { status: 403, details: { required: "lease.keys.deliver" } })), /entrega de chaves/);
  const generic = legalErrorMessage(apiError("X", { status: 400, message: 'O campo "dueAt" deve ser uma data válida (AAAA-MM-DD).' }));
  assert.doesNotMatch(generic, /dueAt/);
});

test("m5fech cobrança: reenvio do mesmo pedido repete a Idempotency-Key; pedido novo ou depois do sucesso troca", async () => {
  let n = 0;
  const keys = createRequestKeys(() => `k${++n}`);
  const seen = [];
  let fail = true;
  const fetcher = async (path, opts) => {
    seen.push(opts.idempotencyKey);
    assert.equal(opts.method, "POST");
    if (fail) throw new Error("rede caiu");
    return { ok: true };
  };
  await assert.rejects(postIdempotent(fetcher, "/billing/utility-obligations/1/payments", { amount: 10 }, keys));
  fail = false;
  await postIdempotent(fetcher, "/billing/utility-obligations/1/payments", { amount: 10 }, keys);
  await postIdempotent(fetcher, "/billing/utility-obligations/1/payments", { amount: 10 }, keys);
  await postIdempotent(fetcher, "/billing/utility-obligations/1/payments", { amount: 20 }, keys);
  assert.deepEqual(seen, ["k1", "k1", "k2", "k3"]);
  assert.equal(keys.size(), 0);
});
