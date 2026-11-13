// Conferência dos campos da aba "CRM" antes de gravar (a API confere de novo e é a fonte da regra: src/features/crm/crm.settings.js).
// Testado em test/m3ca.configuracoesCrm.test.mjs.
import { toNumber } from "@/lib/format";
import { integerFieldError, integerInRange, integerRangeError } from "./settingsFormat";

const REASON_ITEM = /^([A-Z][A-Z0-9_]{1,39})=([^,=]{1,60})$/;
const PERMISSION = /^[a-z][a-z0-9_]*(:[a-z0-9_]+){1,3}$/;

/** "A=Rótulo,B=Outro" -> [{ code, label }]; formato inválido ou código repetido -> null (mesma regra da API). */
export function parseReasonList(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const items = [];
  for (const part of raw.split(",")) {
    const match = REASON_ITEM.exec(part.trim());
    if (!match || !match[2].trim()) return null;
    items.push({ code: match[1], label: match[2].trim() });
  }
  if (items.length > 30 || new Set(items.map((i) => i.code)).size !== items.length) return null;
  return items;
}

/** Erro do campo ao sair dele (vazio não acusa: vale o padrão). */
export function crmFieldError(field, raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (field.type === "integer") return integerFieldError(field, raw);
  if (field.key.startsWith("crm.motivos.")) return parseReasonList(raw) ? null : "Use CODIGO=Rótulo separados por vírgula, sem repetir código (ex.: PRICE_TOO_HIGH=Preço alto).";
  if (field.key === "crm.gerencia.permissao") return PERMISSION.test(String(raw)) ? null : "Informe um código de permissão, como crm:dashboard:read.";
  return null;
}

/** Valor enviado à API: inteiro conferido contra a faixa; texto sem espaços nas pontas. */
export function crmApiValue(field, raw) {
  if (field.type === "integer") {
    const value = toNumber(raw);
    if (!integerInRange(value, field)) throw new Error(integerRangeError(field));
    return value;
  }
  return String(raw).trim();
}
