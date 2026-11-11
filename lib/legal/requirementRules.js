// Política do checklist documental (regra REG-JUR-001 do Motor de Regras, Caderno M5 §7): leitura em português e conferência
// local do JSON antes de publicar. A API valida de novo (fatos do catálogo, modelos existentes, motivo) e é quem decide.
import { REQUIREMENT_STAGE_LABELS, CONTRACT_TYPE_LABELS } from "@/lib/labels/juridico";

const OP_TEXT = { "==": "é", "!=": "não é", ">": "maior que", ">=": "a partir de", "<": "menor que", "<=": "até", IN: "está entre", NOT_IN: "não está entre" };
const valueText = (v) => (v === true ? "sim" : v === false ? "não" : Array.isArray(v) ? v.join(", ") : String(v));

/** Condição declarativa (`when`) em português, com o rótulo do fato vindo do catálogo da API. */
export function describeWhen(when, facts = {}) {
  if (!when) return "Sempre";
  if (Array.isArray(when.and)) return when.and.map((n) => describeWhen(n, facts)).join(" e ");
  if (Array.isArray(when.or)) return `(${when.or.map((n) => describeWhen(n, facts)).join(" ou ")})`;
  if (when.not !== undefined) return `não (${describeWhen(when.not, facts)})`;
  const label = String(facts[when.fact] || when.fact || "").replace(/\.$/, "");
  return `${label}: ${OP_TEXT[when.op] || when.op} ${valueText(when.value)}`;
}

/** Linhas da tabela: tipo de contrato -> modelo -> itens (com etapa e condição). */
export function policyRows(action, facts = {}) {
  if (!action || !action.templates || !action.typeToTemplate) return [];
  return Object.entries(action.typeToTemplate).map(([type, key]) => ({
    type,
    typeLabel: CONTRACT_TYPE_LABELS[type] || type,
    templateKey: key,
    items: (action.templates[key] || []).map((it) => ({
      code: it.requirementCode,
      description: it.description,
      stage: REQUIREMENT_STAGE_LABELS[it.stage || "LEGAL_REVIEW"] || it.stage,
      condition: describeWhen(it.when, facts),
    })),
  }));
}

/** Confere o texto JSON antes de enviar: { ok, action } ou { ok: false, error } (o mesmo formato que a API exige). */
export function parsePolicyJson(text) {
  let action;
  try { action = JSON.parse(String(text || "")); } catch (e) { return { ok: false, error: "O texto não é um JSON válido." }; }
  if (!action || typeof action !== "object" || !action.templates || !action.typeToTemplate) {
    return { ok: false, error: "A política precisa de \"templates\" e \"typeToTemplate\"." };
  }
  const faltando = Object.entries(action.typeToTemplate).filter(([, key]) => !action.templates[key]).map(([type]) => type);
  if (faltando.length) return { ok: false, error: `Tipos que apontam para modelo inexistente: ${faltando.join(", ")}.` };
  return { ok: true, action };
}

export function reasonError(reason) {
  const r = String(reason || "").trim();
  return r.length < 5 || r.length > 500 ? "Escreva o motivo da nova versão (de 5 a 500 caracteres)." : "";
}
