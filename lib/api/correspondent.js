// Chamadas ao módulo de Correspondente Bancário/Financiamentos (Marco 8) da API real.
// Contrato confirmado em NayaraOne--API/src/features/correspondent/cases/financingCases.service.js.

import { apiFetch } from "@/lib/api/client";

export async function listFinancingCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/financing-cases${suffix}`);
}

export async function getFinancingCase(id) {
  return apiFetch(`/financing-cases/${id}`);
}

export async function createFinancingCase(payload) {
  return apiFetch("/financing-cases", { method: "POST", body: payload });
}
