// Explicação do match do Radar para a tela (M3-15; livro §13 "scoring explicável", Guia §9 "Radar scoring").
// Entrada: a resposta de GET /radar/:id/matches/:propertyId/explain (ou o `radarMatch` que a listagem já traz), no formato
//   { matched, score, requiredScore, reasons, criteria: { <chave>: { category, code?, weight?, matched, reason?, distanceKm? } } }
// Saída: linhas em português por critério (categoria, critério, situação, peso, motivo), sem código cru da API.
// Situação: "Atendido" / "Não atendido" / "Ignorado". Ignorado = preferência ou flexível de um imóvel que já saiu por
// obrigatório não atendido ou exclusão: pelo Guia §9 o cálculo para no obrigatório (score 0) e o peso não conta.

import { formatBRL } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { FEATURE_LABELS } from "@/lib/mock/properties";
import {
  CATEGORY_ORDER, CATEGORY_LABELS, PREFERENCE_OPTIONS, FLEXIBLE_OPTIONS, EXCLUSION_OPTIONS, REQUIRED_LABELS,
  describeCriterion, describeRequired, requiredCriteriaOf, criteriaListOf,
} from "@/lib/radarCriteria";

export const STATUS = Object.freeze({ MET: "MET", UNMET: "UNMET", IGNORED: "IGNORED" });
export const STATUS_LABELS = { MET: "Atendido", UNMET: "Não atendido", IGNORED: "Ignorado" };
export const STATUS_TONES = { MET: "success", UNMET: "danger", IGNORED: "neutral" };

const GROUP_OF = { PREFERENCE: "preferences", FLEXIBLE: "flexible", EXCLUSION: "exclusions" };
const OPTIONS_OF = { PREFERENCE: PREFERENCE_OPTIONS, FLEXIBLE: FLEXIBLE_OPTIONS, EXCLUSION: EXCLUSION_OPTIONS };
const fmtWeight = (w) => Number(w).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

/** Troca, no motivo que a API escreve, os códigos entre aspas (tipo, finalidade, característica, verdadeiro/falso) pelo rótulo e os preços crus por reais. */
export function humanizeReason(reason) {
  if (!reason) return "";
  return String(reason)
    .replace(/"([^"]*)"/g, (whole, token) => {
      const up = token.toUpperCase();
      if (PROPERTY_TYPE_LABELS[up]) return `"${PROPERTY_TYPE_LABELS[up]}"`;
      if (OFFER_TYPE_LABELS[up]) return `"${OFFER_TYPE_LABELS[up]}"`;
      if (FEATURE_LABELS[token]) return `"${FEATURE_LABELS[token]}"`;
      if (token.toLowerCase() === "true") return '"Sim"';
      if (token.toLowerCase() === "false") return '"Não"';
      return whole;
    })
    .replace(/\bATIVA\b/g, "ativa")
    .replace(/(\d+)\.(\d+) (km|m²)/g, "$1,$2 $3")
    .replace(/preço (-?\d+(?:\.\d+)?) > (-?\d+(?:\.\d+)?)/, (_m, a, b) => `preço ${formatBRL(Number(a))}, máximo ${formatBRL(Number(b))}`)
    .replace(/preço (-?\d+(?:\.\d+)?) < (-?\d+(?:\.\d+)?)/, (_m, a, b) => `preço ${formatBRL(Number(a))}, mínimo ${formatBRL(Number(b))}`);
}

/**
 * Item do radar que gerou a chave da explicação. A API monta a chave como `<categoria>:<CODE>[:<key>][:<TIPO>][#n]`
 * (radarScoring.js keyFor); o n-ésimo item igual da lista corresponde ao sufixo #n.
 */
function itemForKey(category, key, criteriaJson) {
  const [base, nth] = String(key).split("#");
  const parts = base.split(":");
  const code = String(parts[1] || "").toUpperCase();
  const attrKey = code === "ATTRIBUTE" ? parts.slice(2).join(":") : null;
  const same = criteriaListOf(criteriaJson, GROUP_OF[category]).filter((item) => {
    if (String(item.code || "").toUpperCase() !== code) return false;
    if (attrKey !== null && item.key !== attrKey) return false;
    if (category === "EXCLUSION" && code === "PROPERTY_TYPE" && parts[2] && String(item.value).toUpperCase() !== parts[2]) return false;
    return true;
  });
  return same[(Number(nth) || 1) - 1] || null;
}

function statusOf(entry, overallMatched) {
  if ((entry.category === "PREFERENCE" || entry.category === "FLEXIBLE") && overallMatched === false) return STATUS.IGNORED;
  return entry.matched ? STATUS.MET : STATUS.UNMET;
}

function weightTextOf(entry, status) {
  if (entry.category === "REQUIRED") return "Eliminatório";
  if (entry.category === "EXCLUSION") return "Eliminatório";
  const w = `Peso ${fmtWeight(entry.weight ?? 1)}`;
  if (status === STATUS.MET) return `${w} (somado ao score)`;
  return `${w} (não somado)`;
}

function criterionLabelOf(category, entry, key) {
  if (category === "REQUIRED") return REQUIRED_LABELS[key] || "Critério obrigatório";
  const option = (OPTIONS_OF[category] || []).find((o) => o.code === String(entry.code || "").toUpperCase());
  return option ? option.label : "Critério";
}

function noteOf(entry, status) {
  if (entry.reason) return humanizeReason(entry.reason);
  if (entry.distanceKm != null) return `Fica a ${Number(entry.distanceKm).toLocaleString("pt-BR")} km do ponto.`;
  if (entry.category === "EXCLUSION" && status === STATUS.MET) return "O imóvel não tem o que o cliente recusa.";
  return "";
}

/** Linhas da explicação, agrupadas na ordem do livro (obrigatório, preferência, flexível, exclusão). */
export function explanationRows(explanation, criteriaJson) {
  const criteria = (explanation && explanation.criteria) || {};
  const required = requiredCriteriaOf(criteriaJson);
  const rows = Object.entries(criteria).map(([key, entry]) => {
    const category = CATEGORY_LABELS[entry.category] ? entry.category : "REQUIRED";
    const status = statusOf({ ...entry, category }, explanation.matched);
    const item = category === "REQUIRED" ? null : itemForKey(category, key, criteriaJson);
    return {
      key,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      criterion: criterionLabelOf(category, entry, key),
      detail: category === "REQUIRED" ? describeRequired(key, required) : item ? describeCriterion(category, { ...item, code: String(item.code).toUpperCase() }) : "",
      status,
      statusLabel: STATUS_LABELS[status],
      weight: category === "PREFERENCE" || category === "FLEXIBLE" ? Number(entry.weight ?? 1) : null,
      weightText: weightTextOf({ ...entry, category }, status),
      note: noteOf(entry, status),
    };
  });
  return rows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

/** Score e contagens para o cabeçalho da explicação. */
export function scoreSummary(explanation) {
  const entries = Object.values((explanation && explanation.criteria) || {});
  const required = entries.filter((e) => e.category === "REQUIRED" || !e.category);
  const weighted = entries.filter((e) => e.category === "PREFERENCE" || e.category === "FLEXIBLE");
  const weightsTotal = weighted.reduce((s, e) => s + Number(e.weight ?? 1), 0);
  const weightsMet = explanation?.matched ? weighted.filter((e) => e.matched).reduce((s, e) => s + Number(e.weight ?? 1), 0) : 0;
  const reasons = Array.isArray(explanation?.reasons) ? explanation.reasons : [];
  const exits = [
    ...(reasons.includes("REQUIRED_FAILED") ? ["um critério obrigatório não foi atendido"] : []),
    ...(reasons.includes("EXCLUDED") ? ["uma exclusão do cliente se aplica"] : []),
  ];
  return {
    matched: Boolean(explanation?.matched),
    scorePercent: `${Math.round(Number(explanation?.score || 0) * 100)}%`,
    requiredMet: required.filter((e) => e.matched).length,
    requiredTotal: required.length,
    weightsMet: fmtWeight(weightsMet),
    weightsTotal: fmtWeight(weightsTotal),
    hasWeighted: weighted.length > 0,
    headline: explanation?.matched
      ? "Compatível: todos os obrigatórios atendidos e nenhuma exclusão se aplica."
      : `Fora do radar: ${exits.join(" e ") || "critério não atendido"}.`,
  };
}
