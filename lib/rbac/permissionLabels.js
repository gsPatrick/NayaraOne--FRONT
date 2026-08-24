// Tradução dos códigos de permissão (ex.: "properties:read", "crm:opportunities:create") em
// nome de módulo + ação para a tela de administração de papéis. O código em si (a string
// completa) é o que a API entende — este arquivo é só a camada de apresentação em pt-BR.

// Chave = tudo antes do último ":" (o "grupo" da permissão). Cobre tanto módulos de 1 nível
// (ex. "properties") quanto sub-recursos de 2 níveis (ex. "crm:opportunities").
export const GROUP_LABELS = {
  roles: "Papéis & Permissões",
  groups: "Grupos econômicos",
  companies: "Empresas",
  units: "Unidades/Filiais",
  users: "Usuários do sistema",
  memberships: "Vínculos de acesso",
  people: "Contatos (Pessoas)",
  properties: "Imóveis",
  "crm:opportunities": "CRM — Oportunidades",
  "crm:visits": "CRM — Visitas",
  "crm:messages": "CRM — Mensagens",
  radar: "Radar",
  finance: "Financeiro",
  legal: "Jurídico & Contratos",
};

// Ordem de exibição dos módulos na tela (grupos não listados aqui aparecem no final, em ordem alfabética).
export const GROUP_ORDER = [
  "properties",
  "people",
  "crm:opportunities",
  "crm:visits",
  "crm:messages",
  "radar",
  "finance",
  "legal",
  "companies",
  "units",
  "groups",
  "users",
  "memberships",
  "roles",
];

// Chave = último segmento do código (a ação).
export const ACTION_LABELS = {
  create: "Criar",
  read: "Ver",
  update: "Editar",
  delete: "Apagar",
  internal: "Ver ocorrências internas",
  settle: "Liquidar/Estornar",
  reconcile: "Conciliar",
  approve: "Aprovar",
  bankAccounts: "Gerenciar contas bancárias",
  sign: "Assinar",
  deliverKeys: "Liberar entrega de chaves",
};

export function permissionGroupKey(code) {
  const parts = code.split(":");
  parts.pop();
  return parts.join(":");
}

export function permissionActionKey(code) {
  return code.split(":").pop();
}

export function groupLabel(groupKey) {
  return GROUP_LABELS[groupKey] || groupKey;
}

export function actionLabel(actionKey) {
  return ACTION_LABELS[actionKey] || actionKey;
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
