// Dados 100% mockados — alinhado ao model real audit.audit_log (src/models/AuditLog.js, API):
// id, groupId, companyId, userId, action, entityType, entityId, beforeJson, afterJson,
// reason, occurredAt, sessionId, ipAddress, correlationId. Log é append-only (sem update/delete).

export const ACTION_LABELS = {
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Excluiu",
  LOGIN: "Entrou no sistema",
  STATUS_CHANGE: "Alterou status",
};

export const ENTITY_TYPE_LABELS = {
  Property: "Imóvel",
  Person: "Contato",
  Opportunity: "Oportunidade",
  PropertyRadar: "Radar",
  Company: "Empresa",
  User: "Usuário",
};

export const AUDIT_LOG = [
  { id: "log-1", userId: "user-2", action: "LOGIN", entityType: "User", entityId: "user-2", occurredAt: "2026-08-19T09:10:00Z" },
  { id: "log-2", userId: "user-2", action: "CREATE", entityType: "Property", entityId: "prop-1", occurredAt: "2026-08-19T09:22:00Z" },
  { id: "log-3", userId: "user-2", action: "UPDATE", entityType: "Property", entityId: "prop-3", reason: "Ajuste de preço de oferta", occurredAt: "2026-08-18T15:40:00Z" },
  { id: "log-4", userId: "user-2", action: "CREATE", entityType: "Opportunity", entityId: "opp-4", occurredAt: "2026-08-17T11:05:00Z" },
  { id: "log-5", userId: "user-2", action: "CREATE", entityType: "Property", entityId: "prop-7", occurredAt: "2026-08-14T10:30:00Z" },
  { id: "log-6", userId: "user-2", action: "CREATE", entityType: "Property", entityId: "prop-10", occurredAt: "2026-08-10T16:12:00Z" },

  { id: "log-7", userId: "user-3", action: "LOGIN", entityType: "User", entityId: "user-3", occurredAt: "2026-08-18T17:45:00Z" },
  { id: "log-8", userId: "user-3", action: "CREATE", entityType: "Property", entityId: "prop-2", occurredAt: "2026-08-18T18:02:00Z" },
  { id: "log-9", userId: "user-3", action: "UPDATE", entityType: "Person", entityId: "person-1", reason: "Atualização de telefone", occurredAt: "2026-08-16T09:50:00Z" },
  { id: "log-10", userId: "user-3", action: "CREATE", entityType: "Property", entityId: "prop-5", occurredAt: "2026-08-12T14:20:00Z" },
  { id: "log-11", userId: "user-3", action: "CREATE", entityType: "Property", entityId: "prop-9", occurredAt: "2026-08-05T09:15:00Z" },

  { id: "log-12", userId: "user-5", action: "LOGIN", entityType: "User", entityId: "user-5", occurredAt: "2026-07-02T08:20:00Z" },
  { id: "log-13", userId: "user-5", action: "CREATE", entityType: "Property", entityId: "prop-4", occurredAt: "2026-07-01T11:00:00Z" },
  { id: "log-14", userId: "user-5", action: "CREATE", entityType: "Property", entityId: "prop-8", occurredAt: "2026-06-20T13:40:00Z" },
  { id: "log-15", userId: "user-5", action: "STATUS_CHANGE", entityType: "User", entityId: "user-5", reason: "Acesso suspenso pelo administrador", occurredAt: "2026-07-02T08:25:00Z" },

  { id: "log-16", userId: "user-7", action: "LOGIN", entityType: "User", entityId: "user-7", occurredAt: "2026-08-15T16:40:00Z" },
  { id: "log-17", userId: "user-7", action: "CREATE", entityType: "Property", entityId: "prop-6", occurredAt: "2026-08-15T17:10:00Z" },
  { id: "log-18", userId: "user-7", action: "UPDATE", entityType: "Opportunity", entityId: "opp-2", occurredAt: "2026-08-11T10:00:00Z" },

  { id: "log-19", userId: "user-1", action: "LOGIN", entityType: "User", entityId: "user-1", occurredAt: "2026-08-19T14:32:00Z" },
  { id: "log-20", userId: "user-1", action: "CREATE", entityType: "Company", entityId: "company-3", occurredAt: "2026-08-01T09:00:00Z" },
  { id: "log-21", userId: "user-1", action: "UPDATE", entityType: "User", entityId: "user-5", reason: "Suspendeu acesso", occurredAt: "2026-07-02T08:25:00Z" },

  { id: "log-22", userId: "user-4", action: "LOGIN", entityType: "User", entityId: "user-4", occurredAt: "2026-08-19T11:02:00Z" },
  { id: "log-23", userId: "user-4", action: "UPDATE", entityType: "Property", entityId: "prop-1", reason: "Atualização de condição de pagamento", occurredAt: "2026-08-18T09:00:00Z" },

  { id: "log-24", userId: "user-6", action: "LOGIN", entityType: "User", entityId: "user-6", occurredAt: "2026-08-17T13:55:00Z" },
  { id: "log-25", userId: "user-6", action: "UPDATE", entityType: "Company", entityId: "company-2", occurredAt: "2026-08-16T10:20:00Z" },

  { id: "log-26", userId: "user-8", action: "LOGIN", entityType: "User", entityId: "user-8", occurredAt: "2026-08-10T10:15:00Z" },
  { id: "log-27", userId: "user-8", action: "UPDATE", entityType: "PropertyRadar", entityId: "radar-2", occurredAt: "2026-08-09T15:30:00Z" },
];

export function getUserAuditLog(userId) {
  return AUDIT_LOG.filter((entry) => entry.userId === userId).sort(
    (a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)
  );
}
