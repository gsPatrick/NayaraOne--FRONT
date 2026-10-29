// Cache do último 200 de cada chamada (M9-D850 §3.1, estado OFFLINE): guarda o dado e o instante; é "desatualizado" quando
// tem mais de `freshSeconds` (parâmetro governanca.ui.cache_fresco_s, padrão 60 s).

export const DEFAULT_FRESH_SECONDS = 60;

export function createResultCache() {
  const entries = new Map();
  return {
    get: (key) => (key === null || key === undefined ? null : entries.get(key) || null),
    set(key, data, fetchedAt) {
      if (key !== null && key !== undefined) entries.set(key, { data, fetchedAt });
    },
    clear: () => entries.clear(),
    size: () => entries.size,
  };
}

/** Desatualizado = mais velho que `freshSeconds`. */
export function isStale(entry, now, freshSeconds = DEFAULT_FRESH_SECONDS) {
  return Boolean(entry) && now - entry.fetchedAt > freshSeconds * 1000;
}

export const sharedCache = createResultCache();
