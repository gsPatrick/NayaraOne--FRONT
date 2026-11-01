// Nome legível de uma permissão para a tela (M9-D850, reabertura F07): "properties:read" vira "Imóveis: leitura". Catálogo único usado por todas as telas
// que dizem o que falta ao usuário; o código técnico nunca aparece no texto (quem precisa dele pede o código de suporte).
import { GROUP_LABELS } from "@/lib/rbac/permissionLabels";

// Módulos que o menu cobra e que a tela de Papéis ainda não rotula (a tela de Papéis segue com o dicionário dela).
const EXTRA_GROUPS = {
  analytics: "Painéis de BI",
  correspondent: "Correspondente bancário",
  "correspondent:documents": "Correspondente — documentos",
  inventory: "Estoque",
  procurement: "Compras",
  integration: "Integrações",
  marketing: "Marketing",
  "marketing:attribution": "Marketing — atribuição",
  governance: "Governança",
  "governance:classification": "Governança — classificação de dados",
  "billing:cadence": "Billing — régua de cobrança",
  ai: "Assistente NAY",
};

const ACTION_NAMES = {
  read: "leitura",
  create: "criação",
  update: "edição",
  delete: "exclusão",
  export: "exportação",
  approve: "aprovação",
  manage: "gestão",
  settle: "liquidação",
  reconcile: "conciliação",
  sign: "assinatura",
  admin: "administração",
  tech: "indicadores técnicos",
  group: "visão do grupo",
};

const groupName = (key) => GROUP_LABELS[key] || EXTRA_GROUPS[key] || null;

/**
 * "Imóveis: leitura". O módulo é o maior prefixo conhecido do código ("crm:opportunities:read" -> "CRM — Oportunidades") e o resto é a ação
 * ("analytics:read:tech" -> "Painéis de BI: leitura (indicadores técnicos)"). Código fora do catálogo vira "uma permissão específica" (sem expor o código).
 */
export function permissionName(code) {
  if (typeof code !== "string" || !code.includes(":")) return "uma permissão específica";
  const parts = code.split(":");
  for (let cut = parts.length - 1; cut >= 1; cut -= 1) {
    const group = groupName(parts.slice(0, cut).join(":"));
    if (!group) continue;
    const [action, ...rest] = parts.slice(cut);
    const detail = rest.map((part) => ACTION_NAMES[part] || "recorte específico").join(", ");
    return `${group}: ${ACTION_NAMES[action] || "acesso específico"}${detail ? ` (${detail})` : ""}`;
  }
  return "uma permissão específica";
}

/** Frase única de "falta permissão": "Falta a permissão Imóveis: leitura." (sem código técnico). */
export function missingPermissionText(code) {
  return `Falta a permissão ${permissionName(code)}.`;
}
