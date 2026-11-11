// M3-25 no Front: o vínculo da jornada vai pela URL (oportunidade -> contrato -> recebível) e só aceita identificador válido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { contractUrlForOpportunity, receivableUrlForContract, readLinkParams } from "@/lib/crm/journeyLinks.js";

const OPP = "11111111-2222-4333-8444-555555555555";
const IMOVEL = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("m3ca jornada: a oportunidade abre o novo contrato com ela e o imóvel de interesse", () => {
  assert.equal(contractUrlForOpportunity({ id: OPP, propertyId: IMOVEL }), `/painel/contratos/lista/novo?opportunityId=${OPP}&propertyId=${IMOVEL}`);
  assert.equal(contractUrlForOpportunity({ id: OPP }), `/painel/contratos/lista/novo?opportunityId=${OPP}`);
  assert.equal(contractUrlForOpportunity(null), null);
});

test("m3ca jornada: o contrato abre o novo recebível ligado a ele", () => {
  assert.equal(receivableUrlForContract({ id: OPP }), `/painel/financeiro/lancamentos/novo?contractId=${OPP}&nature=RECEIVABLE`);
  assert.equal(receivableUrlForContract({}), null);
});

test("m3ca jornada: só identificador válido da URL é usado", () => {
  assert.deepEqual(readLinkParams(`?opportunityId=${OPP}&propertyId=x' OR 1=1`, ["opportunityId", "propertyId"]), { opportunityId: OPP, propertyId: "" });
  assert.deepEqual(readLinkParams("", ["contractId"]), { contractId: "" });
});
