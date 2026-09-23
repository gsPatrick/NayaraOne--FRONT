// Chamadas ao módulo de CRM (oportunidades, visitas, mensagens) da API real.
// Contrato confirmado em NayaraOne--API/src/features/crm/ (opportunity.service.js,
// visits.service.js, messages.service.js, crm.routes.js).

import { apiFetch } from "@/lib/api/client";

// crm.opportunities.stage é STRING livre (sem ENUM), mas o backend exige exatamente
// CLOSED_WON/CLOSED_LOST para reconhecer uma etapa como fechada (dispensa nextAction e grava
// closedAt) — ver opportunityNextAction.validator.js. As etapas "ganho"/"perdido" do funil
// mockado são a tradução dessas duas; qualquer outra etapa vira uppercase livre.
const STAGE_KEY_TO_API = { ganho: "CLOSED_WON", perdido: "CLOSED_LOST" };
const API_STAGE_TO_KEY = { CLOSED_WON: "ganho", CLOSED_LOST: "perdido" };

export function toApiStage(stageKey) {
  if (STAGE_KEY_TO_API[stageKey]) return STAGE_KEY_TO_API[stageKey];
  return String(stageKey || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "_");
}

export function fromApiStage(apiStage) {
  if (API_STAGE_TO_KEY[apiStage]) return API_STAGE_TO_KEY[apiStage];
  return String(apiStage || "").toLowerCase();
}

export function mapOpportunity(apiOpportunity) {
  if (!apiOpportunity) return null;
  return {
    id: apiOpportunity.id,
    stage: fromApiStage(apiOpportunity.stage),
    personId: apiOpportunity.personId,
    propertyId: apiOpportunity.propertyId,
    ownerUserId: apiOpportunity.ownerUserId,
    temperature: apiOpportunity.temperature,
    expectedValue: apiOpportunity.expectedValue != null ? Number(apiOpportunity.expectedValue) : null,
    lostReason: apiOpportunity.lostReason || "",
    nextAction: apiOpportunity.nextAction || "",
    nextActionDueAt: apiOpportunity.nextActionDueAt,
    createdAt: apiOpportunity.created_at || apiOpportunity.createdAt,
  };
}

export async function listOpportunities(filters = {}) {
  const query = new URLSearchParams();
  if (filters.stage) query.set("stage", toApiStage(filters.stage));
  if (filters.personId) query.set("personId", filters.personId);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/opportunities${suffix}`);
  return (data || []).map(mapOpportunity);
}

export async function createOpportunity({
  personId,
  propertyId,
  ownerUserId,
  stage,
  nextAction,
  nextActionDueAt,
  wonReason,
  lostReason,
  withdrawnReason,
}) {
  const data = await apiFetch("/opportunities", {
    method: "POST",
    body: {
      personId,
      ...(propertyId ? { propertyId } : {}),
      ...(ownerUserId ? { ownerUserId } : {}),
      stage: toApiStage(stage),
      ...(nextAction ? { nextAction } : {}),
      ...(nextActionDueAt ? { nextActionDueAt } : {}),
      // Motivo estruturado de desfecho (M3-12) — exigido pela API quando `stage` já nasce
      // como CLOSED_WON/CLOSED_LOST/WITHDRAWN (opportunityOutcomeReason.validator.js).
      ...(wonReason ? { wonReason } : {}),
      ...(lostReason ? { lostReason } : {}),
      ...(withdrawnReason ? { withdrawnReason } : {}),
    },
  });
  return mapOpportunity(data);
}

export async function updateOpportunity(id, payload) {
  const body = { ...payload };
  if (body.stage) body.stage = toApiStage(body.stage);
  const data = await apiFetch(`/opportunities/${id}`, { method: "PATCH", body });
  return mapOpportunity(data);
}

export async function deleteOpportunity(id) {
  return apiFetch(`/opportunities/${id}`, { method: "DELETE" });
}

export async function getOpportunity(id) {
  return mapOpportunity(await apiFetch(`/opportunities/${id}`));
}

// --- Linha do tempo (omnichannel) ---
//
// FIX (homologação 23/09/2026): GET /opportunities/:id/timeline já existia na API e devolve a
// linha do tempo real da oportunidade (criação, mudanças de etapa com motivo, e demais
// eventos registrados pelo backend), mas NENHUMA tela do front consumia esse endpoint. O modal
// de detalhe do CRM montava um "histórico" próprio só com visitas + mensagens, então toda
// movimentação de etapa — o evento mais importante do funil, e o que a auditoria precisa ver —
// simplesmente não aparecia em lugar nenhum da interface.
export function mapTimelineEvent(apiEvent) {
  if (!apiEvent) return null;
  return {
    id: apiEvent.id,
    type: apiEvent.type,
    occurredAt: apiEvent.occurredAt,
    actorUserId: apiEvent.actorUserId || null,
    data: apiEvent.data || {},
  };
}

export async function listOpportunityTimeline(opportunityId) {
  const data = await apiFetch(`/opportunities/${opportunityId}/timeline`);
  return (data || []).map(mapTimelineEvent);
}

// --- Visitas ---

export function mapVisit(apiVisit) {
  if (!apiVisit) return null;
  return {
    id: apiVisit.id,
    propertyId: apiVisit.propertyId,
    opportunityId: apiVisit.opportunityId,
    personId: apiVisit.personId,
    agentUserId: apiVisit.agentUserId,
    scheduledAt: apiVisit.scheduledAt,
    status: apiVisit.status,
    feedback: apiVisit.feedback || "",
  };
}

export async function listVisits(filters = {}) {
  const query = new URLSearchParams();
  if (filters.opportunityId) query.set("opportunityId", filters.opportunityId);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  if (filters.personId) query.set("personId", filters.personId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/visits${suffix}`);
  return (data || []).map(mapVisit);
}

// --- Mensagens ---

export function mapMessage(apiMessage) {
  if (!apiMessage) return null;
  return {
    id: apiMessage.id,
    personId: apiMessage.personId,
    opportunityId: apiMessage.opportunityId,
    channel: apiMessage.channel,
    direction: apiMessage.direction,
    authorType: apiMessage.authorType,
    authorUserId: apiMessage.authorUserId,
    body: apiMessage.body || "",
    status: apiMessage.status,
    createdAt: apiMessage.created_at || apiMessage.createdAt,
  };
}

export async function listMessages(filters = {}) {
  const query = new URLSearchParams();
  if (filters.opportunityId) query.set("opportunityId", filters.opportunityId);
  if (filters.personId) query.set("personId", filters.personId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/messages${suffix}`);
  return (data || []).map(mapMessage);
}

// --- Tarefas da oportunidade (M3-11) ---
// Contrato confirmado em NayaraOne--API/src/features/crm/opportunityTasks.service.js.

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELED"];
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export function mapTask(apiTask) {
  if (!apiTask) return null;
  return {
    id: apiTask.id,
    title: apiTask.title || "",
    description: apiTask.description || "",
    assignedToUserId: apiTask.assignedToUserId || apiTask.assigned_to_user_id || null,
    dueAt: apiTask.dueAt || apiTask.due_at || null,
    status: apiTask.status,
    priority: apiTask.priority,
    createdAt: apiTask.createdAt || apiTask.created_at,
  };
}

export async function listOpportunityTasks(opportunityId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.assignedToUserId) query.set("assignedToUserId", filters.assignedToUserId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/opportunities/${opportunityId}/tasks${suffix}`);
  return (data || []).map(mapTask);
}

export async function createOpportunityTask(opportunityId, { title, description, assignedToUserId, dueAt, status, priority }) {
  const data = await apiFetch(`/opportunities/${opportunityId}/tasks`, {
    method: "POST",
    body: {
      title,
      ...(description ? { description } : {}),
      ...(assignedToUserId ? { assignedToUserId } : {}),
      ...(dueAt ? { dueAt } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
  });
  return mapTask(data);
}

// --- Propostas (M3-13 / M3-25) ---
// Contrato confirmado em NayaraOne--API/src/features/crm/proposals.service.js. `value` de uma
// proposta persistida é IMUTÁVEL (append-only por versão) — mudar valor exige criar uma nova
// proposta, nunca um PATCH.

export const PROPOSAL_STATUSES = ["DRAFT", "SENT", "UNDER_NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"];
export const PROPOSAL_ALLOWED_TRANSITIONS = {
  DRAFT: ["SENT", "REJECTED", "EXPIRED"],
  SENT: ["UNDER_NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"],
  UNDER_NEGOTIATION: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

export function mapProposal(apiProposal) {
  if (!apiProposal) return null;
  return {
    id: apiProposal.id,
    opportunityId: apiProposal.opportunityId,
    propertyId: apiProposal.propertyId,
    proposedByPersonId: apiProposal.proposedByPersonId,
    value: apiProposal.value != null ? Number(apiProposal.value) : null,
    currency: apiProposal.currency || "BRL",
    status: apiProposal.status,
    versionNumber: apiProposal.versionNumber,
    notes: apiProposal.notes || "",
    validUntil: apiProposal.validUntil || null,
    sentAt: apiProposal.sentAt || null,
    decidedAt: apiProposal.decidedAt || null,
    decidedByUserId: apiProposal.decidedByUserId || null,
    createdAt: apiProposal.createdAt || apiProposal.created_at,
  };
}

export async function listProposals(filters = {}) {
  const query = new URLSearchParams();
  if (filters.opportunityId) query.set("opportunityId", filters.opportunityId);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/crm/proposals${suffix}`);
  return (data || []).map(mapProposal);
}

export async function getProposal(id) {
  return mapProposal(await apiFetch(`/crm/proposals/${id}`));
}

export async function createProposal({ opportunityId, propertyId, proposedByPersonId, value, currency, status, notes, validUntil }) {
  const data = await apiFetch("/crm/proposals", {
    method: "POST",
    body: {
      opportunityId,
      ...(propertyId ? { propertyId } : {}),
      ...(proposedByPersonId ? { proposedByPersonId } : {}),
      value: Number(value),
      ...(currency ? { currency } : {}),
      ...(status ? { status } : {}),
      ...(notes ? { notes } : {}),
      ...(validUntil ? { validUntil } : {}),
    },
  });
  return mapProposal(data);
}

export async function updateProposalStatus(id, { status, notes }) {
  const data = await apiFetch(`/crm/proposals/${id}/status`, {
    method: "PATCH",
    body: { status, ...(notes !== undefined ? { notes } : {}) },
  });
  return mapProposal(data);
}

// Motivos estruturados de perda (opportunityOutcomeReason.validator.js — LOST_REASONS), usado
// pra traduzir `topLostReasons[].reason` do painel em vez de expor o código cru do enum.
export const LOST_REASON_LABELS = {
  PRICE_TOO_HIGH: "Preço muito alto",
  COMPETITOR: "Foi para um concorrente",
  FINANCING_DENIED: "Financiamento negado",
  LOCATION: "Localização não atendeu",
  OTHER: "Outro",
};

// --- Painel de indicadores (M3-17) ---
// Contrato confirmado em NayaraOne--API/src/features/crm/dashboard.service.js.

export async function getCrmDashboard(filters = {}) {
  const query = new URLSearchParams();
  if (filters.ownerUserId) query.set("ownerUserId", filters.ownerUserId);
  if (filters.personId) query.set("personId", filters.personId);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  if (filters.createdFrom) query.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) query.set("createdTo", filters.createdTo);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/crm/dashboard${suffix}`);
}

// --- Reclamações, elogios e conflitos (M3-20) ---
// Contrato confirmado em NayaraOne--API/src/features/crm/feedbackCases.service.js. SLA
// (slaDueAt) é calculado na criação por severidade (HIGH=24h, MEDIUM=72h, LOW=7 dias) e nunca
// recalculado depois.

export const FEEDBACK_TYPES = ["COMPLAINT", "COMPLIMENT", "CONFLICT"];
export const FEEDBACK_SEVERITIES = ["LOW", "MEDIUM", "HIGH"];
export const FEEDBACK_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED"];

export function mapFeedbackCase(apiCase) {
  if (!apiCase) return null;
  return {
    id: apiCase.id,
    personId: apiCase.personId,
    opportunityId: apiCase.opportunityId,
    type: apiCase.type,
    description: apiCase.description || "",
    severity: apiCase.severity,
    status: apiCase.status,
    assignedToUserId: apiCase.assignedToUserId,
    slaDueAt: apiCase.slaDueAt,
    resolvedAt: apiCase.resolvedAt,
    resolutionNotes: apiCase.resolutionNotes || "",
    escalatedAt: apiCase.escalatedAt,
    createdAt: apiCase.createdAt || apiCase.created_at,
  };
}

export async function listFeedbackCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.type) query.set("type", filters.type);
  if (filters.severity) query.set("severity", filters.severity);
  if (filters.personId) query.set("personId", filters.personId);
  if (filters.assignedToUserId) query.set("assignedToUserId", filters.assignedToUserId);
  if (filters.overdue) query.set("overdue", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch(`/crm/feedback-cases${suffix}`);
  return (data || []).map(mapFeedbackCase);
}

export async function getFeedbackCase(id) {
  return mapFeedbackCase(await apiFetch(`/crm/feedback-cases/${id}`));
}

export async function createFeedbackCase({ personId, opportunityId, type, description, severity, assignedToUserId }) {
  const data = await apiFetch("/crm/feedback-cases", {
    method: "POST",
    body: {
      personId,
      ...(opportunityId ? { opportunityId } : {}),
      type,
      description,
      ...(severity ? { severity } : {}),
      ...(assignedToUserId ? { assignedToUserId } : {}),
    },
  });
  return mapFeedbackCase(data);
}

export async function resolveFeedbackCase(id, { resolutionNotes } = {}) {
  const data = await apiFetch(`/crm/feedback-cases/${id}/resolve`, {
    method: "PATCH",
    body: { ...(resolutionNotes ? { resolutionNotes } : {}) },
  });
  return mapFeedbackCase(data);
}

export async function escalateFeedbackCase(id) {
  const data = await apiFetch(`/crm/feedback-cases/${id}/escalate`, { method: "PATCH", body: {} });
  return mapFeedbackCase(data);
}
