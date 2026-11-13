// Laudo da vistoria (Caderno M5 §11 "Assinatura congela a versão"; "Correção após assinatura cria revisão, não altera laudo original").
// A vistoria está assinada quando locador e locatário assinaram. Depois disso o laudo é emitido uma vez, já com as assinaturas, e não
// muda mais: a API recusa gerar de novo (409 LEGAL_INSPECTION_REPORT_FROZEN). Mesma regra de inspectionReportFreeze.js da API.
const SIGNING_ROLES = ["LANDLORD", "TENANT"];

/** Momento da última assinatura entre locador e locatário; null enquanto falta uma das duas. */
export function fullySignedAt(signatures) {
  const byRole = new Map();
  for (const sig of signatures || []) {
    const at = new Date(sig.signedAt).getTime();
    if (SIGNING_ROLES.includes(sig.partyRole) && Number.isFinite(at)) byRole.set(sig.partyRole, at);
  }
  if (byRole.size < SIGNING_ROLES.length) return null;
  return new Date(Math.max(...byRole.values()));
}

export const REPORT_STATE = {
  UNAVAILABLE: "UNAVAILABLE", // vistoria ainda não concluída
  MISSING: "MISSING", // concluída, sem laudo
  DRAFT: "DRAFT", // laudo gerado antes das duas assinaturas
  NEEDS_SIGNED: "NEEDS_SIGNED", // as duas partes assinaram depois do laudo: falta emitir o laudo assinado
  FROZEN: "FROZEN", // laudo emitido depois das assinaturas: imutável
};

/** Situação do laudo para decidir o que a tela oferece. */
export function inspectionReportState(inspection, signatures) {
  if (!inspection || inspection.status !== "COMPLETED") return REPORT_STATE.UNAVAILABLE;
  const signedAt = fullySignedAt(signatures);
  if (!inspection.reportHash || !inspection.reportGeneratedAt) return REPORT_STATE.MISSING;
  if (!signedAt) return REPORT_STATE.DRAFT;
  return new Date(inspection.reportGeneratedAt).getTime() >= signedAt.getTime() ? REPORT_STATE.FROZEN : REPORT_STATE.NEEDS_SIGNED;
}

export const REPORT_FROZEN_TEXT = "Laudo assinado é imutável: ele foi emitido depois da assinatura do locador e do locatário e não é gerado de novo. Para corrigir, crie uma revisão da vistoria.";
export const REPORT_NEEDS_SIGNED_TEXT = "Locador e locatário já assinaram depois do laudo atual: gere o laudo assinado. Depois de gerado ele não muda mais.";
