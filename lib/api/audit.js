// Chamadas ao módulo de Atividades (trilha de auditoria) da API real.
// Contrato confirmado em NayaraOne--API/src/features/audit/ (audit.service.js, audit.routes.js).
// Somente leitura — audit_log é append-only, não existe endpoint de edição.

import { apiFetch } from "@/lib/api/client";

export async function listAuditLog(filters = {}) {
  const query = new URLSearchParams();
  if (filters.userId) query.set("userId", filters.userId);
  if (filters.entityType) query.set("entityType", filters.entityType);
  if (filters.action) query.set("action", filters.action);
  if (filters.entityId) query.set("entityId", filters.entityId);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/audit-log${suffix}`);
}

export async function getAuditLogEntry(id) {
  return apiFetch(`/audit-log/${id}`);
}
