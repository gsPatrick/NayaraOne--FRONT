import { toNumber } from "@/lib/format";

// Ajuda comum das abas de configuração: converte o valor do formulário para o tipo que a API exige e indexa a lista por chave.
export function toSettingValue(field, rawValue, numericFields) {
  if (!numericFields.has(field)) return rawValue;
  if (rawValue === "" || rawValue === null || rawValue === undefined) return null;
  const numeric = Number(rawValue);
  return Number.isNaN(numeric) ? null : numeric;
}

/** A API devolve lista ou objeto: junta qualquer quantidade de respostas num mapa chave -> valor. */
export function settingsByKey(...responses) {
  const byKey = {};
  responses.forEach((data) => {
    const list = Array.isArray(data) ? data : Object.values(data || {});
    list.forEach((item) => {
      if (item && item.key) byKey[item.key] = item.value;
    });
  });
  return byKey;
}

const hasLimit = (limit) => typeof limit === "number" && Number.isFinite(limit);

/** Texto de faixa de um campo inteiro: só cita o limite que existe ("A partir de 1.", "Até 23.", "Entre 1 e 365."). */
export function integerRangeText(field) {
  const hasMin = hasLimit(field?.min);
  const hasMax = hasLimit(field?.max);
  if (hasMin && hasMax) return `Entre ${field.min} e ${field.max}.`;
  if (hasMin) return `A partir de ${field.min}.`;
  if (hasMax) return `Até ${field.max}.`;
  return "Número inteiro.";
}

/** Mensagem de recusa no Salvar usando a mesma regra do texto de faixa. */
export function integerRangeError(field) {
  const hasMin = hasLimit(field?.min);
  const hasMax = hasLimit(field?.max);
  if (hasMin && hasMax) return `"${field.label}" deve ser um número inteiro entre ${field.min} e ${field.max}.`;
  if (hasMin) return `"${field.label}" deve ser um número inteiro a partir de ${field.min}.`;
  if (hasMax) return `"${field.label}" deve ser um número inteiro até ${field.max}.`;
  return `"${field.label}" deve ser um número inteiro.`;
}

/** Valida o inteiro contra os limites que existirem (limite ausente não bloqueia nem compara com undefined). */
export function integerInRange(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  if (hasLimit(field?.min) && value < field.min) return false;
  if (hasLimit(field?.max) && value > field.max) return false;
  return true;
}

/**
 * Erro inline de um campo inteiro (M9-D850, F16): aparece ao sair do campo, com a faixa. Campo vazio ou intocado não acusa nada; texto digitado fora da faixa
 * ou não inteiro acusa "Entre 1 e 3600." (a mesma frase da ajuda, sem repetir o rótulo).
 */
export function integerFieldError(field, raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  return integerInRange(toNumber(raw), field) ? null : `Valor inválido. ${integerRangeText(field)}`;
}

/** Número com casas decimais (multiplicador, valor em reais): mesmo texto de faixa, com vírgula como separador ("Entre 1 e 100."). */
const decimalText = (n) => String(n).replace(".", ",");
export function decimalRangeText(field) {
  const hasMin = hasLimit(field?.min);
  const hasMax = hasLimit(field?.max);
  if (hasMin && hasMax) return `Entre ${decimalText(field.min)} e ${decimalText(field.max)}.`;
  if (hasMin) return `A partir de ${decimalText(field.min)}.`;
  if (hasMax) return `Até ${decimalText(field.max)}.`;
  return "Número.";
}

export function decimalInRange(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (hasLimit(field?.min) && value < field.min) return false;
  if (hasLimit(field?.max) && value > field.max) return false;
  return true;
}

/** Erro inline do campo decimal ao sair dele (vazio não acusa; "2,5" e "2.5" valem o mesmo). */
export function decimalFieldError(field, raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  return decimalInRange(toNumber(raw), field) ? null : `Valor inválido. ${decimalRangeText(field)}`;
}

/** Campos cujo valor mudou em relação ao que veio da API (o Salvar só envia estes; sem mudança, nenhum PUT). */
export function changedFields(fields, values, original) {
  if (!original) return [];
  return fields.filter((field) => String(values[field.key]) !== String(original[field.key]));
}

/** Campos inteiros alterados cujo valor está fora da faixa: enquanto houver algum, o Salvar fica desabilitado. */
export function invalidChangedFields(fields, values, original) {
  return changedFields(fields, values, original).filter((field) => field.type === "integer" && integerFieldError(field, values[field.key]));
}

/**
 * Valor que a tela mostra para um campo vindo da API: valor ausente ou nulo mantém o padrão do campo (nunca vira desmarcado/vazio por engano) e o booleano
 * aceita as grafias "true"/"false" (M9-D870, F15).
 */
export function loadedValue(field, raw) {
  if (raw === null || raw === undefined) return field.defaultValue;
  if (field.type === "boolean") {
    if (typeof raw === "string") return raw.trim().toLowerCase() === "true" ? true : raw.trim().toLowerCase() === "false" ? false : field.defaultValue;
    return Boolean(raw);
  }
  return raw;
}
