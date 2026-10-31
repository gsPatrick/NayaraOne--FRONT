// Leitura do chamado de pós-obra (M9-D850): o chamado é obrigatório (404 vira { notFound }, o resto sobe como erro para o padrão de estados);
// imóvel, obra, pessoa, chamados do imóvel e ações de garantia são de apoio: a falha é registrada (lookupFallback) e a tela abre.
import { getMaintenanceCase, getProject, listMaintenanceCases, listWarrantyActions } from "@/lib/api/construction";
import { getProperty } from "@/lib/api/properties";
import { getPerson } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { lookupFallback } from "@/lib/asyncState/lookup";

export async function loadChamado(id) {
  const maintenanceCase = await getMaintenanceCase(id).catch((err) => {
    if (err?.status === 404) return null;
    throw err;
  });
  if (!maintenanceCase) return { notFound: true };
  const c = maintenanceCase;
  const [users, property, project, openedByPerson, related, warrantyActions] = await Promise.all([
    apiFetch("/users?status=ACTIVE"),
    c.propertyId ? getProperty(c.propertyId).catch(lookupFallback("o imóvel", null)) : Promise.resolve(null),
    c.projectId ? getProject(c.projectId).catch(lookupFallback("a obra", null)) : Promise.resolve(null),
    c.openedByPersonId ? getPerson(c.openedByPersonId).catch(lookupFallback("a pessoa", null)) : Promise.resolve(null),
    c.propertyId ? listMaintenanceCases({ propertyId: c.propertyId }).catch(lookupFallback("os casos de manutenção")) : Promise.resolve([]),
    listWarrantyActions(c.id).catch(lookupFallback("as ações de garantia")),
  ]);
  return {
    maintenanceCase: c,
    users: users || [],
    property,
    project,
    openedByPerson,
    relatedCases: (related || []).filter((r) => r.id !== c.id),
    warrantyActions: warrantyActions || [],
  };
}
