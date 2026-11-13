// Payload da oferta do imóvel (Marco 3, verificação de 11/11/2026). Função pura, testável:
// - preço pelo DecimalInput convertido com toNumber (nunca Number cru: "150.000,50" vira 150000.5);
// - "condições" do livro §6 (texto livre);
// - preço mínimo confidencial SÓ vai no corpo para quem tem properties:internal (M3-07): sem a permissão a chave nem existe,
//   então a edição feita por quem não vê o valor nunca o apaga (a API recusa a chave com 403).
import { toNumber, dateOnlyInputToIso } from "@/lib/format";

export const CONFIDENTIAL_PERMISSION = "properties:internal";

export function buildOfferPayload(offer, { canSeeConfidential = false } = {}) {
  const min = toNumber(offer.confidentialMinPrice);
  const payload = {
    offerType: offer.offerType,
    askingPrice: toNumber(offer.askingPrice),
    acceptsFinancing: Boolean(offer.acceptsFinancing),
    acceptsTrade: Boolean(offer.acceptsTrade),
    conditions: offer.conditions && String(offer.conditions).trim() ? String(offer.conditions).trim() : null,
    status: offer.status,
    startsAt: dateOnlyInputToIso(offer.validFrom) || null,
    endsAt: dateOnlyInputToIso(offer.validUntil) || null,
  };
  if (canSeeConfidential) payload.confidentialMinPrice = Number.isNaN(min) ? null : min;
  return payload;
}

/** Preço válido para a oferta: número de verdade e maior que zero (NaN > 0 é false, mas aqui fica explícito). */
export function isValidAskingPrice(value) {
  const n = toNumber(value);
  return !Number.isNaN(n) && n > 0;
}
