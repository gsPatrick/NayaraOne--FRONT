// M9-D940 — correções da revisão: cache preso à sessão, dado fresco x formulário, mensagem de negócio e trava de ação sem dado fresco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { createAsyncController, createActionController } from "@/lib/asyncState/controller.js";
import { createResultCache, sharedCache } from "@/lib/asyncState/cache.js";
import { isFormDirty, canResetForm } from "@/lib/asyncState/formSync.js";
import { businessMessageOf } from "@/lib/asyncState/messages.js";
import { clearSession } from "@/lib/auth/session.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

test("m9d940 revisita: o dado do cache aparece com fresh=false e só o 200 novo vira fresh=true", async () => {
  const cache = createResultCache();
  cache.set("k", { v: "antigo" }, 1);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const controller = createAsyncController({ fetcher: async () => { await gate; return { v: "novo" }; }, cacheKey: "k", cache, isOnline: () => true });
  const pending = controller.load();
  assert.equal(controller.getState().status, UI_STATE.LOADING);
  assert.deepEqual(controller.getState().data, { v: "antigo" });
  assert.equal(controller.getState().fresh, false);
  release();
  await pending;
  assert.equal(controller.getState().fresh, true);
  assert.deepEqual(controller.getState().data, { v: "novo" });
});

test("m9d940 freshOnly não monta o corpo com dado de revisita; sem freshOnly monta", () => {
  const result = { status: UI_STATE.LOADING, data: { role: "antigo" }, fresh: false };
  assert.match(html(AsyncState, { result, children: () => "CORPO" }), /CORPO/);
  const only = html(AsyncState, { result, freshOnly: true, children: () => "CORPO" });
  assert.doesNotMatch(only, /CORPO/);
  assert.match(only, /aria-busy/);
});

test("m9d940 lockStale desabilita as ações enquanto o dado não é fresco", () => {
  const result = { status: UI_STATE.LOADING, data: { a: 1 }, fresh: false };
  const locked = html(AsyncState, { result, lockStale: true, children: () => "<button>Aprovar</button>" });
  assert.match(locked, /<fieldset disabled/);
  const content = html(AsyncState, { result: { status: UI_STATE.CONTENT, data: { a: 1 }, fresh: true }, lockStale: true, children: () => "X" });
  assert.doesNotMatch(content, /fieldset/);
  const offline = html(AsyncState, { result: { status: UI_STATE.OFFLINE, data: { a: 1 }, stale: true }, lockStale: true, children: () => "X" });
  assert.match(offline, /<fieldset disabled/);
});

test("m9d940 logout limpa o cache compartilhado", () => {
  sharedCache.set("crm-dashboard", { total: 10 }, Date.now());
  assert.equal(sharedCache.size() > 0, true);
  clearSession();
  assert.equal(sharedCache.size(), 0);
});

test("m9d940 cache.delete invalida só a chave pedida", () => {
  const cache = createResultCache();
  cache.set("a", 1, 1);
  cache.set("b", 2, 1);
  cache.delete("a");
  assert.equal(cache.get("a"), null);
  assert.equal(cache.get("b").data, 2);
});

test("m9d940 erro de negócio (409) aparece na tela com o código de suporte e sem stack", () => {
  const out = html(AsyncState, { result: { status: UI_STATE.ERROR, traceId: "abc-123", error: { status: 409, message: "Já existe um imóvel com este código interno." } } });
  assert.match(out, /Já existe um imóvel com este código interno\./);
  assert.match(out, /abc-123/);
  assert.match(out, /Copiar código/);
  assert.equal(businessMessageOf({ message: "TypeError: x is undefined\n at foo (a.js:1:2)" }), "");
  assert.equal(businessMessageOf({ message: "SELECT * FROM users" }), "");
  assert.equal(businessMessageOf({ message: "Algo deu errado." }), "");
  assert.equal(businessMessageOf({ message: "" }), "");
});

test("m9d940 formulário só reinicia com o dado novo se o usuário não mexeu", () => {
  const original = { a: "1", b: "" };
  assert.equal(isFormDirty({ a: "1", b: "" }, original), false);
  assert.equal(isFormDirty({ a: "1", b: "x" }, original), true);
  assert.equal(canResetForm({ a: "9", b: "" }, null), true, "primeira carga");
  assert.equal(canResetForm({ a: "9", b: "" }, original), false, "digitou: não apaga");
  assert.equal(canResetForm(original, original), true);
  assert.equal(isFormDirty([{ c: 1 }], [{ c: 1 }]), false);
  assert.equal(isFormDirty([{ c: 2 }], [{ c: 1 }]), true);
});

test("m9d940 ação refeita pelo retry segue o mesmo caminho: a chave de idempotência só troca depois do sucesso", async () => {
  let calls = 0;
  const keys = [];
  const controller = createActionController({
    action: async ({ idempotencyKey }) => { keys.push(idempotencyKey); calls += 1; if (calls === 1) throw Object.assign(new Error("x"), { status: 503 }); return { recoveryCodes: ["A"] }; },
    isOnline: () => true,
  });
  const first = await controller.run();
  assert.equal(first.status, UI_STATE.OFFLINE);
  const second = await controller.retry();
  assert.equal(second.status, UI_STATE.SUCCESS);
  assert.deepEqual(second.result, { recoveryCodes: ["A"] });
  assert.equal(keys[0], keys[1]);
});
