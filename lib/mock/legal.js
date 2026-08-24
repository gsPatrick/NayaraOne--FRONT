// Dados 100% mockados — alinhado ao schema real "legal".* auditado no backend
// (src/features/legal/*.service.js, NayaraOne--API). Nomes de campo em camelCase espelham
// 1:1 os nomes reais dos models Sequelize (contracts, contract_parties, contract_versions,
// signatures, guarantees, inspections, inspection_items, key_deliveries, legal_cases,
// legal_deadlines, evidence_packages) — nenhum campo aqui foi inventado.
// Pessoas e imóveis reaproveitam PEOPLE (lib/mock/people.js) e PROPERTIES (lib/mock/properties.js).

// contractType: SALE | LEASE | SERVICE
// status (máquina de estados, ordem linear): DRAFT -> DOCUMENTS_PENDING -> LEGAL_REVIEW ->
// APPROVED -> SIGNING -> SIGNED -> ACTIVE, com CANCELLED como estado alternativo a qualquer momento.
export const CONTRACTS = [
  {
    id: "contract-1", groupId: "group-1", companyId: "company-1", propertyId: "prop-2", opportunityId: "opp-3",
    contractType: "SALE", contractNumber: "CT-2026-0001", status: "ACTIVE",
    totalValue: 2450000, startsAt: "2026-06-01T00:00:00Z", endsAt: null, lockVersion: 3,
    createdAt: "2026-05-02T10:00:00Z",
  },
  {
    id: "contract-2", groupId: "group-1", companyId: "company-1", propertyId: "prop-1", opportunityId: null,
    contractType: "LEASE", contractNumber: "CT-2026-0002", status: "ACTIVE",
    totalValue: 3850, startsAt: "2026-07-01T00:00:00Z", endsAt: "2028-06-30T00:00:00Z", lockVersion: 4,
    createdAt: "2026-06-05T09:00:00Z",
  },
  {
    id: "contract-3", groupId: "group-1", companyId: "company-1", propertyId: "prop-3", opportunityId: null,
    contractType: "LEASE", contractNumber: "CT-2026-0003", status: "SIGNING",
    totalValue: 2200, startsAt: "2026-09-01T00:00:00Z", endsAt: "2028-08-31T00:00:00Z", lockVersion: 2,
    createdAt: "2026-08-01T14:00:00Z",
  },
  {
    id: "contract-4", groupId: "group-1", companyId: "company-1", propertyId: "prop-4", opportunityId: null,
    contractType: "SALE", contractNumber: "CT-2026-0004", status: "LEGAL_REVIEW",
    totalValue: 5200000, startsAt: null, endsAt: null, lockVersion: 1,
    createdAt: "2026-08-10T11:00:00Z",
  },
  {
    id: "contract-5", groupId: "group-1", companyId: "company-1", propertyId: "prop-9", opportunityId: null,
    contractType: "LEASE", contractNumber: "CT-2026-0005", status: "DOCUMENTS_PENDING",
    totalValue: 4100, startsAt: null, endsAt: null, lockVersion: 1,
    createdAt: "2026-08-15T08:30:00Z",
  },
  {
    id: "contract-6", groupId: "group-1", companyId: "company-1", propertyId: "prop-6", opportunityId: null,
    contractType: "LEASE", contractNumber: "CT-2026-0006", status: "DRAFT",
    totalValue: 2600, startsAt: null, endsAt: null, lockVersion: 0,
    createdAt: "2026-08-18T16:00:00Z",
  },
  {
    id: "contract-7", groupId: "group-1", companyId: "company-1", propertyId: "prop-5", opportunityId: null,
    contractType: "SALE", contractNumber: "CT-2026-0007", status: "CANCELLED",
    totalValue: 1800000, startsAt: null, endsAt: null, lockVersion: 2,
    createdAt: "2026-07-20T10:00:00Z",
  },
  {
    id: "contract-8", groupId: "group-1", companyId: "company-1", propertyId: "prop-10", opportunityId: null,
    contractType: "LEASE", contractNumber: "CT-2026-0008", status: "APPROVED",
    totalValue: 6800, startsAt: null, endsAt: null, lockVersion: 2,
    createdAt: "2026-08-12T09:00:00Z",
  },
];

// partyRole: LANDLORD | TENANT | GUARANTOR | BUYER | SELLER
export const CONTRACT_PARTIES = [
  { id: "cp-1", contractId: "contract-1", personId: "person-5", partyRole: "SELLER" },
  { id: "cp-2", contractId: "contract-1", personId: "person-4", partyRole: "SELLER" },
  { id: "cp-3", contractId: "contract-1", personId: "person-3", partyRole: "BUYER" },

  { id: "cp-4", contractId: "contract-2", personId: "person-1", partyRole: "LANDLORD" },
  { id: "cp-5", contractId: "contract-2", personId: "person-6", partyRole: "TENANT" },
  { id: "cp-6", contractId: "contract-2", personId: "person-10", partyRole: "GUARANTOR" },

  { id: "cp-7", contractId: "contract-3", personId: "person-2", partyRole: "LANDLORD" },
  { id: "cp-8", contractId: "contract-3", personId: "person-12", partyRole: "TENANT" },

  { id: "cp-9", contractId: "contract-4", personId: "person-2", partyRole: "SELLER" },
  { id: "cp-10", contractId: "contract-4", personId: "person-9", partyRole: "BUYER" },

  { id: "cp-11", contractId: "contract-5", personId: "person-1", partyRole: "LANDLORD" },
  { id: "cp-12", contractId: "contract-5", personId: "person-7", partyRole: "TENANT" },

  { id: "cp-13", contractId: "contract-6", personId: "person-6", partyRole: "LANDLORD" },
  { id: "cp-14", contractId: "contract-6", personId: "person-11", partyRole: "TENANT" },

  { id: "cp-15", contractId: "contract-7", personId: "person-3", partyRole: "SELLER" },
  { id: "cp-16", contractId: "contract-7", personId: "person-13", partyRole: "BUYER" },

  { id: "cp-17", contractId: "contract-8", personId: "person-2", partyRole: "LANDLORD" },
  { id: "cp-18", contractId: "contract-8", personId: "person-8", partyRole: "TENANT" },
];

// Imutável — nunca editada, só criada nova. contentHash ilustrativo (formato sha256-XXXX).
export const CONTRACT_VERSIONS = [
  { id: "cv-1", contractId: "contract-1", versionNumber: 1, documentFileId: "file-ct1-v1", contentHash: "sha256-8f3a1c2e9d4b7f10a5c3e8b1d6f2a90c4e7b3d1f8a2c5e9b0d6f3a1c7e8b2d4f", effectiveFrom: "2026-05-02T10:00:00Z", createdAt: "2026-05-02T10:00:00Z" },
  { id: "cv-2", contractId: "contract-1", versionNumber: 2, documentFileId: "file-ct1-v2", contentHash: "sha256-1b4d7e2a9c6f3b8d1e5a7c2f9b4d6e1a3c8f5b2d7e9a1c4f6b3d8e2a5c7f1b9d", effectiveFrom: "2026-05-20T10:00:00Z", createdAt: "2026-05-20T10:00:00Z" },
  { id: "cv-3", contractId: "contract-1", versionNumber: 3, documentFileId: "file-ct1-v3", contentHash: "sha256-4e9b2d7a1c5f8b3d6e2a9c4f7b1d5e8a3c6f2b9d4e7a1c8f5b3d6e9a2c4f7b1d", effectiveFrom: "2026-06-01T00:00:00Z", createdAt: "2026-06-01T00:00:00Z" },

  { id: "cv-4", contractId: "contract-2", versionNumber: 1, documentFileId: "file-ct2-v1", contentHash: "sha256-2c8f5b1d9e4a7c3f6b2d8e5a1c4f9b7d3e6a2c8f5b1d4e9a7c3f6b2d8e5a1c4f", effectiveFrom: "2026-06-10T09:00:00Z", createdAt: "2026-06-10T09:00:00Z" },
  { id: "cv-5", contractId: "contract-2", versionNumber: 2, documentFileId: "file-ct2-v2", contentHash: "sha256-9a4c7f2b8d5e1a6c3f9b7d2e4a8c5f1b6d9e3a7c4f2b8d5e1a9c6f3b7d4e2a8c", effectiveFrom: "2026-07-01T00:00:00Z", createdAt: "2026-07-01T00:00:00Z" },

  { id: "cv-6", contractId: "contract-3", versionNumber: 1, documentFileId: "file-ct3-v1", contentHash: "sha256-6f1b9d4e7a2c8f5b3d6e1a9c4f7b2d8e5a3c6f9b1d4e7a2c8f5b3d6e9a1c4f7b", effectiveFrom: "2026-08-01T14:00:00Z", createdAt: "2026-08-01T14:00:00Z" },

  { id: "cv-7", contractId: "contract-4", versionNumber: 1, documentFileId: "file-ct4-v1", contentHash: "sha256-3d8e5a1c6f9b4d7e2a8c5f1b3d9e6a4c7f2b8d5e1a9c3f6b4d7e2a8c5f1b9d3e", effectiveFrom: "2026-08-10T11:00:00Z", createdAt: "2026-08-10T11:00:00Z" },
];

// status: PENDING | SIGNED
export const SIGNATURES = [
  { id: "sig-1", contractVersionId: "cv-3", personId: "person-5", signedAt: "2026-05-25T10:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9001" },
  { id: "sig-2", contractVersionId: "cv-3", personId: "person-4", signedAt: "2026-05-25T11:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9002" },
  { id: "sig-3", contractVersionId: "cv-3", personId: "person-3", signedAt: "2026-05-26T09:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9003" },

  { id: "sig-4", contractVersionId: "cv-5", personId: "person-1", signedAt: "2026-06-28T10:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9010" },
  { id: "sig-5", contractVersionId: "cv-5", personId: "person-6", signedAt: "2026-06-29T09:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9011" },
  { id: "sig-6", contractVersionId: "cv-5", personId: "person-10", signedAt: null, status: "PENDING", externalSignatureId: null },

  { id: "sig-7", contractVersionId: "cv-6", personId: "person-2", signedAt: null, status: "PENDING", externalSignatureId: null },
  { id: "sig-8", contractVersionId: "cv-6", personId: "person-12", signedAt: "2026-08-19T15:00:00Z", status: "SIGNED", externalSignatureId: "ext-sig-9020" },
];

// guaranteeType: GUARANTOR | INSURANCE | DEPOSIT | CAPITALIZATION_TITLE
export const GUARANTEES = [
  { id: "gt-1", contractId: "contract-2", guaranteeType: "GUARANTOR", guarantorPersonId: "person-10", value: null, status: "ACTIVE", startsAt: "2026-07-01T00:00:00Z", endsAt: "2028-06-30T00:00:00Z", lockVersion: 1 },
  { id: "gt-2", contractId: "contract-3", guaranteeType: "INSURANCE", guarantorPersonId: null, value: 6600, status: "ACTIVE", startsAt: "2026-09-01T00:00:00Z", endsAt: "2028-08-31T00:00:00Z", lockVersion: 0 },
  { id: "gt-3", contractId: "contract-5", guaranteeType: "DEPOSIT", guarantorPersonId: null, value: 8200, status: "ACTIVE", startsAt: null, endsAt: null, lockVersion: 0 },
  { id: "gt-4", contractId: "contract-8", guaranteeType: "CAPITALIZATION_TITLE", guarantorPersonId: null, value: 13600, status: "ACTIVE", startsAt: null, endsAt: null, lockVersion: 0 },
];

// inspectionType: CHECK_IN | CHECK_OUT | PERIODIC — status: SCHEDULED | COMPLETED
export const INSPECTIONS = [
  { id: "insp-1", propertyId: "prop-1", contractId: "contract-2", inspectorUserId: "user-3", inspectionType: "CHECK_IN", scheduledAt: "2026-06-28T10:00:00Z", completedAt: "2026-06-28T11:30:00Z", status: "COMPLETED", lockVersion: 1 },
  { id: "insp-2", propertyId: "prop-3", contractId: "contract-3", inspectorUserId: "user-3", inspectionType: "CHECK_IN", scheduledAt: "2026-08-28T09:00:00Z", completedAt: null, status: "SCHEDULED", lockVersion: 0 },
  { id: "insp-3", propertyId: "prop-9", contractId: "contract-5", inspectorUserId: "user-7", inspectionType: "CHECK_IN", scheduledAt: "2026-08-25T14:00:00Z", completedAt: null, status: "SCHEDULED", lockVersion: 0 },
  { id: "insp-4", propertyId: "prop-6", contractId: null, inspectorUserId: "user-3", inspectionType: "PERIODIC", scheduledAt: "2026-08-05T10:00:00Z", completedAt: "2026-08-05T11:00:00Z", status: "COMPLETED", lockVersion: 1 },
  {
    // Par entrada/saída do mesmo imóvel — usado para ilustrar compareInspections() no detalhe.
    id: "insp-5", propertyId: "prop-8", contractId: null, inspectorUserId: "user-3", inspectionType: "CHECK_OUT", scheduledAt: "2026-07-15T09:00:00Z", completedAt: "2026-07-15T10:15:00Z", status: "COMPLETED", lockVersion: 1,
  },
  { id: "insp-6", propertyId: "prop-8", contractId: null, inspectorUserId: "user-7", inspectionType: "CHECK_IN", scheduledAt: "2024-01-10T09:00:00Z", completedAt: "2024-01-10T10:00:00Z", status: "COMPLETED", lockVersion: 1 },
];

// condition: GOOD | REGULAR | DAMAGED
export const INSPECTION_ITEMS = [
  { id: "ii-1", inspectionId: "insp-1", itemName: "Pintura — sala", condition: "GOOD", notes: "Sem marcas ou manchas." },
  { id: "ii-2", inspectionId: "insp-1", itemName: "Piso — porcelanato", condition: "GOOD", notes: "" },
  { id: "ii-3", inspectionId: "insp-1", itemName: "Cozinha planejada", condition: "GOOD", notes: "Todas as portas funcionando." },
  { id: "ii-4", inspectionId: "insp-1", itemName: "Instalações elétricas", condition: "REGULAR", notes: "Uma tomada da sala solta." },

  { id: "ii-5", inspectionId: "insp-4", itemName: "Pintura — quarto", condition: "REGULAR", notes: "Desgaste leve próximo à janela." },
  { id: "ii-6", inspectionId: "insp-4", itemName: "Piso — laminado", condition: "GOOD", notes: "" },
  { id: "ii-7", inspectionId: "insp-4", itemName: "Banheiro — box", condition: "DAMAGED", notes: "Trinco quebrado, vidro trincado no canto." },

  { id: "ii-8", inspectionId: "insp-6", itemName: "Pintura — geral", condition: "GOOD", notes: "Imóvel recém-pintado na entrada." },
  { id: "ii-9", inspectionId: "insp-6", itemName: "Piso — geral", condition: "GOOD", notes: "" },
  { id: "ii-10", inspectionId: "insp-6", itemName: "Instalações hidráulicas", condition: "GOOD", notes: "" },
  { id: "ii-11", inspectionId: "insp-6", itemName: "Esquadrias/janelas", condition: "GOOD", notes: "" },

  { id: "ii-12", inspectionId: "insp-5", itemName: "Pintura — geral", condition: "REGULAR", notes: "Marcas de móveis nas paredes." },
  { id: "ii-13", inspectionId: "insp-5", itemName: "Piso — geral", condition: "REGULAR", notes: "Riscos visíveis na sala." },
  { id: "ii-14", inspectionId: "insp-5", itemName: "Instalações hidráulicas", condition: "DAMAGED", notes: "Vazamento leve sob a pia do banheiro." },
  { id: "ii-15", inspectionId: "insp-5", itemName: "Esquadrias/janelas", condition: "GOOD", notes: "" },
];

// status: PENDING | RELEASED
export const KEY_DELIVERIES = [
  { id: "kd-1", contractId: "contract-2", inspectionId: "insp-1", deliveredToPersonId: "person-6", deliveredByUserId: "user-3", deliveredAt: "2026-06-28T12:00:00Z", status: "RELEASED", notes: "Entregues 2 jogos de chave + controle do portão." },
  { id: "kd-2", contractId: "contract-3", inspectionId: "insp-2", deliveredToPersonId: "person-12", deliveredByUserId: null, deliveredAt: null, status: "PENDING", notes: "Aguardando conclusão da vistoria de entrada." },
  { id: "kd-3", contractId: "contract-5", inspectionId: "insp-3", deliveredToPersonId: "person-7", deliveredByUserId: null, deliveredAt: null, status: "PENDING", notes: "Contrato ainda em análise documental." },
  { id: "kd-4", contractId: "contract-8", inspectionId: null, deliveredToPersonId: "person-8", deliveredByUserId: null, deliveredAt: null, status: "PENDING", notes: "Sem vistoria de entrada agendada." },
];

// caseType: LITIGATION | CONSULTATIVE | COLLECTION
export const LEGAL_CASES = [
  {
    id: "case-1", contractId: "contract-2", propertyId: "prop-1", responsibleUserId: "user-1",
    caseNumber: "PROC-2026-014", caseType: "COLLECTION", status: "OPEN",
    summary: "Cobrança de aluguéis em atraso — locatário João Pereira, meses de junho e julho.",
    lockVersion: 2,
  },
  {
    id: "case-2", contractId: "contract-7", propertyId: "prop-5", responsibleUserId: "user-1",
    caseNumber: "PROC-2026-009", caseType: "LITIGATION", status: "OPEN",
    summary: "Disputa sobre rescisão de contrato de compra e venda — restituição de sinal.",
    lockVersion: 4,
  },
  {
    id: "case-3", contractId: null, propertyId: "prop-4", responsibleUserId: "user-1",
    caseNumber: "PROC-2026-021", caseType: "CONSULTATIVE", status: "OPEN",
    summary: "Parecer sobre regularização de matrícula do Galpão Industrial Zona Sul antes da venda.",
    lockVersion: 1,
  },
  {
    id: "case-4", contractId: "contract-1", propertyId: "prop-2", responsibleUserId: "user-1",
    caseNumber: "PROC-2026-002", caseType: "LITIGATION", status: "CLOSED",
    summary: "Impugnação de cláusula de reajuste — encerrado com acordo entre as partes.",
    lockVersion: 3,
  },
];

// status: PENDING | DONE
export const LEGAL_DEADLINES = [
  { id: "ld-1", legalCaseId: "case-1", description: "Protocolar notificação extrajudicial de cobrança", dueAt: "2026-08-10T00:00:00Z", status: "DONE" },
  { id: "ld-2", legalCaseId: "case-1", description: "Prazo para contestação do locatário", dueAt: "2026-08-25T00:00:00Z", status: "PENDING" },
  { id: "ld-3", legalCaseId: "case-1", description: "Audiência de conciliação", dueAt: "2026-09-05T00:00:00Z", status: "PENDING" },

  { id: "ld-4", legalCaseId: "case-2", description: "Apresentar réplica à contestação", dueAt: "2026-08-15T00:00:00Z", status: "PENDING" },
  { id: "ld-5", legalCaseId: "case-2", description: "Perícia técnica — laudo de vistoria", dueAt: "2026-09-30T00:00:00Z", status: "PENDING" },

  { id: "ld-6", legalCaseId: "case-3", description: "Solicitar certidão atualizada de matrícula", dueAt: "2026-08-30T00:00:00Z", status: "PENDING" },

  { id: "ld-7", legalCaseId: "case-4", description: "Protocolar acordo homologado", dueAt: "2026-07-01T00:00:00Z", status: "DONE" },
];

// Append-only. manifestJson espelha um array de {type, description, referenceId, hash}.
// packageHash ilustrativo (formato sha256-XXXX).
export const EVIDENCE_PACKAGES = [
  {
    id: "ep-1", legalCaseId: "case-1", createdAt: "2026-08-12T09:00:00Z",
    packageHash: "sha256-7e2a9c4f1b6d8e3a5c7f2b9d4e1a6c8f3b5d7e9a2c4f6b1d8e3a9c5f7b2d4e6a",
    manifestJson: [
      { type: "DOCUMENT", description: "Contrato de locação assinado (v2)", referenceId: "cv-5", hash: "sha256-9a4c7f2b8d5e1a6c3f9b7d2e4a8c5f1b6d9e3a7c4f2b8d5e1a9c6f3b7d4e2a8c" },
      { type: "COMMUNICATION", description: "Notificação extrajudicial enviada via cartório", referenceId: "not-2026-014", hash: "sha256-3b6d9e2a5c7f1b4d8e3a6c9f2b5d7e1a4c8f6b3d9e2a5c7f1b4d8e6a3c9f2b5d" },
      { type: "FINANCIAL_ENTRY", description: "Extrato de aluguéis em atraso (jun-jul/2026)", referenceId: "fe-2", hash: "sha256-1d4e7a9c2f5b8d3e6a1c4f9b7d2e5a8c3f6b1d9e4a7c2f5b8d3e6a9c1f4b7d2e" },
    ],
  },
  {
    id: "ep-2", legalCaseId: "case-2", createdAt: "2026-07-25T14:00:00Z",
    packageHash: "sha256-5c8f1b4d7e2a9c6f3b5d8e1a4c7f2b9d6e3a5c8f1b4d7e9a2c6f3b5d8e1a4c7f",
    manifestJson: [
      { type: "DOCUMENT", description: "Contrato de compra e venda — versão inicial", referenceId: "cv-1", hash: "sha256-8f3a1c2e9d4b7f10a5c3e8b1d6f2a90c4e7b3d1f8a2c5e9b0d6f3a1c7e8b2d4f" },
      { type: "INSPECTION", description: "Vistoria periódica anterior ao pedido de rescisão", referenceId: "insp-6", hash: "sha256-2a5c8f1b4d7e9a3c6f2b5d8e1a4c7f9b3d6e2a5c8f1b7d9e4a2c6f3b5d8e1a4c" },
    ],
  },
];

// ---- Labels / tones (mesmo padrão usado em finance.js) ----

export const CONTRACT_TYPE_LABELS = { SALE: "Venda", LEASE: "Locação", SERVICE: "Prestação de serviço" };
export const CONTRACT_TYPE_TONE = { SALE: "info", LEASE: "brand", SERVICE: "neutral" };

// Ordem oficial da máquina de estados (CANCELLED é estado alternativo, fora da sequência linear).
export const CONTRACT_STATUS_FLOW = ["DRAFT", "DOCUMENTS_PENDING", "LEGAL_REVIEW", "APPROVED", "SIGNING", "SIGNED", "ACTIVE"];
export const CONTRACT_STATUS_LABELS = {
  DRAFT: "Rascunho",
  DOCUMENTS_PENDING: "Documentos pendentes",
  LEGAL_REVIEW: "Análise jurídica",
  APPROVED: "Aprovado",
  SIGNING: "Em assinatura",
  SIGNED: "Assinado",
  ACTIVE: "Ativo",
  CANCELLED: "Cancelado",
};
export const CONTRACT_STATUS_TONE = {
  DRAFT: "neutral",
  DOCUMENTS_PENDING: "warning",
  LEGAL_REVIEW: "warning",
  APPROVED: "info",
  SIGNING: "info",
  SIGNED: "success",
  ACTIVE: "success",
  CANCELLED: "danger",
};

export const PARTY_ROLE_LABELS = { LANDLORD: "Locador", TENANT: "Locatário", GUARANTOR: "Fiador", BUYER: "Comprador", SELLER: "Vendedor" };

export const SIGNATURE_STATUS_LABELS = { PENDING: "Pendente", SIGNED: "Assinado" };
export const SIGNATURE_STATUS_TONE = { PENDING: "warning", SIGNED: "success" };

export const GUARANTEE_TYPE_LABELS = { GUARANTOR: "Fiador", INSURANCE: "Seguro-fiança", DEPOSIT: "Caução", CAPITALIZATION_TITLE: "Título de capitalização" };
export const GUARANTEE_TYPE_ICON = { GUARANTOR: "users", INSURANCE: "shield", DEPOSIT: "money", CAPITALIZATION_TITLE: "layers" };
export const GUARANTEE_STATUS_LABELS = { ACTIVE: "Ativa", EXPIRED: "Expirada", CANCELLED: "Cancelada" };
export const GUARANTEE_STATUS_TONE = { ACTIVE: "success", EXPIRED: "neutral", CANCELLED: "danger" };

export const INSPECTION_TYPE_LABELS = { CHECK_IN: "Entrada", CHECK_OUT: "Saída", PERIODIC: "Periódica" };
export const INSPECTION_TYPE_TONE = { CHECK_IN: "success", CHECK_OUT: "warning", PERIODIC: "info" };
export const INSPECTION_STATUS_LABELS = { SCHEDULED: "Agendada", COMPLETED: "Concluída" };
export const INSPECTION_STATUS_TONE = { SCHEDULED: "warning", COMPLETED: "success" };

export const CONDITION_LABELS = { GOOD: "Bom", REGULAR: "Regular", DAMAGED: "Danificado" };
export const CONDITION_TONE = { GOOD: "success", REGULAR: "warning", DAMAGED: "danger" };

export const KEY_DELIVERY_STATUS_LABELS = { PENDING: "Pendente", RELEASED: "Liberada" };
export const KEY_DELIVERY_STATUS_TONE = { PENDING: "warning", RELEASED: "success" };

export const CASE_TYPE_LABELS = { LITIGATION: "Contencioso", CONSULTATIVE: "Consultivo", COLLECTION: "Cobrança" };
export const CASE_TYPE_TONE = { LITIGATION: "danger", CONSULTATIVE: "info", COLLECTION: "warning" };
export const CASE_STATUS_LABELS = { OPEN: "Aberto", CLOSED: "Encerrado" };
export const CASE_STATUS_TONE = { OPEN: "warning", CLOSED: "neutral" };

export const DEADLINE_STATUS_LABELS = { PENDING: "Pendente", DONE: "Concluído" };
export const DEADLINE_STATUS_TONE = { PENDING: "warning", DONE: "success" };

// ---- Helpers ----

export function partiesOf(contractId) {
  return CONTRACT_PARTIES.filter((p) => p.contractId === contractId);
}

export function versionsOf(contractId) {
  return CONTRACT_VERSIONS.filter((v) => v.contractId === contractId).sort((a, b) => a.versionNumber - b.versionNumber);
}

export function signaturesOf(contractVersionId) {
  return SIGNATURES.filter((s) => s.contractVersionId === contractVersionId);
}

export function guaranteesOf(contractId) {
  return GUARANTEES.filter((g) => g.contractId === contractId);
}

export function itemsOf(inspectionId) {
  return INSPECTION_ITEMS.filter((i) => i.inspectionId === inspectionId);
}

export function deadlinesOf(legalCaseId) {
  return LEGAL_DEADLINES.filter((d) => d.legalCaseId === legalCaseId);
}

export function evidencePackagesOf(legalCaseId) {
  return EVIDENCE_PACKAGES.filter((e) => e.legalCaseId === legalCaseId);
}

// Mesma lógica de "isEntryOverdue" (finance.js), adaptada a prazos jurídicos:
// vencido = due_at no passado e status PENDING; urgente = due_at nos próximos 7 dias.
export function deadlineSeverity(deadline) {
  if (deadline.status === "DONE") return "done";
  const due = new Date(deadline.dueAt).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  if (due - now <= 7 * 24 * 60 * 60 * 1000) return "urgent";
  return "normal";
}

export const DEADLINE_SEVERITY_LABELS = { overdue: "Vencido", urgent: "Urgente", normal: "No prazo", done: "Concluído" };
export const DEADLINE_SEVERITY_TONE = { overdue: "danger", urgent: "warning", normal: "info", done: "success" };

// Próximo status na máquina de estados linear (não avança a partir de ACTIVE nem de CANCELLED).
export function nextContractStatus(status) {
  const idx = CONTRACT_STATUS_FLOW.indexOf(status);
  if (idx === -1 || idx === CONTRACT_STATUS_FLOW.length - 1) return null;
  return CONTRACT_STATUS_FLOW[idx + 1];
}

// Hash ilustrativo — em produção o backend calcula SHA-256 real do documento (content_hash).
export function fakeContentHash() {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return `sha256-${hash}`;
}

// Trava real (key_deliveries.service.js): só libera chave se o contrato estiver
// SIGNED/ACTIVE e, quando houver vistoria de entrada vinculada, ela precisa estar COMPLETED.
export function keyDeliveryBlockReason(delivery, contract, inspection) {
  if (!contract || !["SIGNED", "ACTIVE"].includes(contract.status)) {
    return `O contrato ${contract?.contractNumber || ""} precisa estar assinado (SIGNED) ou ativo (ACTIVE) para liberar as chaves — status atual: ${CONTRACT_STATUS_LABELS[contract?.status] || "desconhecido"}.`;
  }
  if (inspection && inspection.status !== "COMPLETED") {
    return `A vistoria de entrada (CHECK_IN) vinculada ainda não foi concluída — status atual: ${INSPECTION_STATUS_LABELS[inspection.status]}.`;
  }
  return null;
}
