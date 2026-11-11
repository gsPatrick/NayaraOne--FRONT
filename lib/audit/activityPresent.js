// Apresentação da tela de Atividades (M9-D852, reabertura F05): uma linha por ato, sem chave técnica e com "de X para Y".
import { describeSettingChange } from "@/lib/audit/humanize";
import { entityTypeLabel } from "@/lib/audit/labels";
import { auditActionLabel } from "@/lib/audit/actionLabels";
import { humanizeText } from "@/lib/format";

const FLAG_TYPES = new Set(["governance.feature_flag", "governance.config_entry"]);
const flagValue = (value) => (value === true ? "ligado" : value === false ? "desligado" : value === null || value === undefined ? "sem valor" : String(value));

/** Chave com responsável (M9-D870): "chave: alterado de ligado para desligado (versão 2). Motivo." A chave técnica é o nome da própria chave de funcionalidade. */
function describeFlagChange(entry) {
  const before = entry.beforeJson;
  const after = entry.afterJson || {};
  const name = after.key || before?.key || "Chave de funcionalidade";
  const reason = humanizeText(entry.reason);
  const version = after.version ? ` (versão ${after.version})` : "";
  if (!before) return `${name}: criada com valor ${flagValue(after.value)}${version}`;
  const change = flagValue(before.value) === flagValue(after.value) ? "dados da chave alterados" : `alterado de ${flagValue(before.value)} para ${flagValue(after.value)}`;
  return `${name}: ${change}${version}${reason ? `. ${reason}` : ""}`;
}

/** Frase mostrada em "O que executou": parâmetro vira "Nome: alterado de A para B"; o resto usa o motivo gravado. */
export function activityTitle(entry) {
  if (entry?.entityType === "TenantSetting") return describeSettingChange(entry.beforeJson, entry.afterJson);
  if (FLAG_TYPES.has(entry?.entityType)) return describeFlagChange(entry);
  return humanizeText(entry?.reason) || auditActionLabel(entry?.action) || entry?.action || "";
}

/** Texto de busca: o que a tela mostra (frase e tipo traduzidos), nunca a chave técnica. */
export function activitySearchText(entry, actorName = "") {
  return `${actorName} ${activityTitle(entry)} ${entry?.action || ""} ${entityTypeLabel(entry?.entityType)} ${entry?.entityId || ""}`.toLowerCase();
}

/**
 * Junta linhas seguidas e idênticas (mesmo autor, ação, tipo, registro e frase) em uma só com `repeticoes`.
 * A lista chega do mais novo para o mais antigo; a linha que fica é a mais nova.
 */
export function collapseRepeated(entries) {
  const out = [];
  for (const entry of entries || []) {
    const prev = out[out.length - 1];
    const same =
      prev &&
      prev.userId === entry.userId &&
      prev.action === entry.action &&
      prev.entityType === entry.entityType &&
      (prev.entityId || null) === (entry.entityId || null) &&
      activityTitle(prev) === activityTitle(entry);
    if (same) prev.repeticoes += 1;
    else out.push({ ...entry, repeticoes: 1 });
  }
  return out;
}
