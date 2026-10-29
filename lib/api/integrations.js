// Chamadas à saúde das integrações (Marco 9, M9-D224/D249) da API real.
// Contrato: GET /admin/integrations?environment= (uma linha por integração, com as 8 métricas do livro em 9 valores),
// GET /admin/integrations/alerts?status= (alertas operacionais). Exigem a permissão integration:read.

import { apiFetch } from "@/lib/api/client";

export async function listIntegrationsHealth({ environment } = {}) {
  const query = environment ? `?environment=${encodeURIComponent(environment)}` : "";
  return apiFetch(`/admin/integrations${query}`);
}

export async function listIntegrationAlerts({ status = "OPEN", limit = 100 } = {}) {
  return apiFetch(`/admin/integrations/alerts?status=${encodeURIComponent(status)}&limit=${limit}`);
}

// Contingências ativas da empresa (Marco 9, M9-D226): GET /admin/integrations/contingency (integration:read).
export async function listActiveContingencies() {
  return apiFetch("/admin/integrations/contingency");
}
