"use client";

// ACHADO REAL (auditoria Claude Browser, 4 rodadas distintas, 13/10/2026): a sessão expirava em
// ~15 min sem nenhum aviso, derrubando o usuário no meio de um formulário em andamento. O
// refresh token já existia (TTL de 7 dias) mas só era usado de forma reativa, depois de um 401.
//
// Este hook agenda uma renovação SILENCIOSA do access token um pouco antes dele expirar,
// enquanto a aba estiver aberta — decodifica o `exp` do próprio JWT (sem precisar de outra
// chamada de rede só pra saber a validade) e reagenda a cada renovação bem-sucedida. Se a
// renovação falhar (refresh token também expirado/revogado), não faz nada aqui — o fluxo
// reativo já existente em lib/api/client.js cuida de deslogar na próxima chamada de API.

import { useEffect } from "react";
import { getSession } from "@/lib/auth/session";
import { refreshSessionSilently } from "@/lib/api/client";

// Renova 2 minutos antes de expirar — margem suficiente pra cobrir o tempo de uma chamada de
// rede lenta sem deixar o token expirar no meio do caminho.
const RENEW_MARGIN_MS = 2 * 60 * 1000;
// Nunca agenda menos que isso nem mais que isso — evita reagendamento em loop apertado se o
// relógio do token já estiver vencido, e evita um timer absurdamente longo se o TTL for grande.
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 60 * 60 * 1000;

function decodeExpiry(accessToken) {
  try {
    const payload = accessToken.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function useSessionKeeper() {
  useEffect(() => {
    let timerId = null;
    let cancelled = false;

    function schedule() {
      const session = getSession();
      if (!session?.accessToken || !session?.refreshToken) return;
      const expiresAt = decodeExpiry(session.accessToken);
      if (!expiresAt) return;
      const delay = Math.min(Math.max(expiresAt - Date.now() - RENEW_MARGIN_MS, MIN_DELAY_MS), MAX_DELAY_MS);
      timerId = setTimeout(async () => {
        if (cancelled) return;
        const ok = await refreshSessionSilently().catch(() => false);
        if (cancelled) return;
        if (ok) schedule();
        // se falhar, não reagenda — o fluxo reativo existente assume na próxima chamada de API
      }, delay);
    }

    schedule();
    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, []);
}
