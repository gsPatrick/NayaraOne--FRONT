// Chamadas ao módulo de DLP da API (Marco 9, M9-D825): registro de cópia vinda da tela.
import { apiFetch } from "@/lib/api/client";

// POST /dlp/copy-events — exige só login; o servidor reavalia a política. Rejeita com ApiError (code GOV_DLP_DENIED, GOV_MODULE_DISABLED, ...) quando não registra.
export async function postCopyEvent({ resourceType, resourceId, field, outcome }) {
  return apiFetch("/dlp/copy-events", { method: "POST", body: { resourceType, resourceId, field, outcome }, skipMfaStepUp: true });
}
