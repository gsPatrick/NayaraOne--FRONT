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
