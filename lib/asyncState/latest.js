// Guarda de sequência para fetchers que aplicam o dado em estado local (M9-D850): só a chamada MAIS RECENTE pode aplicar.
// Com duas recargas fora de ordem, a resposta velha chega depois e não sobrescreve a nova lista.
// Uso: const latest = useRef(createLatestGuard()).current; no fetcher: const isLatest = latest.begin(); ...; if (isLatest()) setX(v).
export function createLatestGuard() {
  let seq = 0;
  return {
    begin() {
      const mine = ++seq;
      return () => mine === seq;
    },
  };
}
