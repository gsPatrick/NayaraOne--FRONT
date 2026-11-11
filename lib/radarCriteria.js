// Critérios do Radar no formato do livro (Marco 3 §13: "Obrigatório (cidade, faixa de preço, finalidade); Preferência (bairro,
// quartos, suíte, garagem); Flexível (distância, estilo, acabamento); Exclusão (não aceita apartamento, sem escada etc.)").
// Espelha o contrato da API (NayaraOne--API/src/features/radar/radarCriteria.js): obrigatórios nas chaves planas de sempre
// (as mesmas que o público de campanhas do Marketing lê em crm.property_radars.criteria_json), e as outras três categorias
// em listas `preferences`, `flexible` e `exclusions`, cada item com `code`, `value` e, quando pontua, `weight` (> 0).
// Funções puras: montam o payload do formulário, leem o radar salvo de volta para o formulário e descrevem cada critério.

import { toNumber, formatBRL } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { FEATURE_LABELS } from "@/lib/mock/properties";

export const CATEGORY_ORDER = ["REQUIRED", "PREFERENCE", "FLEXIBLE", "EXCLUSION"];
export const CATEGORY_LABELS = { REQUIRED: "Obrigatório", PREFERENCE: "Preferência", FLEXIBLE: "Flexível", EXCLUSION: "Exclusão" };

export const PREFERENCE_OPTIONS = [
  { code: "NEIGHBORHOOD", label: "Bairro" },
  { code: "MIN_BEDROOMS", label: "Quartos (mínimo)", numeric: true },
  { code: "MIN_SUITES", label: "Suítes (mínimo)", numeric: true },
  { code: "MIN_PARKING", label: "Vagas de garagem (mínimo)", numeric: true },
];
export const FLEXIBLE_OPTIONS = [
  { code: "ATTRIBUTE", label: "Característica (estilo, acabamento...)" },
  { code: "MAX_DISTANCE_KM", label: "Distância máxima de um ponto (km)", numeric: true },
];
export const EXCLUSION_OPTIONS = [
  { code: "PROPERTY_TYPE", label: "Tipo de imóvel" },
  { code: "ATTRIBUTE", label: "Característica" },
];
const OPTIONS = { preferences: PREFERENCE_OPTIONS, flexible: FLEXIBLE_OPTIONS, exclusions: EXCLUSION_OPTIONS };
const WEIGHTED = { preferences: true, flexible: true, exclusions: false };

export const REQUIRED_FIELDS = ["propertyType", "offerType", "minPrice", "maxPrice", "city", "state", "minAreaM2", "maxAreaM2"];
const NUMERIC_REQUIRED = ["minPrice", "maxPrice", "minAreaM2", "maxAreaM2"];

const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const text = (v) => (blank(v) ? "" : String(v));
let uidSeq = 0;
const nextUid = () => `rc${(uidSeq += 1)}`;

/** Rótulo da característica do imóvel (attributesJson): as conhecidas em português; as livres (ex.: "acabamento") como digitadas. */
export function attributeLabel(key) {
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  const k = String(key || "");
  return k ? k[0].toUpperCase() + k.slice(1) : k;
}

/** Valor de característica: verdadeiro/falso viram Sim/Não; o resto como digitado. */
export function attributeValueLabel(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "true") return "Sim";
  if (v === "false") return "Não";
  return String(value ?? "");
}

export const isKnownAttribute = (key) => Object.prototype.hasOwnProperty.call(FEATURE_LABELS, key);

/** Item novo (vazio) de uma lista do formulário. */
export function emptyItem(group, code) {
  const first = code || OPTIONS[group][0].code;
  return { uid: nextUid(), code: first, key: "", otherKey: false, value: "", lat: "", lng: "", ...(WEIGHTED[group] ? { weight: "1" } : {}) };
}

export function emptyRadarForm() {
  return {
    propertyType: "RESIDENTIAL", offerType: "RENT", minPrice: "", maxPrice: "", cep: "", city: "", state: "", minAreaM2: "", maxAreaM2: "",
    preferences: [], flexible: [], exclusions: [],
  };
}

/** Obrigatórios do radar salvo: chaves planas mescladas com `required` (que prevalece), igual à API. */
export function requiredCriteriaOf(criteriaJson) {
  const source = criteriaJson || {};
  const nested = source.required && typeof source.required === "object" ? source.required : {};
  const out = {};
  for (const k of REQUIRED_FIELDS) {
    if (!blank(nested[k])) out[k] = nested[k];
    else if (!blank(source[k])) out[k] = source[k];
  }
  return out;
}

export const criteriaListOf = (criteriaJson, group) => (Array.isArray(criteriaJson?.[group]) ? criteriaJson[group] : []);

/** Radar salvo -> estado do formulário de edição. */
export function formFromCriteriaJson(criteriaJson) {
  const required = requiredCriteriaOf(criteriaJson);
  const base = emptyRadarForm();
  for (const k of REQUIRED_FIELDS) if (!blank(required[k])) base[k] = String(required[k]);
  for (const group of ["preferences", "flexible", "exclusions"]) {
    base[group] = criteriaListOf(criteriaJson, group).map((item) => {
      const code = String(item.code || "").toUpperCase();
      const key = text(item.key);
      return {
        ...emptyItem(group, code),
        key,
        otherKey: code === "ATTRIBUTE" && key !== "" && !isKnownAttribute(key),
        value: group === "exclusions" && code === "PROPERTY_TYPE" ? String(item.value || "").toUpperCase() : text(item.value),
        lat: text(item.lat),
        lng: text(item.lng),
        ...(WEIGHTED[group] ? { weight: item.weight === undefined ? "1" : String(item.weight) } : {}),
      };
    });
  }
  return base;
}

function numberOrError(raw, errors, field, { min = 0, message }) {
  const n = toNumber(raw);
  if (Number.isNaN(n) || n < min) {
    errors[field] = message;
    return null;
  }
  return n;
}

function buildItem(group, item, index, errors) {
  const id = (name) => `${group}.${index}.${name}`;
  const option = OPTIONS[group].find((o) => o.code === item.code);
  if (!option) {
    errors[id("code")] = "Escolha o critério.";
    return null;
  }
  const out = { code: item.code };
  if (item.code === "ATTRIBUTE") {
    if (blank(item.key)) errors[id("key")] = "Informe a característica.";
    out.key = String(item.key || "").trim();
  }
  if (blank(item.value)) {
    errors[id("value")] = "Informe o valor do critério.";
  } else if (option.numeric) {
    out.value = numberOrError(item.value, errors, id("value"), { message: "Use um número, zero ou maior." });
  } else {
    out.value = String(item.value).trim();
  }
  if (item.code === "MAX_DISTANCE_KM") {
    for (const k of ["lat", "lng"]) {
      const n = toNumber(item[k]);
      if (Number.isNaN(n)) errors[id(k)] = k === "lat" ? "Informe a latitude do ponto." : "Informe a longitude do ponto.";
      else out[k] = n;
    }
  }
  if (WEIGHTED[group]) {
    const w = toNumber(item.weight);
    if (Number.isNaN(w) || w <= 0) errors[id("weight")] = "O peso precisa ser maior que zero.";
    else out.weight = w;
  }
  return out;
}

/**
 * Estado do formulário -> { criteriaJson, errors }. `errors` usa o id lógico do campo (ex.: "preferences.0.weight");
 * vazio = pode enviar. Números passam por toNumber() (vírgula decimal e ponto de milhar do padrão brasileiro).
 */
export function buildRadarCriteria(form) {
  const errors = {};
  const criteriaJson = {
    propertyType: form.propertyType || null,
    offerType: form.offerType || null,
    city: blank(form.city) ? null : String(form.city).trim(),
    state: blank(form.state) ? null : String(form.state).trim().toUpperCase(),
  };
  for (const k of NUMERIC_REQUIRED) {
    criteriaJson[k] = blank(form[k]) ? null : numberOrError(form[k], errors, k, { message: "Use um número, zero ou maior." });
  }
  if (criteriaJson.minPrice != null && criteriaJson.maxPrice != null && criteriaJson.minPrice > criteriaJson.maxPrice) errors.maxPrice = "O preço máximo precisa ser maior que o mínimo.";
  if (criteriaJson.minAreaM2 != null && criteriaJson.maxAreaM2 != null && criteriaJson.minAreaM2 > criteriaJson.maxAreaM2) errors.maxAreaM2 = "A área máxima precisa ser maior que a mínima.";
  for (const group of ["preferences", "flexible", "exclusions"]) {
    criteriaJson[group] = (form[group] || []).map((item, i) => buildItem(group, item, i, errors)).filter(Boolean);
  }
  return { criteriaJson, errors };
}

const FIELD_DOM = { minPrice: ["rd-min-price", "Preço mínimo"], maxPrice: ["rd-max-price", "Preço máximo"], minAreaM2: ["rd-min-area", "Área mínima"], maxAreaM2: ["rd-max-area", "Área máxima"], person: ["rd-person", "Contato"] };
const GROUP_TITLE = { preferences: "Preferência", flexible: "Critério flexível", exclusions: "Exclusão" };
const PART_TITLE = { code: "critério", key: "característica", value: "valor", lat: "latitude", lng: "longitude", weight: "peso" };

/** Erros de buildRadarCriteria -> itens do ErrorSummary ({ id do campo na tela, rótulo, mensagem }). */
export function errorSummaryItems(errors) {
  return Object.entries(errors || {}).map(([field, message]) => {
    if (FIELD_DOM[field]) return { id: FIELD_DOM[field][0], label: FIELD_DOM[field][1], message };
    const [group, index, part] = field.split(".");
    const domPart = part === "key" ? "key-choice" : part;
    return { id: `rd-${group}-${index}-${domPart}`, label: `${GROUP_TITLE[group] || "Critério"} ${Number(index) + 1}, ${PART_TITLE[part] || part}`, message };
  });
}

const fmtNum = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 6 });

/** Frase em português do critério (para a tela do radar e para a explicação do match). */
export function describeCriterion(category, item) {
  if (!item) return "";
  const v = item.value;
  if (category === "PREFERENCE") {
    if (item.code === "NEIGHBORHOOD") return `Bairro ${v}`;
    if (item.code === "MIN_BEDROOMS") return `Pelo menos ${fmtNum(v)} quarto(s)`;
    if (item.code === "MIN_SUITES") return `Pelo menos ${fmtNum(v)} suíte(s)`;
    if (item.code === "MIN_PARKING") return `Pelo menos ${fmtNum(v)} vaga(s) de garagem`;
  }
  if (category === "FLEXIBLE") {
    if (item.code === "ATTRIBUTE") return `${attributeLabel(item.key)}: ${attributeValueLabel(v)}`;
    if (item.code === "MAX_DISTANCE_KM") return `Até ${fmtNum(v)} km do ponto (${fmtNum(item.lat)}, ${fmtNum(item.lng)})`;
  }
  if (category === "EXCLUSION") {
    if (item.code === "PROPERTY_TYPE") return `Não aceita imóvel do tipo ${PROPERTY_TYPE_LABELS[String(v).toUpperCase()] || v}`;
    if (item.code === "ATTRIBUTE") return `Não aceita ${attributeLabel(item.key)}: ${attributeValueLabel(v)}`;
  }
  return "Critério sem descrição";
}

/** Descrição dos obrigatórios avaliados pela API (chaves da explicação: propertyType, offerType, priceRange, city, state, areaRange, activeOffer). */
export const REQUIRED_LABELS = {
  propertyType: "Tipo de imóvel",
  offerType: "Finalidade",
  priceRange: "Faixa de preço",
  city: "Cidade",
  state: "UF",
  areaRange: "Faixa de área",
  activeOffer: "Oferta ativa",
};

export function describeRequired(key, required) {
  const r = required || {};
  switch (key) {
    case "propertyType": return PROPERTY_TYPE_LABELS[String(r.propertyType).toUpperCase()] || text(r.propertyType);
    case "offerType": return OFFER_TYPE_LABELS[String(r.offerType).toUpperCase()] || text(r.offerType);
    case "priceRange": return `${blank(r.minPrice) ? "sem mínimo" : formatBRL(r.minPrice)} a ${blank(r.maxPrice) ? "sem máximo" : formatBRL(r.maxPrice)}`;
    case "city": return text(r.city);
    case "state": return text(r.state);
    case "areaRange": return `${blank(r.minAreaM2) ? "sem mínimo" : `${fmtNum(r.minAreaM2)} m²`} a ${blank(r.maxAreaM2) ? "sem máximo" : `${fmtNum(r.maxAreaM2)} m²`}`;
    case "activeOffer": return "O imóvel precisa ter oferta ativa";
    default: return "";
  }
}

/** Linhas de resumo dos critérios do radar salvo, por categoria (cartão "Critérios de busca"). */
export function criteriaSummary(criteriaJson) {
  return {
    PREFERENCE: criteriaListOf(criteriaJson, "preferences").map((item) => ({ text: describeCriterion("PREFERENCE", { ...item, code: String(item.code).toUpperCase() }), weight: item.weight ?? 1 })),
    FLEXIBLE: criteriaListOf(criteriaJson, "flexible").map((item) => ({ text: describeCriterion("FLEXIBLE", { ...item, code: String(item.code).toUpperCase() }), weight: item.weight ?? 1 })),
    EXCLUSION: criteriaListOf(criteriaJson, "exclusions").map((item) => ({ text: describeCriterion("EXCLUSION", { ...item, code: String(item.code).toUpperCase() }) })),
  };
}
