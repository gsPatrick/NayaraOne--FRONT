// Regras do formulário de recebimento (Estoque > Recebimentos).
// Resposta de 16/11/2026, item 10 parte A: M7:82, "Entrada confirmada atualiza saldo e custo".
// Toda linha exige custo unitário >= 0 (zero vale), igual à API (422
// INVENTORY_RECEIPT_UNIT_COST_REQUIRED). O custo vai sempre no envio, nunca omitido.
import { toNumber } from "@/lib/format";

function filled(value) {
  return value != null && String(value).trim() !== "";
}

function nonNegativeNumber(value) {
  if (!filled(value)) return false;
  const n = toNumber(value);
  return !Number.isNaN(n) && Number.isFinite(n) && n >= 0;
}

export function receiptLineError(line) {
  if (!line?.inventoryItemId) return "Selecione o item.";
  if (!filled(line.quantity) || Number.isNaN(toNumber(line.quantity)) || toNumber(line.quantity) <= 0) return "Informe a quantidade (maior que zero).";
  if (!filled(line.unitCost)) return "Informe o custo unitário (pode ser zero).";
  if (!nonNegativeNumber(line.unitCost)) return "O custo unitário precisa ser um número maior ou igual a zero.";
  return "";
}

export function isReceiptFormValid(form) {
  return Boolean(form?.destinationLocationId) && Array.isArray(form?.lines) && form.lines.length > 0
    && form.lines.every((l) => receiptLineError(l) === "");
}

export function toReceiptItems(lines) {
  return lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: toNumber(l.quantity), unitCost: toNumber(l.unitCost) }));
}

export const UNIT_COST_PLACEHOLDER = "Custo unit. *";
