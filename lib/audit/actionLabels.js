// Nome em português das ações de auditoria (audit.audit_log.action) que a tela de Atividades mostra quando o registro não traz o
// motivo (`reason`) — a chave técnica ("billing.lease_obligation_cycle.pay") nunca aparece crua. Fechamento M5 (vistorias/prazos).
export const AUDIT_ACTION_LABELS = {
  "legal.evidence.file_access": "Prova acessada",
  "legal.evidence_package.list": "Lista de dossiês consultada",
  "legal.deadline.occurrence_open": "Ocorrência de prazo jurídico aberta",
  "billing.lease_obligation.start": "Obrigações da locação iniciadas na entrega das chaves",
  "billing.lease_obligation.advance": "Novo vencimento da obrigação da locação gerado",
  "billing.lease_obligation.overdue": "Obrigação da locação em atraso",
  "billing.lease_obligation_cycle.pay": "Vencimento da obrigação da locação pago com comprovante",
  "billing.lease_obligation_cycle.overdue": "Vencimento da obrigação da locação vencido sem comprovante",
  "billing.lease_obligation_cycle.waive": "Vencimento da obrigação da locação dispensado",
  "billing.penalty_rule.publish": "Nova versão da regra de multa, juros ou carência publicada",
};

/** Rótulo da ação, ou "" quando não há (a tela usa outro texto, nunca a chave técnica). */
export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] || "";
}
