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

export async function createOpportunity({ personId, propertyId, ownerUserId, stage, nextAction, nextActionDueAt }) {
  const data = await apiFetch("/opportunities", {
    method: "POST",
    body: {
      personId,
      ...(propertyId ? { propertyId } : {}),
      ...(ownerUserId ? { ownerUserId } : {}),
      stage: toApiStage(stage),
      ...(nextAction ? { nextAction } : {}),
      ...(nextActionDueAt ? { nextActionDueAt } : {}),
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
