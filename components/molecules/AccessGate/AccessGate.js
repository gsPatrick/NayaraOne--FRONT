"use client";

import { useSyncExternalStore } from "react";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { accessStatus, deniedResult } from "@/lib/asyncState/access";

export { accessStatus, deniedResult };

// M9-D685/D686 (C6) — a decisão de permissão vem do perfil já salvo na sessão e acontece ANTES da carga dos dados: sem a permissão, o aviso aparece de imediato
// e o conteúdo (que busca os dados ao montar) nem chega a montar. A API continua sendo a fonte de verdade; isto só evita o spinner que não leva a nada.
const noop = () => () => {};

// `permissions` (opcional) injeta a lista de permissões do perfil; sem ela, lê a sessão do navegador. No servidor o estado é "checking" (a sessão só existe no navegador).
export default function AccessGate({ permission, permissions = null, children }) {
  const status = useSyncExternalStore(noop, () => accessStatus(permission, permissions), () => (permissions ? accessStatus(permission, permissions) : "checking"));
  if (status === "checking") return null;
  if (status === "denied") return <div data-access-gate="denied"><AsyncState result={deniedResult(permission)} /></div>;
  return children;
}
