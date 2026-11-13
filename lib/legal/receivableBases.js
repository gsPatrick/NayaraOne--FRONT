// Bases jurídicas do recebível do processo (Caderno M5 §14 "somente quando juridicamente cabível"): a lista vem da API
// (GET /legal/receivable-bases, só as bases que a empresa aceita). O rótulo da tela tem preferência; base nova sem rótulo
// na tela usa o rótulo da API com a primeira letra maiúscula. Código sem rótulo nenhum não aparece.
import { CASE_RECEIVABLE_BASIS_LABELS } from "@/lib/labels/juridico";

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : "");

/** Opções do campo "Base jurídica": [{ code, label }] na ordem da API, sem repetição. */
export function receivableBasisOptions(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && typeof item.code === "string" && !seen.has(item.code) && seen.add(item.code))
    .map((item) => ({ code: item.code, label: CASE_RECEIVABLE_BASIS_LABELS[item.code] || capitalize(String(item.label || "").trim()) }))
    .filter((option) => option.label);
}
