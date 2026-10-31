// Carga do Painel (M9-D940). Cada seção só carrega com a permissão correspondente; uma seção que falha não derruba as outras
// (ela entra em `failed` e a tela avisa "Parte do painel não carregou"). Só quando TODAS as seções permitidas falham a carga
// sobe como erro, com o status da primeira falha, para a tela mostrar o estado certo (sem acesso, sem conexão, tentar de novo).
import { listProperties } from "@/lib/api/properties";
import { listOpportunities } from "@/lib/api/crm";
import { listRadars } from "@/lib/api/radar";
import { listPeople, listDuplicatePairs } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";

// FIX (auditoria Marco 7 "final2", 18/10/2026): cada seção só carrega e só aparece com a permissão correspondente; as
// abas administrativas seguem o mesmo gate do menu de Administração (permissão de alteração).
export const SECTION_PERMISSIONS = {
  properties: "properties:read",
  people: "people:read",
  opportunities: "crm:opportunities:read",
  radars: "radar:read",
  companies: "companies:update",
  users: "users:update",
};

function toDisplayUserStatus(apiStatus) {
  return apiStatus === "ACTIVE" ? "Ativo" : "Suspenso";
}

export async function loadPainelOverview() {
  const can = Object.fromEntries(Object.entries(SECTION_PERMISSIONS).map(([key, code]) => [key, hasPermission(code)]));
  const skip = Promise.resolve(null);
  const sources = {
    properties: can.properties ? listProperties() : skip,
    people: can.people ? listPeople() : skip,
    duplicates: can.people ? listDuplicatePairs() : skip,
    opportunities: can.opportunities ? listOpportunities() : skip,
    radars: can.radars ? listRadars() : skip,
    companies: can.companies ? apiFetch("/companies") : skip,
    units: can.companies ? apiFetch("/units") : skip,
    users: can.users ? apiFetch("/users") : skip,
    memberships: can.users ? apiFetch("/memberships") : skip,
  };
  const keys = Object.keys(sources);
  const results = await Promise.allSettled(keys.map((k) => sources[k]));
  const data = {};
  const failed = [];
  let firstError = null;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") data[keys[i]] = r.value || [];
    else {
      data[keys[i]] = [];
      failed.push(keys[i]);
      firstError = firstError || r.reason;
    }
  });
  if (failed.length > 0 && failed.length === results.filter((_, i) => sources[keys[i]] !== skip).length) throw firstError;
  return {
    can,
    failed,
    properties: data.properties,
    people: data.people,
    duplicatePairs: data.duplicates,
    opportunities: data.opportunities,
    radars: data.radars,
    companies: data.companies.map((c) => ({ ...c, units: data.units.filter((u) => u.companyId === c.id) })),
    users: data.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: toDisplayUserStatus(u.status),
      memberships: data.memberships
        .filter((m) => m.userId === u.id)
        .map((m) => ({ company: m.company?.name || "Sem empresa vinculada", role: m.role?.name || "Sem papel", unit: m.unit?.name || null })),
    })),
  };
}
