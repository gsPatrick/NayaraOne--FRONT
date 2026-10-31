// M9-D850 (revisão) — retry idempotente da criação, guarda de sequência, cópia local derivada, 404 e aviso de recarga.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import ReloadAlert, { isReloadFailure } from "@/components/molecules/ReloadAlert/ReloadAlert.js";
import { createLatestGuard } from "@/lib/asyncState/latest.js";
import { resolveLocalCopy, applyLocalCopy } from "@/lib/asyncState/localCopy.js";
import { nullOn404 } from "@/lib/asyncState/notFound.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

let fetchCalls;
beforeEach(() => {
  const storage = new Map();
  fetchCalls = [];
  globalThis.window = {
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    location: { pathname: "/painel", search: "", href: "" },
  };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ success: true, data: { id: "x1", propertyId: "x1", name: "n" } }) };
  };
});

test("m9d853 criação do imóvel, oferta, proprietário e radar enviam a Idempotency-Key recebida", async () => {
  const { createProperty, createOffer, addPropertyOwner } = await import("@/lib/api/properties.js");
  const { createRadar } = await import("@/lib/api/radar.js");
  await createProperty({ title: "A" }, { idempotencyKey: "ui-k:imovel" });
  await createOffer("x1", { offerType: "RENT" }, { idempotencyKey: "ui-k:oferta" });
  await addPropertyOwner("x1", { personId: "p1", ownershipPercent: "100" }, { idempotencyKey: "ui-k:proprietario-0" });
  await createRadar({ personId: "p1", criteriaJson: {} }, { idempotencyKey: "ui-r" });
  assert.deepEqual(fetchCalls.map((c) => c.init.headers["Idempotency-Key"]), ["ui-k:imovel", "ui-k:oferta", "ui-k:proprietario-0", "ui-r"]);
  fetchCalls.length = 0;
  await createProperty({ title: "B" });
  assert.equal(fetchCalls[0].init.headers["Idempotency-Key"], undefined, "sem chave, nenhum cabeçalho é inventado");
});

test("m9d853 guarda de sequência: só a chamada mais recente aplica o dado", () => {
  const guard = createLatestGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(first(), false, "a recarga antiga que chega depois não aplica");
  assert.equal(second(), true);
  const third = guard.begin();
  assert.equal(second(), false);
  assert.equal(third(), true);
});

test("m9d853 cópia local derivada: 1º render já tem o dado, edição vale até nova leitura", () => {
  const empty = { has: false, source: null, value: null };
  assert.deepEqual(resolveLocalCopy(empty, undefined, []), [], "antes da leitura, o valor inicial");
  const loaded = [{ id: 1 }, { id: 2 }];
  assert.equal(resolveLocalCopy(empty, loaded, []), loaded, "no 1º render em CONTENT a lista já é o dado lido (sem flash de vazio)");
  const edited = applyLocalCopy(empty, loaded, [], (prev) => prev.filter((r) => r.id !== 1));
  assert.deepEqual(resolveLocalCopy(edited, loaded, []), [{ id: 2 }]);
  const reloaded = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.equal(resolveLocalCopy(edited, reloaded, []), reloaded, "nova leitura substitui a edição local");
  const twice = applyLocalCopy(edited, loaded, [], (prev) => [...prev, { id: 9 }]);
  assert.deepEqual(resolveLocalCopy(twice, loaded, []).map((r) => r.id), [2, 9], "edições seguidas acumulam");
});

test("m9d853 nullOn404 só engole 404", () => {
  assert.equal(nullOn404({ status: 404 }), null);
  assert.throws(() => nullOn404({ status: 500 }), (e) => e.status === 500);
  assert.throws(() => nullOn404({ status: 0 }), (e) => e.status === 0);
});

test("m9d853 aviso de falha de recarga aparece só nas falhas, com tentar de novo e código de suporte", () => {
  assert.equal(isReloadFailure(UI_STATE.CONTENT), false);
  assert.equal(isReloadFailure(UI_STATE.LOADING), false);
  assert.equal(html(ReloadAlert, { result: { status: UI_STATE.CONTENT } }), "");
  const retry = html(ReloadAlert, { result: { status: UI_STATE.RETRY, error: { message: "Algo deu errado." }, traceId: "t-123", reload: () => {} } });
  assert.match(retry, /Tentar novamente/);
  assert.match(retry, /t-123/);
  assert.match(retry, /desatualizados/);
  const offline = html(ReloadAlert, { result: { status: UI_STATE.OFFLINE, reload: () => {} } });
  assert.match(offline, /Sem conexão/);
  const denied = html(ReloadAlert, { result: { status: UI_STATE.PERMISSION_DENIED, error: { status: 403 } } });
  assert.match(denied, /não tem acesso/);
  assert.doesNotMatch(denied, /Tentar novamente/);
});
