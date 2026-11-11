import { INSPECTION_COUNTERPART, normalizeInspectionType } from "@/lib/labels/juridico";

// Contraparte pelo código do livro (entrada <-> saída; final compara com a entrada): primeiro a do mesmo contrato,
// senão a mais recente do mesmo imóvel.
export function findCounterpart(inspection, all) {
  const wanted = INSPECTION_COUNTERPART[normalizeInspectionType(inspection.inspectionType)];
  if (!wanted) return null;
  const candidates = (all || []).filter((i) => i.id !== inspection.id && normalizeInspectionType(i.inspectionType) === wanted);
  const sameContract = inspection.contractId ? candidates.filter((i) => i.contractId === inspection.contractId) : [];
  const pool = sameContract.length ? sameContract : candidates.filter((i) => i.propertyId === inspection.propertyId);
  return pool.sort((a, b) => new Date(b.completedAt || b.scheduledAt || 0) - new Date(a.completedAt || a.scheduledAt || 0))[0] || null;
}
