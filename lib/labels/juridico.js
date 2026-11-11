// Mapa único de rótulos do Jurídico/Locação (M5-D048 §3.2) para os códigos que a API do Marco 5 grava e devolve.
// Regra: nenhum código de enum aparece na tela; todo valor possível do servidor tem rótulo aqui (test/m5fech.rotulos.test.mjs).
// Fonte dos códigos: wt/api-m5 src/features/legal (contracts.service VALID_TRANSITIONS, guaranteeTypeData, inspections.service,
// legalDeadlineTransitions, templateVersions.service, migrations 9981-9999).

// --- Contrato ---
export const CONTRACT_STATUS_FLOW = ["DRAFT", "DOCUMENTS_PENDING", "LEGAL_REVIEW", "APPROVED", "SIGNING", "SIGNED", "ACTIVE"];
export const CONTRACT_STATUS_LABELS = {
  DRAFT: "Rascunho",
  DOCUMENTS_PENDING: "Documentos pendentes",
  LEGAL_REVIEW: "Revisão jurídica",
  APPROVED: "Aprovado",
  SIGNING: "Em assinatura",
  SIGNED: "Assinado",
  ACTIVE: "Em vigor",
  SUSPENDED: "Suspenso",
  TERMINATED: "Encerrado",
  CLOSED: "Arquivado",
  CANCELLED: "Cancelado", // só contratos antigos: deixou de ser estado do livro (a API recusa como alvo)
};
export const CONTRACT_STATUS_TONE = {
  DRAFT: "neutral", DOCUMENTS_PENDING: "warning", LEGAL_REVIEW: "warning", APPROVED: "info", SIGNING: "info",
  SIGNED: "success", ACTIVE: "success", SUSPENDED: "warning", TERMINATED: "danger", CLOSED: "neutral", CANCELLED: "danger",
};
// Máquina de estados EXATA do livro (Guia §3), espelho de VALID_TRANSITIONS da API. CANCELLED não é alvo nem origem.
export const CONTRACT_TRANSITIONS = {
  DRAFT: ["DOCUMENTS_PENDING", "LEGAL_REVIEW"],
  DOCUMENTS_PENDING: ["LEGAL_REVIEW"],
  LEGAL_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["SIGNING"],
  SIGNING: ["SIGNED", "APPROVED"],
  SIGNED: ["ACTIVE"],
  ACTIVE: ["SUSPENDED", "TERMINATED"],
  SUSPENDED: ["ACTIVE", "TERMINATED"],
  TERMINATED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};
// A partir de APPROVED, valor, vigência, imóvel e número só mudam por aditivo (409 LEGAL_CONTRACT_TERMS_LOCKED_USE_ADDENDUM).
export const CONTRACT_TERMS_LOCKED_STATUSES = ["APPROVED", "SIGNING", "SIGNED", "ACTIVE", "SUSPENDED", "TERMINATED", "CLOSED"];

export function allowedContractTransitions(status) {
  return CONTRACT_TRANSITIONS[status] || [];
}

export const CONTRACT_TYPE_LABELS = {
  SALE: "Venda (genérica)",
  SALE_CASH: "Venda à vista",
  SALE_FINANCED: "Venda financiada",
  SALE_TRADE: "Venda com permuta",
  SALE_INSTALLMENTS: "Venda parcelada",
  LEASE: "Locação (genérica)",
  LEASE_RESIDENTIAL: "Locação residencial",
  LEASE_COMMERCIAL: "Locação comercial",
  LEASE_SEASONAL: "Locação por temporada",
  PROPERTY_ADMIN: "Administração de imóvel",
  SERVICE: "Prestação de serviço",
  CONSTRUCTION: "Obra / Construção (empreitada)",
  ADDENDUM: "Aditivo",
  KEY_DELIVERY: "Termo de entrega de chaves",
  USED_PROPERTY_DELIVERY: "Termo de entrega de imóvel usado",
};
export const CONTRACT_TYPE_TONE = {
  SALE: "info", SALE_CASH: "info", SALE_FINANCED: "info", SALE_TRADE: "info", SALE_INSTALLMENTS: "info",
  LEASE: "brand", LEASE_RESIDENTIAL: "brand", LEASE_COMMERCIAL: "brand", LEASE_SEASONAL: "brand", PROPERTY_ADMIN: "brand",
  SERVICE: "neutral", CONSTRUCTION: "warning", ADDENDUM: "neutral", KEY_DELIVERY: "neutral", USED_PROPERTY_DELIVERY: "neutral",
};
// Tipos vinculados (Caderno §3): exigem o contrato principal (parentContractId) e herdam o imóvel dele.
export const LINKED_CONTRACT_TYPES = ["ADDENDUM", "KEY_DELIVERY", "USED_PROPERTY_DELIVERY"];
export const CONTRACT_TYPE_CREATE_OPTIONS = [
  "SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS",
  "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN",
  "SERVICE", "CONSTRUCTION", ...LINKED_CONTRACT_TYPES,
];

// Versão do documento do contrato (aprovação por versão, Guia §6).
export const CONTRACT_VERSION_STATUS_LABELS = { DRAFT: "Rascunho", APPROVED: "Aprovada", SUPERSEDED: "Substituída", SIGNED: "Assinada" };
export const CONTRACT_VERSION_STATUS_TONE = { DRAFT: "warning", APPROVED: "success", SUPERSEDED: "neutral", SIGNED: "success" };

// Modelo de contrato (template_versions).
export const TEMPLATE_VERSION_STATUS_LABELS = { DRAFT: "Rascunho", PUBLISHED: "Publicada", SUPERSEDED: "Substituída" };
export const TEMPLATE_VERSION_STATUS_TONE = { DRAFT: "warning", PUBLISHED: "success", SUPERSEDED: "neutral" };
// Tipos aceitos pelo modelo (TEMPLATE_CONTRACT_TYPES da API).
export const TEMPLATE_CONTRACT_TYPES = [
  "SALE", "SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS",
  "LEASE", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN", "SERVICE",
];

export const PARTY_ROLE_LABELS = { LANDLORD: "Locador", TENANT: "Locatário", GUARANTOR: "Fiador", BUYER: "Comprador", SELLER: "Vendedor" };

// Checklist: etapa a partir da qual a exigência bloqueia (Guia §5).
export const REQUIREMENT_STATUS_LABELS = { PENDING: "Pendente", SATISFIED: "Atendida", WAIVED: "Dispensada", EXPIRED: "Vencida", NOT_APPLICABLE: "Não se aplica" };
export const REQUIREMENT_STATUS_TONE = { PENDING: "warning", SATISFIED: "success", WAIVED: "neutral", EXPIRED: "danger", NOT_APPLICABLE: "neutral" };
export const REQUIREMENT_STAGE_LABELS = {
  LEGAL_REVIEW: "Antes da revisão jurídica",
  LEGAL_APPROVAL: "Antes da aprovação",
  SIGNING: "Antes da assinatura",
  ACTIVATION: "Antes da ativação",
  KEY_DELIVERY: "Antes da entrega das chaves",
};

// Assinaturas do contrato e dos aditivos.
export const SIGNATURE_STATUS_LABELS = { PENDING: "Pendente", SIGNED: "Assinada", CANCELLED: "Cancelada", REFUSED: "Recusada", EXPIRED: "Expirada", REJECTED: "Rejeitada", SUPERSEDED: "Substituída" };
export const SIGNATURE_STATUS_TONE = { PENDING: "warning", SIGNED: "success", CANCELLED: "neutral", REFUSED: "danger", EXPIRED: "danger", REJECTED: "danger", SUPERSEDED: "neutral" };
export const SIGNATURE_METHOD_LABELS = { ELECTRONIC: "Eletrônica", MANUAL: "Manual (via assinada)" };
export const AMENDMENT_STATUS_LABELS = { DRAFT: "Rascunho", SIGNED: "Assinado" };
export const AMENDMENT_STATUS_TONE = { DRAFT: "warning", SIGNED: "success" };

// --- Garantias (Caderno §9): códigos do livro; DEPOSIT/CAPITALIZATION_TITLE são o legado, só leitura ---
export const GUARANTEE_TYPES = ["GUARANTOR", "INSURANCE", "SECURITY_DEPOSIT", "CAPITALIZATION", "OTHER"];
export const GUARANTEE_TYPE_ALIASES = { DEPOSIT: "SECURITY_DEPOSIT", CAPITALIZATION_TITLE: "CAPITALIZATION" };
export const GUARANTEE_TYPE_LABELS = {
  GUARANTOR: "Fiador",
  INSURANCE: "Seguro-fiança",
  SECURITY_DEPOSIT: "Caução",
  CAPITALIZATION: "Título de capitalização",
  OTHER: "Outra (homologada)",
  DEPOSIT: "Caução",
  CAPITALIZATION_TITLE: "Título de capitalização",
};
export const GUARANTEE_TYPE_ICON = { GUARANTOR: "users", INSURANCE: "shield", SECURITY_DEPOSIT: "money", CAPITALIZATION: "layers", OTHER: "document", DEPOSIT: "money", CAPITALIZATION_TITLE: "layers" };
export const GUARANTEE_TYPES_REQUIRING_VALIDITY = ["GUARANTOR", "INSURANCE", "CAPITALIZATION"];
export const GUARANTEE_STATUSES = ["PENDING", "ACTIVE", "RELEASED", "CANCELLED"];
export const GUARANTEE_STATUS_LABELS = { PENDING: "Pendente", ACTIVE: "Ativa", RELEASED: "Liberada", CANCELLED: "Cancelada", EXPIRED: "Vencida", SUPERSEDED: "Substituída" };
export const GUARANTEE_STATUS_TONE = { PENDING: "warning", ACTIVE: "success", RELEASED: "neutral", CANCELLED: "danger", EXPIRED: "danger", SUPERSEDED: "neutral" };
// Rótulo do campo que falta para ativar a garantia (missingForActivation do GET /legal/guarantees/:id).
export const GUARANTEE_FIELD_LABELS = {
  guarantorPersonId: "Pessoa fiadora",
  documentFileIds: "Documentos do fiador",
  acceptanceFileId: "Termo de aceite",
  acceptedAt: "Data do aceite",
  endsAt: "Fim da vigência",
  providerName: "Seguradora / emissora",
  policyNumber: "Número da apólice",
  policyFileId: "Arquivo da apólice",
  value: "Valor",
  premiumInstallments: "Parcelas do prêmio",
  renewalDueAt: "Data de renovação",
  financeEntryId: "Recebimento da caução no Financeiro",
  certificateNumber: "Número do título",
  certificateFileId: "Documento do título",
  homologatedFlowCode: "Fluxo homologado",
};
export const normalizeGuaranteeType = (code) => GUARANTEE_TYPE_ALIASES[code] || code;

// --- Vistorias (Caderno §11): a API grava e devolve ENTRY/EXIT/INTERMEDIATE/FINAL; os antigos só como leitura ---
export const INSPECTION_TYPES = ["ENTRY", "EXIT", "INTERMEDIATE", "FINAL"];
export const INSPECTION_TYPE_ALIASES = { CHECK_IN: "ENTRY", CHECK_OUT: "EXIT", PERIODIC: "INTERMEDIATE" };
export const INSPECTION_TYPE_LABELS = { ENTRY: "Entrada", EXIT: "Saída", INTERMEDIATE: "Intermediária", FINAL: "Final", CHECK_IN: "Entrada", CHECK_OUT: "Saída", PERIODIC: "Intermediária" };
export const INSPECTION_TYPE_TONE = { ENTRY: "success", EXIT: "warning", INTERMEDIATE: "info", FINAL: "brand", CHECK_IN: "success", CHECK_OUT: "warning", PERIODIC: "info" };
export const normalizeInspectionType = (code) => INSPECTION_TYPE_ALIASES[code] || code;
// Vistoria de entrada compara com a de saída e vice-versa (final compara com a de entrada).
export const INSPECTION_COUNTERPART = { ENTRY: "EXIT", EXIT: "ENTRY", FINAL: "ENTRY" };
export const INSPECTION_STATUS_LABELS = { SCHEDULED: "Agendada", COMPLETED: "Concluída", SIGNED: "Assinada", SUPERSEDED: "Substituída", CANCELLED: "Cancelada" };
export const INSPECTION_STATUS_TONE = { SCHEDULED: "warning", COMPLETED: "success", SIGNED: "success", SUPERSEDED: "neutral", CANCELLED: "neutral" };
export const CONDITIONS = ["NEW", "GOOD", "REGULAR", "DAMAGED"];
export const CONDITION_LABELS = { NEW: "Novo", GOOD: "Bom", REGULAR: "Regular", DAMAGED: "Danificado" };
export const CONDITION_TONE = { NEW: "info", GOOD: "success", REGULAR: "warning", DAMAGED: "danger" };

// --- Prazos jurídicos (Caderno §15) ---
export const DEADLINE_STATUS_LABELS = { PENDING: "Pendente", DONE: "Concluído", CANCELLED: "Cancelado" };
export const DEADLINE_STATUS_TONE = { PENDING: "warning", DONE: "success", CANCELLED: "neutral" };
export const DEADLINE_CRITICALITY_LABELS = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", CRITICAL: "Crítica" };
export const DEADLINE_CRITICALITY_TONE = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", CRITICAL: "danger" };
export const DEADLINE_API_SEVERITY_LABELS = { OVERDUE: "Vencido", DUE_SOON: "Vence em breve", NORMAL: "No prazo", DONE: "Concluído", CANCELLED: "Cancelado" };
export const DEADLINE_API_SEVERITY_TONE = { OVERDUE: "danger", DUE_SOON: "warning", NORMAL: "info", DONE: "success", CANCELLED: "neutral" };

// --- Processo (Caderno §14) ---
export const CASE_PHASE_LABELS = { INITIAL_PETITION: "Petição inicial", DISCOVERY: "Instrução", TRIAL: "Julgamento", APPEAL: "Recurso", CLOSED: "Encerrado" };
export const CASE_RISK_LABELS = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto", CRITICAL: "Crítico" };
export const CASE_PARTY_ROLE_LABELS = { PLAINTIFF: "Autor", DEFENDANT: "Réu", WITNESS: "Testemunha", THIRD_PARTY: "Terceiro interessado" };
export const CASE_DOCUMENT_PURPOSE_LABELS = { DOCUMENT: "Documento", EVIDENCE: "Prova", PETITION: "Petição", DECISION: "Decisão", NOTICE: "Notificação", OTHER: "Outro" };
export const CASE_RECEIVABLE_BASIS_LABELS = {
  SETTLEMENT: "Acordo homologado",
  FINAL_JUDGMENT: "Sentença transitada em julgado",
  PROVISIONAL_ENFORCEMENT: "Cumprimento provisório de sentença",
  EXTRAJUDICIAL_TITLE: "Título executivo extrajudicial",
  COURT_DEPOSIT_RELEASE: "Alvará de levantamento de depósito judicial",
};
export const CASE_TIMELINE_TYPE_LABELS = {
  CASE_OPENED: "Abertura", CASE_CHANGE: "Movimentação", PARTY: "Parte", DEADLINE: "Prazo", DEADLINE_CHANGE: "Prazo alterado",
  EVIDENCE_PACKAGE: "Dossiê", NOTICE: "Notificação",
};

// --- Entrega de chaves (Caderno §10) ---
export const KEY_DELIVERY_STATUS_LABELS = { PENDING: "Pendente", TERM_GENERATED: "Termo gerado", RELEASED: "Entregue", CANCELLED: "Cancelada" };
export const KEY_DELIVERY_STATUS_TONE = { PENDING: "warning", RELEASED: "success", CANCELLED: "neutral" };
export const KEY_DELIVERY_TERM_TYPE_LABELS = { KEY_DELIVERY: "Termo de entrega de chaves", USED_PROPERTY_DELIVERY: "Termo de entrega de imóvel usado" };
export const KEY_TERM_SIGNATURE_METHOD_LABELS = { MANUAL_EVIDENCE: "Via assinada anexada (coleta manual)" };
// Locação exige a vistoria de ENTRADA; venda (entrega de casa nova) aceita a FINAL ou a de entrada.
export const SALE_LIKE_CONTRACT_TYPES = ["SALE", "SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS"];
export const keyDeliveryInspectionTypes = (contract) => (contract && SALE_LIKE_CONTRACT_TYPES.includes(contract.contractType) ? ["FINAL", "ENTRY"] : ["ENTRY"]);

// --- Locação: obrigações (Caderno §12) ---
export const OBLIGATION_PERIODICITY_LABELS = { MONTHLY: "Mensal", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual", ONE_TIME: "Única" };
