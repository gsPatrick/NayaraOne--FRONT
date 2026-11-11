// Correções do Marco 3 no Front (DI-M3CA): motivos de desfecho vindos da API, responsável obrigatório, proposta com imóvel,
// funil com os códigos do livro (WON/LOST) e rótulos dos motivos configurados no painel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toReasonOptions, ownerError, ownerPatch, lostReasonLabels, proposalPropertyFor, proposalPropertyError, OUTCOME_REASON_FIELD } from "@/app/painel/crm/opportunityRules.js";
import { toApiStage, fromApiStage } from "@/lib/api/crm.js";

const CATALOGO = {
  won: [{ code: "PRICE_ACCEPTED", label: "Preço aceito" }],
  lost: [{ code: "IMOVEL_VENDIDO", label: "Imóvel vendido a outro" }],
  withdrawal: [{ code: "CLIENT_GAVE_UP", label: "Cliente desistiu" }],
};

test("m3ca: as opções de motivo são as da empresa; desistência entra na lista do perdido", () => {
  const opcoes = toReasonOptions(CATALOGO);
  assert.deepEqual(opcoes.ganho, [{ value: "PRICE_ACCEPTED", label: "Preço aceito" }]);
  assert.deepEqual(opcoes.perdido, [
    { value: "IMOVEL_VENDIDO", label: "Imóvel vendido a outro" },
    { value: "CLIENT_GAVE_UP", label: "Desistência: Cliente desistiu" },
  ]);
  assert.deepEqual(toReasonOptions(null), { ganho: [], perdido: [] });
  assert.deepEqual(OUTCOME_REASON_FIELD, { ganho: "wonReason", perdido: "lostReason" });
});

test("m3ca: oportunidade sem responsável não é enviada; na edição o responsável só vai quando muda e nunca vazio", () => {
  assert.match(ownerError(""), /responsável/);
  assert.equal(ownerError("u-1"), "");
  assert.deepEqual(ownerPatch("u-1", "u-1"), {});
  assert.deepEqual(ownerPatch("u-1", ""), {});
  assert.deepEqual(ownerPatch("u-1", "u-2"), { ownerUserId: "u-2" });
});

test("m3ca: ganho e perdido vão à API como WON e LOST (códigos do livro) e voltam para a mesma coluna", () => {
  assert.equal(toApiStage("ganho"), "WON");
  assert.equal(toApiStage("perdido"), "LOST");
  assert.equal(fromApiStage("WON"), "ganho");
  assert.equal(fromApiStage("LOST"), "perdido");
});

test("m3ca: proposta vem com o imóvel da oportunidade e não sai sem imóvel", () => {
  const ops = [{ id: "o1", propertyId: "p1" }, { id: "o2", propertyId: null }];
  assert.equal(proposalPropertyFor("o1", ops), "p1");
  assert.equal(proposalPropertyFor("o2", ops), "");
  assert.match(proposalPropertyError(""), /imóvel/);
  assert.equal(proposalPropertyError("p1"), "");
});

test("m3ca: o painel usa os rótulos dos motivos configurados (perda e desistência)", () => {
  assert.deepEqual(lostReasonLabels(CATALOGO), { IMOVEL_VENDIDO: "Imóvel vendido a outro", CLIENT_GAVE_UP: "Cliente desistiu" });
});
