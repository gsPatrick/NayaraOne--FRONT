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
