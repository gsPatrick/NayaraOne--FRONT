// Homologação da versão da cláusula (Caderno M5 §4 "legal.clause_versions | Versões homologadas"): homologada = aprovada por
// outra pessoa com a alçada jurídica, não apenas "ativa". Espelha as regras da API (que continua sendo quem decide).
export const HOMOLOGATION_LABELS = { PENDING: "Não homologada", HOMOLOGATED: "Homologada" };
export const HOMOLOGATION_TONE = { PENDING: "warning", HOMOLOGATED: "success" };

/** Mostrar "Homologar": versão vigente, ainda pendente, sessão com legal:approve e que não é a autora da versão. */
export function canHomologate(clause, { userId, canApprove }) {
  if (!clause || !clause.isActive || clause.homologationStatus === "HOMOLOGATED") return false;
  if (!canApprove || !userId || !clause.createdBy) return false;
  return String(clause.createdBy) !== String(userId);
}

export function homologationLabel(clause) {
  const status = (clause && clause.homologationStatus) || "PENDING";
  return { text: HOMOLOGATION_LABELS[status] || HOMOLOGATION_LABELS.PENDING, tone: HOMOLOGATION_TONE[status] || "warning" };
}
