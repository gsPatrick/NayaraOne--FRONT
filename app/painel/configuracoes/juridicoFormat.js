// Conversão de valores da aba "Locação e Jurídico": do que a API devolve para o formulário e do formulário para a API, com a mesma faixa que a
// API confere. Número aparece como texto no DecimalInput; booleano fica booleano; o fuso (lista fechada) fica como o nome do fuso.
import { toNumber } from "@/lib/format";
import { integerFieldError, integerInRange, integerRangeError, loadedValue } from "./settingsFormat";

/** Valor do formulário a partir do valor gravado (ausente = padrão do campo). */
export function toFormValue(field, raw) {
  const value = loadedValue(field, raw);
  if (field.type === "boolean") return value;
  if (field.type === "select") return typeof value === "string" && value.trim() ? value.trim() : field.defaultValue;
  return String(value ?? "");
}

/** Opções do campo de lista: um valor gravado fora da lista (outro fuso válido) continua aparecendo, para não ser trocado sem querer. */
export function selectOptions(field, current) {
  const options = field.options || [];
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: `Outro fuso já gravado (${current.replace(/_/g, " ").split("/").pop()})` }];
}

/** Erro inline do campo (só inteiro tem faixa; vazio não acusa). */
export function juridicoFieldError(field, raw) {
  if (field.type === "integer") return integerFieldError(field, raw);
  if (field.type === "select") return raw && String(raw).trim() ? null : "Escolha uma opção.";
  return null;
}

/** Valor que vai para a API, já conferido (lança com a frase da faixa quando não passa). */
export function toApiValue(field, raw) {
  if (field.type === "boolean") return Boolean(raw);
  if (field.type === "select") {
    const value = String(raw || "").trim();
    if (!value) throw new Error(`Escolha "${field.label}".`);
    return value;
  }
  const value = toNumber(raw);
  if (!integerInRange(value, field)) throw new Error(integerRangeError(field));
  return value;
}
