// Tradução dos códigos de permissão (ex.: "properties:read", "crm:opportunities:create") em
// nome de módulo + ação para a tela de administração de papéis. O código em si (a string
// completa) é o que a API entende — este arquivo é só a camada de apresentação em pt-BR.

import { GROUP_LABELS, SUBGROUP_LABELS, GROUP_DESCRIPTIONS, ACTION_LABELS, CODE_ACTION_LABELS } from "./permissionLabelData";

export { GROUP_LABELS, GROUP_DESCRIPTIONS, ACTION_LABELS };

export function groupDescription(groupKey) {
  return GROUP_DESCRIPTIONS[groupKey] || "";
}

// Ordem de exibição dos módulos na tela (grupos não listados aqui aparecem no final, em ordem alfabética).
export const GROUP_ORDER = [
  "properties",
  "people",
  "crm:opportunities",
  "crm:visits",
  "crm:messages",
  "crm:proposals",
  "crm:tasks",
  "crm:feedback",
  "crm:dashboard",
  "radar",
  "finance",
  "legal",
  "construction",
  "companies",
  "units",
  "groups",
  "users",
  "memberships",
  "roles",
  "billing",
  "audit",
  "settings",
];

export function permissionGroupKey(code) {
  const parts = code.split(":");
  parts.pop();
  return parts.join(":");
}

export function permissionActionKey(code) {
  return code.split(":").pop();
}

const MODULE_ONLY = /^[a-z]+/;

/** Nome do módulo; chave desconhecida nunca aparece crua: usa o módulo-pai conhecido ou "Outro módulo". */
export function groupLabel(groupKey) {
  if (GROUP_LABELS[groupKey]) return GROUP_LABELS[groupKey];
  if (SUBGROUP_LABELS[groupKey]) return SUBGROUP_LABELS[groupKey];
  const parts = String(groupKey || "").split(":");
  for (let cut = parts.length - 1; cut >= 1; cut -= 1) {
    const parent = GROUP_LABELS[parts.slice(0, cut).join(":")];
    if (parent) return `${parent} — outros recursos`;
  }
  const root = (MODULE_ONLY.exec(parts[0] || "") || [""])[0];
  const rootLabel = Object.entries(GROUP_LABELS).find(([key]) => key.startsWith(`${root}:`));
  return rootLabel ? `${rootLabel[1].split(" — ")[0]} — outros recursos` : "Outro módulo";
}

/** Nome da ação; `code` (opcional) permite o texto próprio de um módulo. Desconhecida vira "Ação específica". */
export function actionLabel(actionKey, code) {
  return (code && CODE_ACTION_LABELS[code]) || ACTION_LABELS[actionKey] || "Ação específica";
}

/** Rótulo completo da permissão: "Marketing — envio de mensagens: Enviar em massa". */
export function permissionLabel(code) {
  return `${groupLabel(permissionGroupKey(code))}: ${actionLabel(permissionActionKey(code), code)}`;
}

// Agrupa a lista de permissões (vinda de GET /permissions) em { groupKey, label, permissions: [...] },
// já ordenada pela ordem de exibição preferida.
export function groupPermissions(permissions) {
  const byGroup = new Map();
  for (const permission of permissions) {
    const groupKey = permissionGroupKey(permission.code);
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(permission);
  }

  const groups = Array.from(byGroup.entries()).map(([groupKey, perms]) => ({
    groupKey,
    label: groupLabel(groupKey),
    permissions: perms.sort((a, b) => permissionActionKey(a.code).localeCompare(permissionActionKey(b.code))),
  }));

  groups.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.groupKey);
    const ib = GROUP_ORDER.indexOf(b.groupKey);
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return groups;
}
