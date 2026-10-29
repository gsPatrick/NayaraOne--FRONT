// Listas auxiliares (M9-D850 §3.3, regra de ouro): carregar uma lista de apoio (imóveis de um select, contas bancárias etc.) que falha
// NUNCA vira "lista vazia" em silêncio. A falha é registrada aqui e o <LookupProblems/> do AppShell diz o que houve (sem acesso, sem conexão, tentar de novo).
import { classifyFailure, missingPermissionOf, UI_STATE } from "./states";

let problems = [];
let listeners = [];
const emit = () => { problems = [...problems]; listeners.forEach((listener) => listener()); };

export function reportLookupProblem(label, error) {
  const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const state = classifyFailure(error, { online });
  if (state === UI_STATE.SESSION_EXPIRED) return; // o apiFetch já leva ao login
  const entry = { label, state, permission: missingPermissionOf(error), traceId: (error && error.traceId) || null, message: (error && error.message) || "" };
  problems = [...problems.filter((item) => item.label !== label), entry];
  listeners.forEach((listener) => listener());
}

/** Manipulador de `.catch(...)` de uma lista auxiliar: registra a falha e devolve o valor vazio só para a tela não quebrar. */
export const lookupFallback = (label, empty = []) => (error) => {
  reportLookupProblem(label, error);
  return Array.isArray(empty) ? [] : empty;
};

export function clearLookupProblems() {
  if (problems.length === 0) return;
  problems = [];
  listeners.forEach((listener) => listener());
}

export const getLookupProblems = () => problems;
export function subscribeLookupProblems(listener) {
  listeners.push(listener);
  return () => { listeners = listeners.filter((item) => item !== listener); };
}
export { emit as _emitForTests };
