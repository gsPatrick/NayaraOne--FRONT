// Segunda leva de 16/11/2026, Lote 4 (DI-BI2-3): a etapa da obra tem prazo obrigatório (M6:16 "Etapas possuem ... prazo")
// e a previsão de término da obra não é apagada depois que a execução começa (READY -> ACTIVE). Antes, o término previsto
// da etapa era "Opcional" e as duas telas mandavam `null` quando o campo ficava vazio. DI-BI2-9: o mesmo vale para os
// outros campos do gate READY -> ACTIVE (orçamento, início e responsável da obra).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PLANNED_END_LOCKED_STATUSES,
  isPlannedEndLocked,
  canSaveStage,
  stageEndError,
  stageEndsAtPayload,
  plannedEndError,
  plannedEndHelper,
  plannedEndPatch,
  STAGE_END_REQUIRED_MESSAGE,
  PLANNED_END_HELPER_LOCKED,
  PLANNED_END_HELPER_OPEN,
  EXECUTION_FIELD_MESSAGES,
  executionFieldError,
  executionFieldPatch,
  hasExecutionFieldError,
} from "@/app/painel/obras/lista/[id]/scheduleRules.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const FORM = { name: "Fundação", sequence: "1", endsAt: "2027-03-31" };
const VAZIOS = ["", "   ", null, undefined];

test("etapa: sem término previsto o botão não habilita; com ele, habilita", () => {
  assert.equal(canSaveStage(FORM), true);
  for (const endsAt of VAZIOS) assert.equal(canSaveStage({ ...FORM, endsAt }), false, `endsAt=${JSON.stringify(endsAt)}`);
  assert.equal(canSaveStage({ ...FORM, name: " " }), false);
  assert.equal(canSaveStage({ ...FORM, sequence: "" }), false);
  assert.equal(canSaveStage(FORM, { endsAt: true }), false, "data inválida também barra");
  assert.equal(canSaveStage(FORM, { startsAt: true }), false);
  // Custo, código e responsável continuam opcionais na criação (exigidos só no início da etapa).
  assert.equal(canSaveStage({ ...FORM, stageCode: "", plannedCost: "", responsibleUserId: "" }), true);
});

test("etapa: o pedido leva sempre a data do prazo, nunca null", () => {
  assert.equal(stageEndsAtPayload("2027-03-31"), "2027-03-31T15:00:00.000Z", "meio-dia de São Paulo");
  for (const endsAt of VAZIOS) assert.equal(stageEndsAtPayload(endsAt), undefined);
  assert.equal(stageEndsAtPayload("lixo"), undefined, "data que não converte não vira null");
  assert.equal(stageEndError("", false), "", "sem aviso antes de tocar no campo");
  assert.equal(stageEndError("", true), STAGE_END_REQUIRED_MESSAGE);
  assert.equal(stageEndError("2027-03-31", true), "");
});

test("obra: a previsão de término fica travada só depois de READY -> ACTIVE", () => {
  assert.deepEqual([...PLANNED_END_LOCKED_STATUSES], ["ACTIVE", "PAUSED", "FINAL_INSPECTION", "DELIVERED", "WARRANTY", "CLOSED"]);
  for (const status of ["PLANNED", "BUDGETED", "READY", "CANCELLED"]) {
    assert.equal(isPlannedEndLocked(status), false, status);
    assert.equal(plannedEndError(status, ""), "", status);
    assert.equal(plannedEndHelper(status), PLANNED_END_HELPER_OPEN);
    assert.deepEqual(plannedEndPatch(status, ""), { endsAtPlanned: null }, "antes da execução apagar continua possível");
  }
  for (const status of PLANNED_END_LOCKED_STATUSES) {
    assert.equal(isPlannedEndLocked(status), true, status);
    assert.match(plannedEndError(status, ""), /não apagada/);
    assert.equal(plannedEndError(status, "2027-12-01"), "");
    assert.equal(plannedEndHelper(status), PLANNED_END_HELPER_LOCKED);
    for (const vazio of VAZIOS) assert.deepEqual(plannedEndPatch(status, vazio), {}, `${status}: vazio nunca vira null`);
    assert.deepEqual(plannedEndPatch(status, "lixo"), {}, `${status}: data que não converte nunca vira null`);
    assert.deepEqual(plannedEndPatch(status, "2027-12-01"), { endsAtPlanned: "2027-12-01T15:00:00.000Z" });
  }
});

test("tela da obra usa as regras: prazo da etapa obrigatório e nenhum null nas datas de prazo", () => {
  const page = read("app/painel/obras/lista/[id]/page.js");
  assert.doesNotMatch(page, /endsAt: dateOnlyInputToIso\(stageForm\.endsAt\) \|\| null/, "a forma antiga mandava null");
  assert.doesNotMatch(page, /endsAtPlanned: dateOnlyInputToIso\(editForm\.endsAtPlanned\) \|\| null/, "a forma antiga mandava null");
  assert.match(page, /endsAt: stageEndsAtPayload\(stageForm\.endsAt\)/);
  for (const field of ["responsibleUserId", "budgetAmount", "startsAt", "endsAtPlanned"]) {
    assert.match(page, new RegExp(`executionFieldPatch\\(project\\.status, "${field}", editForm\\.${field}\\)`), field);
  }
  assert.doesNotMatch(page, /responsibleUserId: editForm\.responsibleUserId \|\| null/, "a forma antiga apagava o responsável");
  assert.doesNotMatch(page, /startsAt: dateOnlyInputToIso\(editForm\.startsAt\) \|\| null/, "a forma antiga apagava o início");
  assert.doesNotMatch(page, /toNumber\(editForm\.budgetAmount\) : null/, "a forma antiga apagava o orçamento");
  assert.match(page, /hasExecutionFieldError\(project\.status, executionFields\(\)\)\}>Salvar alterações/);
  assert.match(page, /disabled=\{!canSaveStage\(stageForm, stageDateErrors\)\}/);
  // O campo de término previsto da etapa é obrigatório (antes: helper "Opcional").
  const endField = page.slice(page.indexOf('label="Término previsto"'), page.indexOf('id="m-stage-end"'));
  assert.ok(endField.length > 0);
  assert.match(endField, /\n\s+required\n/);
  assert.match(endField, /STAGE_END_HELPER/);
  assert.doesNotMatch(endField, /"Opcional"/);
  assert.match(page, /required=\{isPlannedEndLocked\(project\.status\)\}/);
  assert.ok(read("app/painel/obras/lista/[id]/scheduleRules.js").split("\n").length <= 400);
});

test("DI-BI2-9: orçamento, início e responsável da obra também não são apagados com a obra em execução", () => {
  for (const status of PLANNED_END_LOCKED_STATUSES) {
    for (const field of ["budgetAmount", "startsAt", "responsibleUserId", "endsAtPlanned"]) {
      for (const vazio of VAZIOS) {
        assert.deepEqual(executionFieldPatch(status, field, vazio), {}, `${status}/${field}: vazio nunca vira null`);
        assert.equal(executionFieldError(status, field, vazio), EXECUTION_FIELD_MESSAGES[field]);
      }
    }
    assert.equal(hasExecutionFieldError(status, { responsibleUserId: "", startsAt: "2026-10-01" }), true);
    assert.equal(hasExecutionFieldError(status, { responsibleUserId: "u1", startsAt: "2026-10-01", endsAtPlanned: "2027-01-01", budgetAmount: "0" }), false);
    assert.deepEqual(executionFieldPatch(status, "budgetAmount", "1.234,50"), { budgetAmount: 1234.5 });
    assert.deepEqual(executionFieldPatch(status, "budgetAmount", "0"), { budgetAmount: 0 }, "zero não é vazio");
    assert.deepEqual(executionFieldPatch(status, "budgetAmount", "abc"), {}, "número inválido nunca vira null");
    assert.deepEqual(executionFieldPatch(status, "startsAt", "2026-10-05"), { startsAt: "2026-10-05T15:00:00.000Z" });
    assert.deepEqual(executionFieldPatch(status, "responsibleUserId", "u2"), { responsibleUserId: "u2" });
  }
  for (const status of ["PLANNED", "BUDGETED", "READY", "CANCELLED"]) {
    for (const field of ["budgetAmount", "startsAt", "responsibleUserId", "endsAtPlanned"]) {
      assert.deepEqual(executionFieldPatch(status, field, ""), { [field]: null }, `${status}/${field}: apagar continua possível`);
      assert.equal(executionFieldError(status, field, ""), "");
    }
  }
  assert.match(EXECUTION_FIELD_MESSAGES.responsibleUserId, /não retirado/);
});
