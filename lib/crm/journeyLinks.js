// M3-25 (contrato: jornada lead -> Radar -> visita -> proposta -> contrato -> recebimento -> comissão): os passos entre módulos
// levam o vínculo adiante pela URL. Oportunidade -> novo contrato (opportunityId e imóvel); contrato -> novo recebível (contractId).
// Testado em test/m3ca.jornadaLinks.test.mjs.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function contractUrlForOpportunity(opportunity) {
  if (!opportunity?.id) return null;
  const q = new URLSearchParams({ opportunityId: opportunity.id });
  if (opportunity.propertyId) q.set("propertyId", opportunity.propertyId);
  return `/painel/contratos/lista/novo?${q.toString()}`;
}

export function receivableUrlForContract(contract) {
  if (!contract?.id) return null;
  return `/painel/financeiro/lancamentos/novo?${new URLSearchParams({ contractId: contract.id, nature: "RECEIVABLE" }).toString()}`;
}

/** Lê ids vindos da URL; só aceita identificador válido (nada de texto livre da barra de endereço vai para a API). */
export function readLinkParams(search, names) {
  const q = new URLSearchParams(search || "");
  return Object.fromEntries(names.map((n) => [n, UUID.test(q.get(n) || "") ? q.get(n) : ""]));
}
