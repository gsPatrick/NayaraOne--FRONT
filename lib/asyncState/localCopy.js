"use client";

// Cópia local editável de um dado lido pelo useAsyncState (M9-D850): a tela edita a lista no lugar (criar, excluir, aprovar),
// mas a lista é DERIVADA do dado lido durante o render, sem useEffect([data]). Assim, no 1º render em CONTENT o dado já está lá
// (nada de "Nenhuma empresa cadastrada" por um frame) e uma nova leitura (recarga) substitui a edição local.
import { useCallback, useRef, useState } from "react";

/** Valor atual: a edição local só vale enquanto o dado lido for o mesmo em que ela foi feita. */
export function resolveLocalCopy(local, source, fallback) {
  if (local && local.has && local.source === source) return local.value;
  return source === null || source === undefined ? fallback : source;
}

/** Aplica `next` (valor ou função do valor atual) e devolve o novo registro local. */
export function applyLocalCopy(local, source, fallback, next) {
  const current = resolveLocalCopy(local, source, fallback);
  return { has: true, source, value: typeof next === "function" ? next(current) : next };
}

/** useLocalCopy(dadoLido, valorInicial) -> [valor, setValor], com setValor aceitando valor ou função como o useState. */
export function useLocalCopy(source, fallback) {
  const [local, setLocal] = useState({ has: false, source: null, value: null });
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const set = useCallback((next) => setLocal((prev) => applyLocalCopy(prev, sourceRef.current, fallbackRef.current, next)), []);
  return [resolveLocalCopy(local, source, fallback), set];
}
