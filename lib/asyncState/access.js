// Decisão de permissão do padrão de estados (M9-D850, reabertura C6): vem do perfil já salvo na sessão e acontece ANTES da carga dos dados.
// Lógica pura: serve ao hook useAsyncState, ao AccessGate e aos testes. A API continua sendo a fonte de verdade da autorização.
import { UI_STATE } from "./states";
import { hasAnyPermission } from "@/lib/rbac/permissions";

const required = (permission) => (Array.isArray(permission) ? permission.filter(Boolean) : permission ? [permission] : []);

/** true quando há alguma permissão a conferir. */
export const requiresAccess = (permission) => required(permission).length > 0;

/** "allowed" | "denied". `permission` é um código ou uma lista (basta uma); `permissions` injeta a lista do perfil, senão lê a sessão do navegador. */
export function accessStatus(permission, permissions = null) {
  const codes = required(permission);
  if (!codes.length) return "allowed";
  const allowed = permissions ? codes.some((code) => permissions.includes(code)) : hasAnyPermission(codes);
  return allowed ? "allowed" : "denied";
}

/** Resultado de AsyncState para acesso negado (o mesmo que um 403 da API daria), com a primeira permissão exigida. */
export function deniedResult(permission) {
  const [first] = required(permission);
  const error = Object.assign(new Error("Sem permissão"), { status: 403, code: "PERMISSION_DENIED", details: { required: first } });
  return { status: UI_STATE.PERMISSION_DENIED, error, data: null, traceId: null };
}
