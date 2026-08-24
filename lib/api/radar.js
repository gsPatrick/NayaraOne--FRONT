// Chamadas ao módulo de Radar da API real.
// Contrato confirmado em NayaraOne--API/src/features/radar/ (radar.service.js, radar.routes.js).

import { apiFetch } from "@/lib/api/client";

export function mapRadar(apiRadar) {
  if (!apiRadar) return null;
  return {
    id: apiRadar.id,
    personId: apiRadar.personId,
    opportunityId: apiRadar.opportunityId,
    status: apiRadar.status,
    criteriaJson: apiRadar.criteriaJson || {},
    createdAt: apiRadar.created_at || apiRadar.createdAt,
  };
}

export async function listRadars() {
  const data = await apiFetch("/radar");
  return (data || []).map(mapRadar);
}

export async function getRadar(id) {
  const data = await apiFetch(`/radar/${id}`);
  return { ...mapRadar(data), matches: data?.matches || [] };
}

export async function createRadar({ personId, opportunityId, status, criteriaJson }) {
  const data = await apiFetch("/radar", {
    method: "POST",
    body: { personId, ...(opportunityId ? { opportunityId } : {}), ...(status ? { status } : {}), criteriaJson },
  });
  return { ...mapRadar(data), matches: data?.matches || [] };
}

export async function updateRadar(id, payload) {
  const data = await apiFetch(`/radar/${id}`, { method: "PATCH", body: payload });
  return { ...mapRadar(data), matches: data?.matches || [] };
}

export async function deleteRadar(id) {
  return apiFetch(`/radar/${id}`, { method: "DELETE" });
}

export async function getRadarMatches(id) {
  return apiFetch(`/radar/${id}/matches`);
}
