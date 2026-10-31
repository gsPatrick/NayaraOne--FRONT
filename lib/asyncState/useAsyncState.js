"use client";

// Hook do padrão de estados (M9-D850): useAsyncState(fetcher, opções) para leituras e useAsyncAction(action) para gravações.
// Devolve o estado escolhido pelo mapa de status HTTP; AsyncState (components/molecules/AsyncState) desenha cada estado.
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAsyncController, createActionController } from "./controller";
import { loadFreshSeconds } from "./freshness";
import { sharedCache } from "./cache";
import { getSession } from "@/lib/auth/session";

/** Chave de cache presa a usuário e empresa: o dado de uma sessão nunca aparece em outra. */
export function scopedCacheKey(key) {
  if (key === null || key === undefined) return null;
  const session = getSession();
  return `${(session && session.user && session.user.id) || "anon"}|${(session && session.companyId) || "-"}|${key}`;
}

/** Descarta o dado em cache de uma leitura (use depois de gravar: a revisita não pode mostrar o valor antigo). */
export function invalidateAsyncCache(key) {
  sharedCache.delete(scopedCacheKey(key));
}

function useController(controller) {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}

/**
 * fetcher({ idempotencyKey }) -> Promise<dado>. `key` identifica a chamada no cache do último 200 (padrão: nenhum cache).
 * `deps` refaz a leitura quando mudam. Devolve { ...estado, reload, retry, idempotencyKey }.
 */
export function useAsyncState(fetcher, { key = null, deps = [], isEmpty, enabled = true } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const freshRef = useRef(60);
  const scopedKey = scopedCacheKey(key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const controller = useMemo(() => createAsyncController({ fetcher: (ctx) => fetcherRef.current(ctx), cacheKey: scopedKey, isEmpty, getFreshSeconds: () => freshRef.current }), [scopedKey, ...deps]);
  const state = useController(controller);
  useEffect(() => {
    let alive = true;
    loadFreshSeconds().then((seconds) => { if (alive) freshRef.current = seconds; });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (enabled) controller.load();
  }, [controller, enabled]);
  return { ...state, reload: controller.load, retry: controller.retry, idempotencyKey: controller.getIdempotencyKey() };
}

/** action({ idempotencyKey }, ...args) -> Promise. Devolve { ...estado, run, retry, reset }. */
export function useAsyncAction(action, { successMessage } = {}) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const controller = useMemo(() => createActionController({ action: (ctx, ...args) => actionRef.current(ctx, ...args), successMessage }), [successMessage]);
  const state = useController(controller);
  return { ...state, run: controller.run, retry: controller.retry, reset: controller.reset };
}
