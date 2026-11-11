// Frase do "valor em vigor" de um parâmetro do antifraude na aba Financeiro (DEC-007, DI-DEC007-2 na API): o que a regra está usando agora, que pode ser
// o padrão (nada gravado), o valor gravado ou o padrão no lugar de um valor gravado inválido (falha segura). Sem a linha da API, não diz nada.
const BR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatParameterValue(field, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "");
  return /\(R\$\)/.test(field?.label || "") ? BRL.format(value) : BR.format(value);
}

/** Mapa chave -> linha da API (aceita a lista do envelope ou nada). */
export function effectiveByKey(rows) {
  return Object.fromEntries((Array.isArray(rows) ? rows : []).filter((r) => r && r.key).map((r) => [r.key, r]));
}

export function effectiveText(field, row) {
  if (!row || row.effectiveValue === undefined) return "";
  const valor = formatParameterValue(field, row.effectiveValue);
  if (row.source === "STORED") return `Em vigor: ${valor} (valor gravado).`;
  if (row.source === "INVALID_STORED") return `Em vigor: ${valor}, o padrão da decisão DEC-007: o valor gravado está fora da faixa e não é usado. Grave um valor válido para trocar.`;
  return `Em vigor: ${valor} (padrão da decisão DEC-007).`;
}
