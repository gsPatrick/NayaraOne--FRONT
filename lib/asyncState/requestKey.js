// Idempotency-Key por pedido (Fechamento M5 — cobrança da locação; padrão M9-D843/M9-D850): o mesmo pedido
// (rota + corpo) reenviado depois de uma falha usa a MESMA chave — a API devolve a resposta original sem repetir o
// efeito (ex.: um segundo reembolso). Pedido diferente usa chave nova; depois do sucesso a chave é descartada.
import { newIdempotencyKey } from "./idempotency";

export function createRequestKeys(newKey = newIdempotencyKey) {
  const pending = new Map();
  const signatureOf = (path, body) => `${path}|${JSON.stringify(body === undefined ? null : body)}`;
  return {
    /** Chave do pedido: a mesma enquanto ele não der certo. */
    keyFor(path, body) {
      const sig = signatureOf(path, body);
      if (!pending.has(sig)) pending.set(sig, newKey());
      return pending.get(sig);
    },
    /** Pedido concluído com sucesso: a próxima vez é outro pedido, com chave nova. */
    done(path, body) {
      pending.delete(signatureOf(path, body));
    },
    size: () => pending.size,
  };
}

const shared = createRequestKeys();

/** POST com Idempotency-Key estável por pedido. `fetcher` = apiFetch (injeção só para teste). */
export async function postIdempotent(fetcher, path, body, keys = shared) {
  const idempotencyKey = keys.keyFor(path, body);
  const result = await fetcher(path, { method: "POST", body, idempotencyKey });
  keys.done(path, body);
  return result;
}
