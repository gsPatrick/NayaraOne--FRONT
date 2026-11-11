"use client";

// Usuários ativos da empresa (GET /users?status=ACTIVE) para escolher o responsável jurídico de modelo/cláusula.
// Falha na leitura não derruba a tela: o campo fica com "quem cria" (padrão da API) e mostra o motivo.
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { legalErrorMessage } from "@/lib/legal/legalErrors";

export function useActiveUsers(enabled = true) {
  const [state, setState] = useState({ users: [], error: "", loaded: false });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    apiFetch("/users?status=ACTIVE")
      .then((list) => alive && setState({ users: Array.isArray(list) ? list : [], error: "", loaded: true }))
      .catch((err) => alive && setState({ users: [], error: legalErrorMessage(err, "Não foi possível carregar os usuários."), loaded: true }));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}

export function userNameOf(users, id) {
  if (!id) return "";
  return users.find((u) => u.id === id)?.name || "Usuário da empresa";
}

/**
 * Lista de usuários para escolher responsável: quem não tem a permissão de ler usuários recebe lista vazia (a API
 * recusa) — o próprio usuário logado sempre entra, para poder assumir o prazo/processo.
 */
export function withCurrentUser(users) {
  const list = Array.isArray(users) ? users : [];
  const me = getCurrentUser();
  if (!me || !me.id || list.some((u) => u.id === me.id)) return list;
  return [{ id: me.id, name: `${me.name || me.email || "Eu"} (você)` }, ...list];
}
