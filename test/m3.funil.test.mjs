// Funil do CRM pelo livro do Marco 3 §10: colunas na ordem do livro, códigos enviados à API e exibição de etapas antigas
// sem reescrever o dado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "@/lib/mock/opportunities.js";
import { toApiStage, fromApiStage, stageLabelPt, OTHER_STAGES_KEY } from "@/lib/api/crm.js";

const LIVRO = ["NEW", "QUALIFIED", "MATCHING", "VISIT_SCHEDULED", "VISITED", "PROPOSAL", "FINANCING", "CONTRACT", "CLOSED_WON", "CLOSED_LOST", "NURTURE"];

test("m3 funil: as colunas são as 11 etapas do livro, na ordem do §10, e mandam o código do livro à API", () => {
  assert.deepEqual(STAGES.map((s) => toApiStage(s.key)), LIVRO);
  for (const s of STAGES) assert.ok(s.label && !/[A-Z]{3,}_/.test(s.label), `rótulo em português: ${s.label}`);
});

test("m3 funil: o que a API devolve volta para a mesma coluna (ida e volta) e WON/LOST do livro caem em ganho/perdido", () => {
  for (const s of STAGES) assert.equal(fromApiStage(toApiStage(s.key)), s.key);
  assert.equal(fromApiStage("WON"), "ganho");
  assert.equal(fromApiStage("LOST"), "perdido");
});

test("m3 funil: etapa do quadro antigo é exibida na coluna equivalente; etapa desconhecida não cai em coluna do livro", () => {
  assert.equal(fromApiStage("NOVO"), "new");
  assert.equal(fromApiStage("CONTATO"), "qualified");
  assert.equal(fromApiStage("VISITA"), "visit_scheduled");
  assert.equal(fromApiStage("PROPOSTA"), "proposal");
  const keys = new Set(STAGES.map((s) => s.key));
  assert.equal(keys.has(fromApiStage("WITHDRAWN")), false);
  assert.equal(keys.has(OTHER_STAGES_KEY), false, "a coluna de outras etapas não é etapa do funil");
  assert.equal(stageLabelPt("WITHDRAWN"), "Desistência");
});
