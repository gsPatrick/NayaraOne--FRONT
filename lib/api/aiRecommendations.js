// Decisão humana sobre as sugestões da NAY (M9-D019): aceitar ou rejeitar uma recomendação (ai.ai_recommendations).
// Rotas em /v1/ai: POST /ai/recommendations/:id/accept (corpo vazio) e POST /ai/recommendations/:id/reject ({ reason }, motivo obrigatório).
// Aceitar uma sugestão de diferença da vistoria não cobra nada nem muda a vistoria: só registra a validação da pessoa.
import { apiFetch } from "@/lib/api/client";

export async function acceptAiRecommendation(id) {
  return apiFetch(`/ai/recommendations/${encodeURIComponent(id)}/accept`, { method: "POST", body: {} });
}

export async function rejectAiRecommendation(id, reason) {
  return apiFetch(`/ai/recommendations/${encodeURIComponent(id)}/reject`, { method: "POST", body: { reason } });
}
