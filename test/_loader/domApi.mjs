// Apoio dos testes que montam uma tela de verdade (React no jsdom) com a API simulada: o `fetch` global é trocado por uma tabela de respostas (método + caminho)
// e a URL base aponta para um endereço local que não existe, de modo que nenhuma chamada sai da máquina (nunca homologação). Cada pedido fica registrado.
import { act, createElement } from "react";
import { JSDOM, VirtualConsole } from "jsdom";

// O documento existe ANTES de o react-dom carregar: ele decide na carga se há DOM (sem isso o evento `input` dos campos não chega ao onChange).
const { window } = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/", pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
globalThis.window = window; globalThis.document = window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");

export const API_BASE = "http://127.0.0.1:9/api/v1";

/** routes: { "GET /settings?prefix=analytics.": (req) => ({ status, body }) }; o corpo vira o JSON da API ({ success, data } ou { success: false, error }). */
export function stubApi(routes) {
  const calls = [];
  const pending = [];
  process.env.NEXT_PUBLIC_API_URL = API_BASE;
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    if (!href.startsWith(API_BASE)) throw new Error(`chamada fora da API simulada: ${href}`);
    const path = href.slice(API_BASE.length);
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const route = routes[`${method} ${path}`];
    if (!route) throw new Error(`rota não simulada: ${method} ${path}`);
    const gate = route.gate ? new Promise((resolve) => pending.push(resolve)) : null;
    if (gate) await gate;
    const out = (route.reply || route)({ method, path, body });
    return new Response(JSON.stringify(out.body), { status: out.status || 200, headers: { "content-type": "application/json" } });
  };
  return { calls, release: () => pending.splice(0).forEach((resolve) => resolve()) };
}

export const ok = (data) => ({ status: 200, body: { success: true, data } });
export const refused = (status, code, message) => ({ status, body: { success: false, error: { code, message } } });

/** Monta o componente num container novo do documento; devolve { window, root, container, unmount }. */
export async function mount(Component, props = {}) {
  window.localStorage.clear();
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(createElement(Component, props)); });
  return { window, root, container, unmount: () => act(async () => { root.unmount(); container.remove(); }) };
}

/** Deixa as promessas pendentes (fetch, setState) terminarem dentro do act. */
export async function settle(times = 5) {
  for (let i = 0; i < times; i += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

/** Digita no campo como o usuário (o React ouve o evento `input`). */
export async function type(window, input, text) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, text);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

export async function click(window, element) {
  await act(async () => { element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
}

/** Texto visível do container, sem espaços repetidos. */
export const textOf = (node) => node.textContent.replace(/\s+/g, " ").trim();
