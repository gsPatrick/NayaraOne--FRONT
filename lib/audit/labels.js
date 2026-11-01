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
  TenantSetting: "Configuração",
  User: "Usuário",
  "analytics.alert_definition": "Regra de alerta de indicador",
  "analytics.alert_instance": "Alerta de indicador",
  "analytics.dashboard": "Painel de indicadores",
  "analytics.export_job": "Exportação de indicadores",
  "analytics.metric_acceptance": "Aceite de indicador",
  "analytics.metric_definition": "Definição de indicador",
  "analytics.metric_version": "Versão de indicador",
  "analytics.read_model": "Base de leitura de indicadores",
  "governance.calendar_event": "Evento do calendário de governança",
  "governance.calendar_item": "Item do calendário de governança",
  "governance.config_entry": "Configuração com responsável",
  "governance.data_domain": "Domínio de dados",
  "governance.feature_flag": "Feature flag (chave de funcionalidade)",
  "marketing.campaign": "Campanha de marketing",
  "marketing.channel": "Canal de marketing",
  "marketing.content_item": "Conteúdo de marketing",
  "marketing.suppression": "Supressão de contato (marketing)",
  "marketing.tracking_link": "Link rastreado (marketing)",
  File: "Arquivo",
  ShareLink: "Link externo",
  LegalHold: "Bloqueio jurídico (legal hold)",
  ApiClient: "Credencial de API",
  BulkChange: "Alteração em massa",
};

// Tipo sem tradução cadastrada nunca aparece cru: "analytics.alert_instance" e "DataClassification"
// viram texto corrido ("Alert instance", "Data classification").
function humanizeEntityType(entityType) {
  const last = String(entityType || "").split(".").pop() || "";
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase().trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Registro";
}

export function entityTypeLabel(entityType) {
  return ENTITY_TYPE_LABELS[entityType] || humanizeEntityType(entityType);
}

// Prefixo de `action` (ex.: "finance.entry.create" -> "create") só pra decidir o ícone/tom do
// badge — a frase legível de verdade é o `reason`.
export function actionVerb(action) {
  const value = String(action || "");
  const last = value.split(".").pop() || "";
  // Eventos de segurança do MFA (bloqueio por tentativas falhas, verificação de origem/
  // dispositivo diferente) merecem tom/ícone distintos do CRUD comum — são sinais de
  // segurança, não uma edição de registro qualquer.
  if (value === 'users.mfa.locked') return 'security-lock';
  if (value === 'users.mfa.new_device') return 'security-review';
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
  "security-lock": "danger",
  "security-review": "warning",
};

export const ACTION_ICON = {
  create: "plus",
  update: "pencil",
  status: "swapHorizontal",
  delete: "trash",
  login: "logout",
  "security-lock": "ban",
  "security-review": "eye",
};
