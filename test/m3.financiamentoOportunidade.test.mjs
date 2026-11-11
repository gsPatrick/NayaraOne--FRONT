// CAD-09 (Marco 3 §9): o status do financiamento vinculado aparece na oportunidade (retrato gravado pela API por evento do
// Correspondente) e na linha do tempo; só status e data, com os rótulos do módulo Correspondente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import { runAxe, serious } from "./_loader/axe.mjs";
import { mapOpportunity } from "@/lib/api/crm.js";
import { financingSnapshotView, financingTimelineLabel } from "@/lib/crm/financingSnapshot.js";
import OpportunityFinancingStatus from "@/components/molecules/OpportunityFinancingStatus/OpportunityFinancingStatus.js";

const API = { id: "o1", stage: "FINANCING", personId: "p1", financingCaseId: "c1", financingStatus: "APPROVED", financingStatusAt: "2026-11-10T15:00:00.000Z" };

test("CAD-09 front: mapOpportunity leva o retrato do financiamento da API para a tela", () => {
  const o = mapOpportunity(API);
  assert.equal(o.financingCaseId, "c1");
  assert.equal(o.financingStatus, "APPROVED");
  assert.equal(o.financingStatusAt, "2026-11-10T15:00:00.000Z");
  const semFin = mapOpportunity({ id: "o2", stage: "NEW" });
  assert.equal(semFin.financingStatus, null);
});

test("CAD-09 front: retrato traduz o status com o rótulo e o tom do Correspondente e aponta o caso", () => {
  const v = financingSnapshotView(mapOpportunity(API));
  assert.deepEqual(v, { label: "Aprovado", tone: "success", at: "2026-11-10T15:00:00.000Z", caseHref: "/painel/correspondente/c1" });
  assert.equal(financingSnapshotView(mapOpportunity({ ...API, financingStatus: "CANCELED" })).tone, "danger");
  assert.equal(financingSnapshotView(mapOpportunity({ id: "o2" })), null);
});

test("CAD-09 front: a linha do tempo mostra o status do financiamento em português, nunca o código", () => {
  assert.equal(financingTimelineLabel({ type: "FINANCING_STATUS", data: { status: "UNDER_ANALYSIS" } }), "Financiamento: Em análise");
  assert.equal(financingTimelineLabel({ type: "FINANCING_STATUS", data: {} }), "Financiamento atualizado");
});

test("CAD-09 front: o bloco Financiamento da oportunidade mostra status, data e link; sem caso, diz que não há vínculo", async () => {
  const com = html(OpportunityFinancingStatus, { opportunity: mapOpportunity(API) });
  assert.match(com, /Financiamento/);
  assert.match(com, /Aprovado/);
  assert.match(com, /Atualizado em 10\/11\/2026/);
  assert.match(com, /href="\/painel\/correspondente\/c1"/);
  assert.doesNotMatch(com, /APPROVED/, "nunca o enum cru");
  const sem = html(OpportunityFinancingStatus, { opportunity: mapOpportunity({ id: "o2", stage: "NEW" }) });
  assert.match(sem, /Nenhum financiamento vinculado/);
  const { violations } = await runAxe(OpportunityFinancingStatus, { opportunity: mapOpportunity(API) });
  assert.deepEqual(serious(violations), []);
});
