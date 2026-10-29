// M9-D850 — 401 leva ao login com returnTo (K12) e a rede/ApiError entregam o que o padrão de estados precisa.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { UI_STATE, classifyFailure } from "@/lib/asyncState/states.js";
import { buildLoginUrl, safeReturnTo, readLoginParams, SESSION_EXPIRED_TEXT } from "@/lib/auth/returnTo.js";

test("m9d850 401 leva ao login com returnTo e não mostra acesso negado", () => {
  assert.equal(classifyFailure({ status: 401, code: "MISSING_ACCESS_TOKEN" }), UI_STATE.SESSION_EXPIRED);
  assert.equal(classifyFailure({ status: 401, code: "SESSION_EXPIRED" }), UI_STATE.SESSION_EXPIRED);
  assert.notEqual(classifyFailure({ status: 401, code: "MISSING_ACCESS_TOKEN" }), UI_STATE.PERMISSION_DENIED);
  assert.equal(classifyFailure({ status: 401, code: "MFA_INVALID_CODE" }), UI_STATE.ERROR, "401 de regra de negócio (código MFA errado) não derruba a sessão");
  const url = buildLoginUrl("/painel/contratos?status=ativo");
  assert.equal(url, "/entrar?returnTo=%2Fpainel%2Fcontratos%3Fstatus%3Dativo&motivo=sessao-expirada");
  assert.deepEqual(readLoginParams(url.split("?")[1]), { returnTo: "/painel/contratos?status=ativo", expired: true });
  assert.equal(SESSION_EXPIRED_TEXT, "Sua sessão expirou. Entre novamente.");
});

test("m9d850 returnTo só aceita caminho interno", () => {
  for (const bad of ["https://evil.example/x", "//evil.example", "/\\evil", "javascript:alert(1)", "/entrar", "/entrar?x=1", "", null, undefined, "painel", "/a\nb"]) assert.equal(safeReturnTo(bad), null, String(bad));
  assert.equal(safeReturnTo("/painel/pessoas/novo"), "/painel/pessoas/novo");
  assert.equal(buildLoginUrl("//evil.example"), "/entrar?motivo=sessao-expirada");
  assert.deepEqual(readLoginParams("returnTo=https%3A%2F%2Fevil.example&motivo=sessao-expirada"), { returnTo: null, expired: true });
});

let storage;
let fetchCalls;
beforeEach(() => {
  storage = new Map();
  fetchCalls = [];
  globalThis.window = {
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    location: { pathname: "/painel/contratos", search: "?a=1", href: "" },
  };
  globalThis.localStorage = globalThis.window.localStorage;
});
const reply = (status, body, headers = {}) => ({ ok: status < 400, status, headers: { get: (name) => headers[name.toLowerCase()] || null }, text: async () => (body === undefined ? "" : JSON.stringify(body)) });

test("m9d850 apiFetch: ApiError leva status, traceId e a Idempotency-Key sai no cabeçalho", async () => {
  const { apiFetch } = await import("@/lib/api/client.js");
  globalThis.fetch = async (url, init) => { fetchCalls.push(init); return reply(500, { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno.", traceId: "trace-1" } }); };
  await assert.rejects(() => apiFetch("/x", { method: "POST", body: {}, idempotencyKey: "ui-chave-123456" }), (err) => err.status === 500 && err.traceId === "trace-1" && err.code === "INTERNAL_ERROR");
  assert.equal(fetchCalls[0].headers["Idempotency-Key"], "ui-chave-123456");
  globalThis.fetch = async () => reply(502, undefined, { "x-correlation-id": "corr-7" });
  await assert.rejects(() => apiFetch("/x"), (err) => err.status === 502 && err.traceId === "corr-7");
});

test("m9d850 apiFetch: rede caída é status 0 (OFFLINE) e 401 de sessão redireciona com returnTo", async () => {
  const { apiFetch } = await import("@/lib/api/client.js");
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => original(fn, 0);
  try {
    await assert.rejects(() => apiFetch("/x", { method: "POST", body: {} }), (err) => err.status === 0 && err.code === "NETWORK_ERROR" && classifyFailure(err) === UI_STATE.OFFLINE);
  } finally { globalThis.setTimeout = original; }
  globalThis.fetch = async () => reply(401, { success: false, error: { code: "MISSING_ACCESS_TOKEN", message: "Token de acesso ausente." } });
  await assert.rejects(() => apiFetch("/contracts"), (err) => err.status === 401 && err.code === "SESSION_EXPIRED" && err.message === SESSION_EXPIRED_TEXT);
  assert.equal(globalThis.window.location.href, "/entrar?returnTo=%2Fpainel%2Fcontratos%3Fa%3D1&motivo=sessao-expirada");
});
