// Rótulos e regras de exibição da qualificação/due diligence de fornecedor (Compras, Marco 7).
// Espelha procurement.service.js (NayaraOne--API): DUE_DILIGENCE_STATUSES e a guarda de
// awardSupplierOffer — "fornecedor alto risco só recebe PO com due diligence APPROVED e dentro
// da vigência (validUntil)". O front só ESPELHA a regra para avisar antes; quem bloqueia de fato
// é sempre a API (SUPPLIER_DUE_DILIGENCE_REQUIRED).

export const DUE_DILIGENCE_LABELS = {
  NOT_REQUIRED: "Não exigida",
  PENDING: "Pendente de análise",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
};

export const DUE_DILIGENCE_TONE = {
  NOT_REQUIRED: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

// validUntil é DATEONLY ("YYYY-MM-DD") e a vigência INCLUI o último dia. Mesma comparação do
// backend (awardSupplierOffer): data de calendário de America/Sao_Paulo, nunca meia-noite UTC.
export function isQualificationExpired(qualification) {
  if (!qualification?.validUntil) return false;
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return String(qualification.validUntil) < todayStr;
}

// Motivo pelo qual a adjudicação (award) seria recusada hoje, ou null se liberado.
export function awardBlockReason(qualification) {
  if (!qualification?.highRisk) return null;
  if (qualification.dueDiligenceStatus !== "APPROVED") {
    return "Fornecedor de alto risco sem due diligence aprovada — não pode ser adjudicado (receber PO).";
  }
  if (isQualificationExpired(qualification)) {
    return "Due diligence aprovada, mas a vigência da qualificação venceu — atualize os documentos/vigência antes de adjudicar.";
  }
  return null;
}
