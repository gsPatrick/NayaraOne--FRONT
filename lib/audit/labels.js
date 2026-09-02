// Tradução de entityType (audit.audit_log) pra pt-BR. Lista levantada direto dos
// registrarAuditoria(...) espalhados pelas features da API (grep por "entityType: '...'").
// `action` (ex.: "finance.entry.create", "legal.contract.status_change") não tem um rótulo
// dedicado aqui — o campo `reason` já vem em pt-BR pronto pra exibição (é isso que a tela usa
// pra "o que foi feito").

export const ENTITY_TYPE_LABELS = {
  ApprovalRequest: "Solicitação de aprovação",
  ApprovalStep: "Etapa de aprovação",
  BankAccount: "Conta bancária",
  BankTransaction: "Transação de extrato",
  BudgetLine: "Linha de orçamento (obra)",
  Commission: "Comissão",
  CommissionInstallment: "Parcela de comissão",
  Company: "Empresa",
  Contract: "Contrato",
  ContractParty: "Parte do contrato",
  ContractVersion: "Versão de contrato",
  CostCenter: "Centro de custo",
  DailyReport: "RDO (diário de obra)",
  EvidencePackage: "Pacote de evidências",
  FinancialEntry: "Lançamento financeiro",
  Guarantee: "Garantia",
  Inspection: "Vistoria",
  InspectionItem: "Item de vistoria",
  KeyDelivery: "Entrega de chaves",
  LegalCase: "Processo jurídico",
  LegalDeadline: "Prazo jurídico",
  MaintenanceCase: "Chamado de pós-obra",
  Opportunity: "Oportunidade",
  OwnerRepass: "Repasse a proprietário",
  Person: "Contato",
  PersonRole: "Papel de contato",
  Project: "Obra",
  ProjectStage: "Etapa de obra",
  Property: "Imóvel",
  PropertyOffer: "Oferta de imóvel",
  PropertyRadar: "Radar",
  QualityChecklistItem: "Item de qualidade (obra)",
  Reconciliation: "Conciliação",
  ResultCenter: "Centro de resultado",
  Role: "Papel (RBAC)",
  Signature: "Assinatura",
  StageMeasurement: "Medição de etapa (obra)",
  Task: "Tarefa",
  User: "Usuário",
};

export function entityTypeLabel(entityType) {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

// Prefixo de `action` (ex.: "finance.entry.create" -> "create") só pra decidir o ícone/tom do
// badge — a frase legível de verdade é o `reason`.
export function actionVerb(action) {
  const last = String(action || "").split(".").pop() || "";
  if (last.includes("delete") || last.includes("remove") || last.includes("cancel")) return "delete";
  if (last.includes("create")) return "create";
  if (last === "login") return "login";
  if (last.includes("status") || last.includes("transition") || last.includes("change")) return "status";
  return "update";
}

export const ACTION_TONE = {
  create: "success",
  update: "info",
  status: "warning",
  delete: "danger",
  login: "neutral",
};

export const ACTION_ICON = {
  create: "plus",
  update: "pencil",
  status: "swapHorizontal",
  delete: "trash",
  login: "logout",
};
