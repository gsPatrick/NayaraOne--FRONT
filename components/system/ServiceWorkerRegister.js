"use client";

import { useEffect } from "react";

// Registra o service worker mínimo (public/sw.js) uma vez, no mount do app inteiro — mesmo
// padrão de "registro silencioso" usado por qualquer PWA: nunca bloqueia o render, nunca lança
// erro visível pro usuário se o navegador não suportar (Safari antigo, navegação anônima com
// restrição, etc.), só tenta e desiste em silêncio.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem suporte/ambiente bloqueado — app continua funcionando normalmente online, só sem
      // os benefícios de PWA (instalável/shell offline).
    });
  }, []);

  return null;
}
