// Correções da verificação do Marco 5 (contratos, modelos, cláusulas, NAY e eventos) — regras de exibição do Front que espelham a
// API: aprovação da versão com a permissão do livro (contracts.version.approve), tipos de contrato do Caderno §3, política do
// checklist (REG-JUR-001) em português, homologação da cláusula e minuta sugerida pela NAY.
import { test } from "node:test";
import assert from "node:assert/strict";
import { VERSION_APPROVE_PERMISSION, transitionNeedsVersionApprove, canShowVersionApproval } from "@/lib/legal/versionApproval.js";
import { CONTRACT_TYPE_CREATE_OPTIONS, CONTRACT_TYPE_LABELS, TEMPLATE_CONTRACT_TYPES } from "@/lib/labels/juridico.js";
import { describeWhen, policyRows, parsePolicyJson, reasonError } from "@/lib/legal/requirementRules.js";
import { canHomologate, homologationLabel } from "@/lib/legal/clauseHomologation.js";
import { draftMethodLabel, canDecideDraft, DRAFT_STATUS_LABELS } from "@/lib/legal/nayDraft.js";
import { legalErrorMessage } from "@/lib/legal/legalErrors.js";

const CRU = /\b[A-Z]{2,}_[A-Z_]+\b/;

test("M5-A0323: a aprovação da versão usa a permissão do livro e a transição para APPROVED também", () => {
  assert.equal(VERSION_APPROVE_PERMISSION, "contracts.version.approve");
  assert.equal(transitionNeedsVersionApprove("APPROVED"), true);
  for (const t of ["DRAFT", "DOCUMENTS_PENDING", "LEGAL_REVIEW", "SIGNING", "SIGNED", "ACTIVE", "TERMINATED"]) assert.equal(transitionNeedsVersionApprove(t), false, t);
  assert.equal(canShowVersionApproval("LEGAL_REVIEW", true), true);
  assert.equal(canShowVersionApproval("LEGAL_REVIEW", false), false, "sem a permissão o botão some");
  assert.equal(canShowVersionApproval("SIGNED", true), false);
  const negado = legalErrorMessage({ status: 403, code: "PERMISSION_DENIED", details: { required: "contracts.version.approve" } });
  assert.match(negado, /aprovação da versão do contrato/);
});

test("L64 §3: contrato novo só oferece os códigos do Caderno — SERVICE e os genéricos antigos ficam fora", () => {
  const LIVRO = ["SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN", "CONSTRUCTION", "ADDENDUM", "KEY_DELIVERY", "USED_PROPERTY_DELIVERY"];
  assert.deepEqual([...CONTRACT_TYPE_CREATE_OPTIONS].sort(), [...LIVRO].sort());
  for (const antigo of ["SERVICE", "SALE", "LEASE"]) assert.match(CONTRACT_TYPE_LABELS[antigo], /código antigo/, "linha antiga continua legível");
  assert.ok(TEMPLATE_CONTRACT_TYPES.includes("USED_PROPERTY_DELIVERY"), "o termo do imóvel usado é modelo de contrato (linha 69)");
  assert.match(legalErrorMessage({ code: "LEGAL_CONTRACT_TYPE_NOT_IN_BOOK" }), /não existe no catálogo/);
});

test("linha 65: a política do checklist aparece em português (condições sobre partes e imóvel) e o JSON é conferido antes de publicar", () => {
  const facts = { "property.isNew": "O imóvel é casa nova (nasceu de obra da empresa).", "parties.anyPJ": "Alguma parte é pessoa jurídica." };
  assert.equal(describeWhen({ fact: "property.isNew", op: "==", value: true }, facts), "O imóvel é casa nova (nasceu de obra da empresa): é sim");
  assert.equal(describeWhen(null, facts), "Sempre");
  assert.match(describeWhen({ and: [{ fact: "parties.anyPJ", op: "==", value: true }, { fact: "property.isNew", op: "==", value: false }] }, facts), / e /);
  const action = { templates: { KEY_DELIVERY: [{ requirementCode: "NEW_KEYS", requirementType: "KEYS", description: "Chaves.", when: { fact: "property.isNew", op: "==", value: true } }] }, typeToTemplate: { KEY_DELIVERY: "KEY_DELIVERY" } };
  const [row] = policyRows(action, facts);
  assert.equal(row.typeLabel, "Termo de entrega de chaves");
  assert.equal(row.items[0].stage, "Antes da revisão jurídica");
  assert.doesNotMatch(row.items[0].condition, CRU);
  assert.equal(parsePolicyJson("{").ok, false);
  assert.match(parsePolicyJson(JSON.stringify({ templates: {}, typeToTemplate: { SALE_CASH: "X" } })).error, /SALE_CASH/);
  assert.equal(parsePolicyJson(JSON.stringify(action)).ok, true);
  assert.ok(reasonError("abc"));
  assert.equal(reasonError("Exigir o regimento do condomínio"), "");
  assert.match(legalErrorMessage({ code: "LEGAL_REQUIREMENT_TEMPLATE_KEY_NOT_ACCEPTED" }), /regra da empresa/);
});

test("linha 124: homologar só aparece para outra pessoa com a alçada; a minuta só é decidida enquanto pendente", () => {
  const clause = { id: "c1", isActive: true, homologationStatus: "PENDING", createdBy: "autor" };
  assert.equal(canHomologate(clause, { userId: "revisor", canApprove: true }), true);
  assert.equal(canHomologate(clause, { userId: "autor", canApprove: true }), false, "quem escreveu não homologa");
  assert.equal(canHomologate(clause, { userId: "revisor", canApprove: false }), false);
  assert.equal(canHomologate({ ...clause, homologationStatus: "HOMOLOGATED" }, { userId: "revisor", canApprove: true }), false);
  assert.equal(canHomologate({ ...clause, isActive: false }, { userId: "revisor", canApprove: true }), false);
  assert.deepEqual(homologationLabel(clause), { text: "Não homologada", tone: "warning" });
  assert.equal(draftMethodLabel({ metodo: "AI" }), "Escolhida pela IA entre as cláusulas homologadas");
  assert.equal(draftMethodLabel({ metodo: "RULE_BASED", motivoDoModo: "IA_DESLIGADA" }), "Montada pela regra (IA desligada na empresa)");
  assert.doesNotMatch(draftMethodLabel({ metodo: "RULE_BASED", motivoDoModo: "QUALQUER_CODIGO" }), CRU);
  assert.equal(canDecideDraft({ status: "PENDING_REVIEW" }, true), true);
  assert.equal(canDecideDraft({ status: "ACCEPTED" }, true), false);
  assert.equal(canDecideDraft({ status: "PENDING_REVIEW" }, false), false);
  for (const s of ["PENDING_REVIEW", "ACCEPTED", "DISCARDED"]) assert.ok(DRAFT_STATUS_LABELS[s]);
  for (const code of ["LEGAL_CLAUSE_HOMOLOGATION_SELF_BLOCKED", "LEGAL_NAY_DRAFT_STALE", "LEGAL_NAY_DRAFT_NO_HOMOLOGATED_CLAUSES", "LEGAL_USED_PROPERTY_TERM_MODEL_NOT_PUBLISHED"]) {
    assert.doesNotMatch(legalErrorMessage({ code }), CRU, code);
  }
});
