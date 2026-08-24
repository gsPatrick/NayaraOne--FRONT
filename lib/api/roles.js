// Chamadas ao módulo de Papéis/Permissões (RBAC) da API real.
// Contrato confirmado em NayaraOne--API/src/features/roles/roles.service.js e roles.routes.js.

import { apiFetch } from "@/lib/api/client";

export async function listPermissionsCatalog() {
  return apiFetch("/permissions");
}

export async function listRoles() {
  return apiFetch("/roles");
}

export async function getRole(id) {
  return apiFetch(`/roles/${id}`);
}

export async function createRole({ name, description, permissionIds }) {
  return apiFetch("/roles", {
    method: "POST",
    body: { name, description: description || undefined, permissionIds: permissionIds || [] },
  });
}

export async function updateRole(id, { name, description, permissionIds }) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (description !== undefined) body.description = description;
  if (permissionIds !== undefined) body.permissionIds = permissionIds;
  return apiFetch(`/roles/${id}`, { method: "PATCH", body });
}

export async function deleteRole(id) {
  return apiFetch(`/roles/${id}`, { method: "DELETE" });
}
