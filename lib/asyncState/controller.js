// Máquina de estados de uma chamada (M9-D850): carrega, escolhe o estado pelo mapa de status, guarda o último 200 e reenvia
// com a mesma Idempotency-Key. Sem React: o hook useAsyncState só assina este objeto.
import { UI_STATE, classifyFailure, classifySuccess, defaultIsEmpty } from "./states";
import { sharedCache, isStale, DEFAULT_FRESH_SECONDS } from "./cache";
import { newIdempotencyKey } from "./idempotency";

const browserOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

export function createAsyncController({
  fetcher,
  cacheKey = null,
  cache = sharedCache,
  getFreshSeconds = () => DEFAULT_FRESH_SECONDS,
  isOnline = browserOnline,
  now = Date.now,
  isEmpty = defaultIsEmpty,
  newKey = newIdempotencyKey,
} = {}) {
  let listeners = [];
  let idempotencyKey = newKey();
  let attempt = 0;
  let state = { status: UI_STATE.LOADING, data: null, error: null, traceId: null, fetchedAt: null, stale: false, fromCache: false, fresh: false, attempts: 0 };

  const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  async function run() {
    attempt += 1;
    const current = attempt;
    const cached = cache.get(cacheKey);
    emit({ status: UI_STATE.LOADING, error: null, fresh: false, attempts: current, data: cached ? cached.data : state.data });
    if (!isOnline()) return fail(new Error("offline"), cached, true);
    try {
      const data = await fetcher({ idempotencyKey });
      if (current !== attempt) return state; // uma chamada mais nova assumiu
      const fetchedAt = now();
      cache.set(cacheKey, data, fetchedAt);
      idempotencyKey = newKey(); // sucesso encerra a ação: a próxima usa outra chave
      emit({ status: classifySuccess(data, isEmpty), data, error: null, traceId: null, fetchedAt, stale: false, fromCache: false, fresh: true });
      return state;
    } catch (error) {
      if (current !== attempt) return state;
      return fail(error, cached, false);
    }
  }

  function fail(error, cached, forcedOffline) {
    const status = forcedOffline ? UI_STATE.OFFLINE : classifyFailure(error, { online: isOnline() });
    const keepCache = status === UI_STATE.OFFLINE && cached;
    // Dado do último 200 só acompanha o OFFLINE; os demais erros nunca mostram dado antigo como se fosse atual (403 jamais vira lista).
    emit({
      status,
      error: forcedOffline ? { code: "GOV_UI_NETWORK_OFFLINE", status: 0 } : error,
      traceId: (error && error.traceId) || null,
      data: keepCache ? cached.data : null,
      fetchedAt: keepCache ? cached.fetchedAt : null,
      stale: keepCache ? isStale(cached, now(), getFreshSeconds()) : false,
      fromCache: Boolean(keepCache),
      fresh: false,
    });
    return state;
  }

  return {
    load: run,
    // Reenvio: mesma chave (a chave só troca depois do sucesso, ver `run`).
    retry: run,
    getState: () => state,
    getIdempotencyKey: () => idempotencyKey,
    subscribe(listener) {
      listeners.push(listener);
      return () => { listeners = listeners.filter((item) => item !== listener); };
    },
    setFetcher(next) { fetcher = next; },
  };
}

/**
 * Ação (gravar, aprovar, enviar): estado LOADING enquanto roda, SUCCESS com a mensagem do que foi feito, ou a falha classificada.
 * A Idempotency-Key é a mesma em toda nova tentativa depois de falha e só muda depois do sucesso; falha no meio volta a RETRY/OFFLINE, nunca a SUCCESS.
 */
export function createActionController({ action, isOnline = browserOnline, newKey = newIdempotencyKey, successMessage = "Concluído." } = {}) {
  let listeners = [];
  let key = newKey();
  let lastArgs = [];
  let state = { status: null, error: null, traceId: null, message: null, result: null, attempts: 0 };
  const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()); };

  async function exec() {
    emit({ status: UI_STATE.LOADING, error: null, message: null, attempts: state.attempts + 1 });
    if (!isOnline()) {
      emit({ status: UI_STATE.OFFLINE, error: { code: "GOV_UI_NETWORK_OFFLINE", status: 0 } });
      return state;
    }
    try {
      const result = await action({ idempotencyKey: key }, ...lastArgs);
      key = newKey();
      emit({ status: UI_STATE.SUCCESS, result, error: null, traceId: null, message: typeof successMessage === "function" ? successMessage(result) : successMessage });
    } catch (error) {
      emit({ status: classifyFailure(error, { online: isOnline() }), error, traceId: (error && error.traceId) || null });
    }
    return state;
  }

  return {
    run(...args) { lastArgs = args; return exec(); },
    retry: exec,
    reset() { key = newKey(); emit({ status: null, error: null, traceId: null, message: null, result: null }); },
    getState: () => state,
    getIdempotencyKey: () => key,
    subscribe(listener) { listeners.push(listener); return () => { listeners = listeners.filter((item) => item !== listener); }; },
  };
}
