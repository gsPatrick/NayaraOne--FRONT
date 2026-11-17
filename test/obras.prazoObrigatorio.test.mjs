// Segunda leva de 16/11/2026, Lote 4 (DI-BI2-3): a etapa da obra tem prazo obrigatório (M6:16 "Etapas possuem ... prazo")
// e a previsão de término da obra não é apagada depois que a execução começa (READY -> ACTIVE). Antes, o término previsto
// da etapa era "Opcional" e as duas telas mandavam `null` quando o campo ficava vazio.
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
  assert.match(page, /\.\.\.plannedEndPatch\(project\.status, editForm\.endsAtPlanned\)/);
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
