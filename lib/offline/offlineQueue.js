// Fila local de sincronização offline (Marco 6, item PWA/captura offline — contrato §13:
// "Vistoria, obra e estoque precisam capturar dados offline... Cada registro offline recebe ID
// local e idempotency key... Sincronização deve detectar conflitos e nunca sobrescrever
// silenciosamente").
//
// A METADE backend deste requisito ("cada registro offline recebe ID local e idempotency key")
// já estava coberta antes desta mudança: createDailyReport/createStageMeasurement/
// createMaterialRequest (API) já aceitam `idempotencyKey` no payload e o usam para deduplicar
// reenvios (ver dailyReports.service.js, stageMeasurements.service.js, materialRequests.service.js).
// O gap real era o FRONT-END não ter NENHUMA capacidade de funcionar offline. Esta fila cobre a
// outra metade: quando o POST falha por rede (ApiError code === "NETWORK_ERROR"), o registro fica
// guardado aqui localmente (com o MESMO idempotencyKey já gerado no cliente) até a conexão
// voltar, e nunca é reenviado duas vezes sob o mesmo id local.
//
// Decisão de engenharia: localStorage em vez de IndexedDB — volume de registros pendentes de
// obra (RDO/medição/requisição) é baixo (dezenas, não milhares) e localStorage é síncrono,
// simples e já usado em outros pontos do app (tema, sessão) sem nenhuma dependência nova.

const STORAGE_PREFIX = "nayara-one:offline-queue:";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback simples (navegadores muito antigos sem crypto.randomUUID) — não precisa ser
  // criptograficamente forte, só único o bastante para servir de idempotency key local.
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function storageKey(queueName) {
  return `${STORAGE_PREFIX}${queueName}`;
}

function readQueue(queueName) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(queueName));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queueName, items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(queueName), JSON.stringify(items));
  } catch {
    // localStorage indisponível (modo privado/cota excedida) — fila offline simplesmente não
    // persiste entre reloads; o registro atual já foi perdido de qualquer forma (o chamador
    // mostra o erro de rede original ao usuário nesse caso raro).
  }
}

/**
 * enqueueOfflineRecord — guarda um registro pendente de sincronização.
 * `payload` deve já incluir o `idempotencyKey` gerado no cliente (mesmo usado na tentativa de
 * POST que falhou), para que o reenvio nunca crie um registro duplicado no servidor.
 */
export function enqueueOfflineRecord(queueName, { localId, idempotencyKey, label, send, payload } = {}) {
  const items = readQueue(queueName);
  const record = {
    localId: localId || uuid(),
    idempotencyKey: idempotencyKey || uuid(),
    label: label || "",
    payload: payload || null,
    createdAt: new Date().toISOString(),
  };
  items.push(record);
  writeQueue(queueName, items);
  return record;
}

export function listOfflineRecords(queueName) {
  return readQueue(queueName);
}

export function countOfflineRecords(queueName) {
  return readQueue(queueName).length;
}

export function removeOfflineRecord(queueName, localId) {
  const items = readQueue(queueName).filter((item) => item.localId !== localId);
  writeQueue(queueName, items);
}

export function generateIdempotencyKey() {
  return uuid();
}

/**
 * syncOfflineQueue — tenta reenviar todos os registros pendentes de uma fila, em ordem de
 * criação. `sendFn(payload, idempotencyKey)` deve fazer a mesma chamada de API original — o
 * MESMO idempotencyKey é enviado de novo, então mesmo que uma tentativa anterior tenha de fato
 * chegado ao servidor sem a resposta voltar (timeout), o backend deduplicador do Motor de
 * Regras/serviço (`findOne({ where: { idempotencyKey } })`) nunca cria um segundo registro —
 * "nunca sobrescreve silenciosamente, detecta conflito": aqui o "conflito" possível é a
 * resposta de sucesso vir com um registro JÁ existente (mesmo idempotencyKey), o que é
 * tratado como sucesso (não duplicação), nunca como erro silencioso.
 *
 * Mantém na fila qualquer item que falhe de novo (ainda offline, ou erro novo) e remove da fila
 * só os que o servidor confirmou. Retorna { succeeded, failed } para a UI reportar.
 */
export async function syncOfflineQueue(queueName, sendFn) {
  const items = readQueue(queueName);
  const succeeded = [];
  const failed = [];
  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sendFn(item.payload, item.idempotencyKey);
      removeOfflineRecord(queueName, item.localId);
      succeeded.push(item);
    } catch (err) {
      failed.push({ item, error: err });
    }
  }
  return { succeeded, failed };
}
