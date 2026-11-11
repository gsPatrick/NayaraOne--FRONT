// CAD-09 (Marco 3 §9): retrato do financiamento vinculado à oportunidade. Quem grava é o consumidor do evento do Correspondente na
// API (só referência do caso, status e data, nunca dado bancário); a tela só mostra. Rótulos e tons vêm do módulo Correspondente
// para as duas telas nunca divergirem.
import { STATUS_TONE, statusLabel } from "@/app/painel/correspondente/_labels";

export function financingSnapshotView(opportunity) {
  if (!opportunity?.financingStatus) return null;
  return {
    label: statusLabel(opportunity.financingStatus),
    tone: STATUS_TONE[opportunity.financingStatus] || "neutral",
    at: opportunity.financingStatusAt || null,
    caseHref: opportunity.financingCaseId ? `/painel/correspondente/${opportunity.financingCaseId}` : null,
  };
}

/** Frase da linha do tempo para o item FINANCING_STATUS (status do financiamento atualizado por evento). */
export function financingTimelineLabel(event) {
  const status = event?.data?.status;
  if (!status) return "Financiamento atualizado";
  return `Financiamento: ${statusLabel(status)}`;
}
