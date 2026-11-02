"use client";

// Hook do padrão de estados (M9-D850): useAsyncState(fetcher, opções) para leituras e useAsyncAction(action) para gravações.
// Devolve o estado escolhido pelo mapa de status HTTP; AsyncState (components/molecules/AsyncState) desenha cada estado.
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAsyncController, createActionController } from "./controller";
import { loadFreshSeconds } from "./freshness";
import { sharedCache, scopedCacheKey as scopeKey } from "./cache";
import { getSession } from "@/lib/auth/session";
import { accessStatus, deniedResult, requiresAccess } from "./access";

// Chave de cache presa a usuário e empresa (definição única em cache.js).
const scopedCacheKey = (key) => scopeKey(key, getSession());

/** Descarta o dado em cache de uma leitura (use depois de gravar: a revisita não pode mostrar o valor antigo). */
export function invalidateAsyncCache(key) {
  sharedCache.delete(scopedCacheKey(key));
}

/** Descarta todas as leituras em cache cujo `key` começa com o prefixo (ex.: "antifraude:" = todos os filtros). */
export function invalidateAsyncCachePrefix(prefix) {
  if (prefix === null || prefix === undefined) return 0;
  return sharedCache.deleteByPrefix(scopedCacheKey(prefix));
}

const noopSubscribe = () => () => {};

function useController(controller) {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}

/**
 * fetcher({ idempotencyKey }) -> Promise<dado>. `key` identifica a chamada no cache do último 200 (padrão: nenhum cache).
 * `deps` refaz a leitura quando mudam. Devolve { ...estado, reload, retry, idempotencyKey }.
 * `permission` (código ou lista, basta uma) decide o acesso ANTES da carga (C6): perfil sem ela recebe PERMISSION_DENIED já no primeiro render,
 * sem passar por LOADING e sem chamar a API; `permissions` injeta a lista do perfil (testes), senão vale a sessão do navegador.
 */
export function useAsyncState(fetcher, { key = null, deps = [], isEmpty, enabled = true, permission = null, permissions = null } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const freshRef = useRef(60);
  const scopedKey = scopedCacheKey(key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const controller = useMemo(() => createAsyncController({ fetcher: (ctx) => fetcherRef.current(ctx), cacheKey: scopedKey, isEmpty, getFreshSeconds: () => freshRef.current }), [scopedKey, ...deps]);
  const loaded = useController(controller);
  // No servidor a sessão não existe: "checking" mantém o estado de carga (igual ao primeiro render do navegador) até a hidratação.
  const access = useSyncExternalStore(noopSubscribe, () => accessStatus(permission, permissions), () => (permissions || !requiresAccess(permission) ? accessStatus(permission, permissions) : "checking"));
  const denied = access === "denied";
  const state = denied ? deniedResult(permission) : loaded;
  useEffect(() => {
    let alive = true;
    loadFreshSeconds().then((seconds) => { if (alive) freshRef.current = seconds; });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (enabled && access === "allowed") controller.load();
  }, [controller, enabled, access]);
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
