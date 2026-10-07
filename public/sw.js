// Service worker mínimo do Nayara One (Marco 6 — PWA/offline, contrato §13).
//
// DECISÃO DE ENGENHARIA: escrito manualmente (sem next-pwa) — o app já tem rotas dinâmicas,
// autenticação via sessão/refresh e muitas chamadas de API cross-origin (NEXT_PUBLIC_API_URL);
// um service worker gerado por plugin com estratégia agressiva de cache arrisca servir HTML/JS
// desatualizado ou interceptar chamadas de API/refresh de sessão de um jeito difícil de prever
// sem testar exaustivamente. Este SW manual faz o mínimo necessário e seguro para a PWA ser
// instalável e para o app funcionar offline por meio da fila local (lib/offline/offlineQueue.js)
// — ele NÃO intercepta nenhuma chamada de API (fetch handler abaixo é só passthrough), então
// nunca mascara um erro de rede que o app precisa detectar para enfileirar o registro offline.
const CACHE_NAME = "nayara-one-shell-v1";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // Falha ao pré-cachear (ex.: offline na primeira instalação) nunca deve impedir o SW
        // de instalar — a PWA continua funcional, só sem o shell pré-cacheado.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Passthrough puro: nunca intercepta POST/PUT/PATCH/DELETE (mutações, inclusive as 3 telas de
// captura de obra) nem qualquer chamada para a API — só tenta servir do cache como fallback
// para GETs de assets estáticos do próprio app quando a rede falhar (shell básico navegável
// offline), nunca mascarando o erro de rede que o app usa para decidir enfileirar localmente.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // nunca intercepta a API (outro domínio/porta)

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
