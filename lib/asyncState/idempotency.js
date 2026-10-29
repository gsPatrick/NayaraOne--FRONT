// Chave de idempotência do reenvio (M9-D850: "Retry reenvia com a mesma Idempotency-Key"). Uma chave por ação; só muda depois do sucesso.

export function newIdempotencyKey() {
  const rand = typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return `ui-${rand}`;
}
