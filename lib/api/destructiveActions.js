// Simulação de impacto das ações destrutivas (M9-D852): o servidor calcula contagens, valor e impedimentos e devolve o impactToken que a confirmação leva de volta.
import { apiFetch } from "@/lib/api/client";

/** `target` = { method: "GET" | "POST", path, body? } (a rota /impact da ação, do inventário docs/governance/destructive-actions.json da API). */
export async function fetchImpact({ method = "GET", path, body }) {
  return apiFetch(path, method === "POST" ? { method: "POST", body: body || {} } : {});
}
