// Chamadas ao módulo de Empresas (core.companies). Usado hoje só para listar as empresas do
// grupo como destino de uma transferência intercompany (Marco 4, finance/fechamento).

import { apiFetch } from "@/lib/api/client";

export async function listCompanies() {
  return apiFetch("/companies");
}
