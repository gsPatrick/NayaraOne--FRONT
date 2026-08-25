// Dados 100% mockados — alinhado ao schema real "construction".* implementado no backend
// (src/features/construction/*.service.js, NayaraOne--API), testado ponta a ponta contra
// Postgres antes deste front ser construído (Marco 6 — Obras e Pós-obra). Nomes de campo em
// camelCase espelham 1:1 os nomes reais dos models Sequelize — nenhum campo aqui foi
// inventado. Pessoas/imóveis/usuários reaproveitam PEOPLE/PROPERTIES/USERS dos outros mocks.
//
// Gap documentado (ver commit da API): RDO, medição formal, orçamento por linha e qualidade
// não tinham tabela nenhuma nos documentos fonte — as 4 tabelas (stage_measurements,
// daily_reports, budget_lines, quality_checklist_items) foram criadas como decisão de
// engenharia. Os workflows de status também são decisão de engenharia (sem enum documentado).

// status do projeto: PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
export const PROJECT_STATUS_LABELS = {
  PLANNED: "Planejada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};
export const PROJECT_STATUS_TONE = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};
// Transições válidas — mesma máquina de estados linear implementada em projects.service.js
export const PROJECT_STATUS_FLOW = {
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PROJECTS = [
  {
    id: "project-1", groupId: "group-1", companyId: "company-1", propertyId: "prop-3",
    name: "Edifício Aurora — Obra de reforma estrutural", responsibleUserId: "user-2",
    budgetAmount: 850000, startsAt: "2026-03-01T00:00:00Z", endsAtPlanned: "2026-12-15T00:00:00Z",
    status: "IN_PROGRESS", lockVersion: 3, createdAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "project-2", groupId: "group-1", companyId: "company-1", propertyId: "prop-7",
    name: "Galpão Industrial Zona Sul — Ampliação", responsibleUserId: "user-3",
    budgetAmount: 1200000, startsAt: "2026-06-01T00:00:00Z", endsAtPlanned: "2027-03-01T00:00:00Z",
    status: "IN_PROGRESS", lockVersion: 2, createdAt: "2026-05-10T10:00:00Z",
  },
  {
    id: "project-3", groupId: "group-1", companyId: "company-1", propertyId: null,
    name: "Loteamento Vale Verde — Etapa 1", responsibleUserId: "user-2",
    budgetAmount: 3200000, startsAt: "2026-09-01T00:00:00Z", endsAtPlanned: "2028-01-01T00:00:00Z",
    status: "PLANNED", lockVersion: 0, createdAt: "2026-08-05T14:00:00Z",
  },
  {
    id: "project-4", groupId: "group-1", companyId: "company-1", propertyId: "prop-10",
    name: "Cobertura Vista Verde — Retrofit", responsibleUserId: "user-3",
    budgetAmount: 420000, startsAt: "2025-11-01T00:00:00Z", endsAtPlanned: "2026-05-01T00:00:00Z",
    status: "COMPLETED", lockVersion: 5, createdAt: "2025-10-20T09:00:00Z",
  },
  {
    id: "project-5", groupId: "group-1", companyId: "company-1", propertyId: "prop-5",
    name: "Sala Comercial Centro — Reforma elétrica", responsibleUserId: "user-2",
    budgetAmount: 95000, startsAt: null, endsAtPlanned: null,
    status: "CANCELLED", lockVersion: 1, createdAt: "2026-04-01T11:00:00Z",
  },
];

// status da etapa: PENDING | IN_PROGRESS | DONE (livre, sem enum no backend — convenção da tela)
export const STAGE_STATUS_LABELS = { PENDING: "Pendente", IN_PROGRESS: "Em andamento", DONE: "Concluída" };
export const STAGE_STATUS_TONE = { PENDING: "neutral", IN_PROGRESS: "info", DONE: "success" };

export const PROJECT_STAGES = [
  { id: "stage-1", groupId: "group-1", companyId: "company-1", projectId: "project-1", name: "Fundação e estrutura", sequence: 1, plannedPct: 25, measuredPct: 25, status: "DONE", startsAt: "2026-03-01T00:00:00Z", endsAt: "2026-05-01T00:00:00Z" },
  { id: "stage-2", groupId: "group-1", companyId: "company-1", projectId: "project-1", name: "Alvenaria e vedação", sequence: 2, plannedPct: 20, measuredPct: 14, status: "IN_PROGRESS", startsAt: "2026-05-02T00:00:00Z", endsAt: "2026-07-01T00:00:00Z" },
  { id: "stage-3", groupId: "group-1", companyId: "company-1", projectId: "project-1", name: "Instalações elétricas e hidráulicas", sequence: 3, plannedPct: 20, measuredPct: null, status: "PENDING", startsAt: "2026-07-01T00:00:00Z", endsAt: "2026-09-01T00:00:00Z" },
  { id: "stage-4", groupId: "group-1", companyId: "company-1", projectId: "project-1", name: "Acabamento", sequence: 4, plannedPct: 25, measuredPct: null, status: "PENDING", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-11-15T00:00:00Z" },
  { id: "stage-5", groupId: "group-1", companyId: "company-1", projectId: "project-1", name: "Entrega e limpeza final", sequence: 5, plannedPct: 10, measuredPct: null, status: "PENDING", startsAt: "2026-11-15T00:00:00Z", endsAt: "2026-12-15T00:00:00Z" },
  { id: "stage-6", groupId: "group-1", companyId: "company-1", projectId: "project-2", name: "Terraplenagem", sequence: 1, plannedPct: 15, measuredPct: 15, status: "DONE", startsAt: "2026-06-01T00:00:00Z", endsAt: "2026-07-01T00:00:00Z" },
  { id: "stage-7", groupId: "group-1", companyId: "company-1", projectId: "project-2", name: "Estrutura metálica", sequence: 2, plannedPct: 35, measuredPct: 20, status: "IN_PROGRESS", startsAt: "2026-07-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" },
  { id: "stage-8", groupId: "group-1", companyId: "company-1", projectId: "project-2", name: "Cobertura e fechamento", sequence: 3, plannedPct: 30, measuredPct: null, status: "PENDING", startsAt: "2026-10-01T00:00:00Z", endsAt: "2027-01-01T00:00:00Z" },
  { id: "stage-9", groupId: "group-1", companyId: "company-1", projectId: "project-2", name: "Acabamento e entrega", sequence: 4, plannedPct: 20, measuredPct: null, status: "PENDING", startsAt: "2027-01-01T00:00:00Z", endsAt: "2027-03-01T00:00:00Z" },
];

// status da medição: PENDING_APPROVAL | APPROVED | REJECTED
export const MEASUREMENT_STATUS_LABELS = { PENDING_APPROVAL: "Aguardando aprovação", APPROVED: "Aprovada", REJECTED: "Rejeitada" };
export const MEASUREMENT_STATUS_TONE = { PENDING_APPROVAL: "warning", APPROVED: "success", REJECTED: "danger" };

export const STAGE_MEASUREMENTS = [
  { id: "meas-1", groupId: "group-1", companyId: "company-1", projectStageId: "stage-1", measuredPct: 25, measuredAt: "2026-05-01T00:00:00Z", measuredByUserId: "user-2", notes: "Fundação 100% concluída, sem ressalvas.", status: "APPROVED", approvedByUserId: "user-1", decidedAt: "2026-05-02T10:00:00Z", rejectionReason: null },
  { id: "meas-2", groupId: "group-1", companyId: "company-1", projectStageId: "stage-2", measuredPct: 14, measuredAt: "2026-06-20T00:00:00Z", measuredByUserId: "user-2", notes: "Alvenaria do térreo concluída, 1º pavimento em andamento.", status: "APPROVED", approvedByUserId: "user-1", decidedAt: "2026-06-21T09:00:00Z", rejectionReason: null },
  { id: "meas-3", groupId: "group-1", companyId: "company-1", projectStageId: "stage-2", measuredPct: 18, measuredAt: "2026-08-20T00:00:00Z", measuredByUserId: "user-2", notes: "2º pavimento avançando conforme cronograma.", status: "PENDING_APPROVAL", approvedByUserId: null, decidedAt: null, rejectionReason: null },
  { id: "meas-4", groupId: "group-1", companyId: "company-1", projectStageId: "stage-7", measuredPct: 20, measuredAt: "2026-08-18T00:00:00Z", measuredByUserId: "user-3", notes: "Montagem de 60% dos pórticos metálicos.", status: "APPROVED", approvedByUserId: "user-1", decidedAt: "2026-08-19T08:00:00Z", rejectionReason: null },
  { id: "meas-5", groupId: "group-1", companyId: "company-1", projectStageId: "stage-7", measuredPct: 26, measuredAt: "2026-08-24T00:00:00Z", measuredByUserId: "user-3", notes: null, status: "REJECTED", approvedByUserId: "user-1", decidedAt: "2026-08-24T15:00:00Z", rejectionReason: "Percentual acima do fisicamente executado — revisar com o engenheiro responsável antes de reenviar." },
];

export const DAILY_REPORTS = [
  { id: "rdo-1", groupId: "group-1", companyId: "company-1", projectId: "project-1", reportDate: "2026-08-24", weather: "Ensolarado", workforceCount: 14, occurrences: "Sem intercorrências. Concretagem da laje do 2º pavimento concluída.", reportedByUserId: "user-2" },
  { id: "rdo-2", groupId: "group-1", companyId: "company-1", projectId: "project-1", reportDate: "2026-08-23", weather: "Nublado", workforceCount: 12, occurrences: "Chuva no período da tarde interrompeu concretagem por 2h.", reportedByUserId: "user-2" },
  { id: "rdo-3", groupId: "group-1", companyId: "company-1", projectId: "project-1", reportDate: "2026-08-22", weather: "Ensolarado", workforceCount: 14, occurrences: null, reportedByUserId: "user-2" },
  { id: "rdo-4", groupId: "group-1", companyId: "company-1", projectId: "project-2", reportDate: "2026-08-24", weather: "Ensolarado", workforceCount: 22, occurrences: "Chegada de novo lote de vigas metálicas — conferência ok.", reportedByUserId: "user-3" },
  { id: "rdo-5", groupId: "group-1", companyId: "company-1", projectId: "project-2", reportDate: "2026-08-23", weather: "Ventania", workforceCount: 18, occurrences: "Içamento de estrutura suspenso por segurança devido ao vento forte.", reportedByUserId: "user-3" },
];

export const BUDGET_LINES = [
  { id: "budget-1", groupId: "group-1", companyId: "company-1", projectId: "project-1", costCenterId: "cc-3", category: "Fundação e estrutura", description: "Concreto, aço e mão de obra", plannedAmount: 210000, actualAmount: 218500 },
  { id: "budget-2", groupId: "group-1", companyId: "company-1", projectId: "project-1", costCenterId: "cc-3", category: "Alvenaria e vedação", description: "Blocos, argamassa e mão de obra", plannedAmount: 170000, actualAmount: 95400 },
  { id: "budget-3", groupId: "group-1", companyId: "company-1", projectId: "project-1", costCenterId: null, category: "Instalações", description: "Elétrica e hidráulica", plannedAmount: 170000, actualAmount: null },
  { id: "budget-4", groupId: "group-1", companyId: "company-1", projectId: "project-1", costCenterId: null, category: "Acabamento", description: "Pintura, piso e esquadrias", plannedAmount: 212500, actualAmount: null },
  { id: "budget-5", groupId: "group-1", companyId: "company-1", projectId: "project-1", costCenterId: null, category: "Entrega e limpeza", description: null, plannedAmount: 85000, actualAmount: null },
  { id: "budget-6", groupId: "group-1", companyId: "company-1", projectId: "project-2", costCenterId: "cc-3", category: "Terraplenagem", description: null, plannedAmount: 180000, actualAmount: 176200 },
  { id: "budget-7", groupId: "group-1", companyId: "company-1", projectId: "project-2", costCenterId: "cc-3", category: "Estrutura metálica", description: "Fornecimento e montagem", plannedAmount: 420000, actualAmount: 251000 },
];

// status do item de qualidade: PENDING | OK | NOT_OK
export const QUALITY_STATUS_LABELS = { PENDING: "Pendente", OK: "Aprovado", NOT_OK: "Reprovado" };
export const QUALITY_STATUS_TONE = { PENDING: "neutral", OK: "success", NOT_OK: "danger" };

export const QUALITY_CHECKLIST_ITEMS = [
  { id: "qc-1", groupId: "group-1", companyId: "company-1", projectId: "project-1", projectStageId: "stage-1", item: "Verificar prumo e nível da fundação", status: "OK", checkedByUserId: "user-1", checkedAt: "2026-05-01T16:00:00Z", notes: "Dentro da tolerância." },
  { id: "qc-2", groupId: "group-1", companyId: "company-1", projectId: "project-1", projectStageId: "stage-2", item: "Verificar impermeabilização das paredes externas", status: "NOT_OK", checkedByUserId: "user-1", checkedAt: "2026-08-10T10:00:00Z", notes: "Reaplicação necessária na fachada norte." },
  { id: "qc-3", groupId: "group-1", companyId: "company-1", projectId: "project-1", projectStageId: null, item: "Conferir laudo de resistência do concreto (28 dias)", status: "PENDING", checkedByUserId: null, checkedAt: null, notes: null },
  { id: "qc-4", groupId: "group-1", companyId: "company-1", projectId: "project-2", projectStageId: "stage-7", item: "Inspeção de solda dos pórticos metálicos", status: "OK", checkedByUserId: "user-1", checkedAt: "2026-08-19T14:00:00Z", notes: null },
  { id: "qc-5", groupId: "group-1", companyId: "company-1", projectId: "project-2", projectStageId: null, item: "Verificar certificado de tratamento anticorrosivo", status: "PENDING", checkedByUserId: null, checkedAt: null, notes: null },
];

// status do chamado de pós-obra: OPEN | IN_PROGRESS | RESOLVED | CLOSED
export const MAINTENANCE_STATUS_LABELS = { OPEN: "Aberto", IN_PROGRESS: "Em andamento", RESOLVED: "Resolvido", CLOSED: "Fechado" };
export const MAINTENANCE_STATUS_TONE = { OPEN: "danger", IN_PROGRESS: "warning", RESOLVED: "success", CLOSED: "neutral" };

export const MAINTENANCE_CASES = [
  { id: "maint-1", groupId: "group-1", companyId: "company-1", propertyId: "prop-10", projectId: "project-4", openedByPersonId: "person-4", responsibleUserId: "user-3", description: "Infiltração no teto do quarto de casal após chuva forte.", status: "IN_PROGRESS", warrantyDeadlineAt: "2027-05-01T00:00:00Z", createdAt: "2026-08-20T09:00:00Z" },
  { id: "maint-2", groupId: "group-1", companyId: "company-1", propertyId: "prop-10", projectId: "project-4", openedByPersonId: "person-4", responsibleUserId: "user-3", description: "Porta do closet empenada, não fecha corretamente.", status: "OPEN", warrantyDeadlineAt: "2027-05-01T00:00:00Z", createdAt: "2026-08-23T11:00:00Z" },
  { id: "maint-3", groupId: "group-1", companyId: "company-1", propertyId: "prop-10", projectId: "project-4", openedByPersonId: null, responsibleUserId: "user-2", description: "Rejunte do banheiro social soltando em alguns pontos.", status: "RESOLVED", warrantyDeadlineAt: "2027-05-01T00:00:00Z", createdAt: "2026-07-10T15:00:00Z" },
  { id: "maint-4", groupId: "group-1", companyId: "company-1", propertyId: "prop-3", projectId: "project-1", openedByPersonId: null, responsibleUserId: null, description: "Trinca de acomodação na parede da garagem — em avaliação estrutural.", status: "CLOSED", warrantyDeadlineAt: "2028-12-15T00:00:00Z", createdAt: "2026-06-01T10:00:00Z" },
];

export function stagesOf(projectId) {
  return PROJECT_STAGES.filter((s) => s.projectId === projectId).sort((a, b) => a.sequence - b.sequence);
}
export function measurementsOf(projectStageId) {
  return STAGE_MEASUREMENTS.filter((m) => m.projectStageId === projectStageId).sort(
    (a, b) => new Date(b.measuredAt) - new Date(a.measuredAt)
  );
}
export function reportsOf(projectId) {
  return DAILY_REPORTS.filter((r) => r.projectId === projectId).sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
}
export function budgetLinesOf(projectId) {
  return BUDGET_LINES.filter((b) => b.projectId === projectId);
}
export function qualityItemsOf(projectId) {
  return QUALITY_CHECKLIST_ITEMS.filter((q) => q.projectId === projectId);
}
