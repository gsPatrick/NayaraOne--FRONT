// M9-D850/D940 (reverificação) — wrapper estável, progresso do wizard de imóvel, mensagens só em português, freshOnly offline,
// invalidação por prefixo, guarda de sequência e assinatura do formulário.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, useEffect, act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM, VirtualConsole } from "jsdom";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { UI_STATE } from "@/lib/asyncState/states.js";
import { businessMessageOf, genericErrorText } from "@/lib/asyncState/messages.js";
import { createResultCache } from "@/lib/asyncState/cache.js";
import { createActionController } from "@/lib/asyncState/controller.js";
import { runSave, signatureOf } from "@/app/painel/imoveis/novo/saveProgress.js";

// ---- 1. wrapper estável ----
async function mountCycle(extra) {
  const { window } = new JSDOM("<!doctype html><body><div id=r></div></body>", { pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  globalThis.window = window; globalThis.document = window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let mounts = 0; let unmounts = 0;
  const Child = () => { useEffect(() => { mounts += 1; return () => { unmounts += 1; }; }, []); return createElement("input", { id: "campo" }); };
  const root = createRoot(window.document.getElementById("r"));
  const render = (status, data) => act(() => root.render(createElement(AsyncState, { result: { status, data, fresh: status === UI_STATE.CONTENT }, ...extra }, createElement(Child))));
  await render(UI_STATE.CONTENT, { a: 1 });
  await render(UI_STATE.LOADING, { a: 1 });
  const lockedDuring = window.document.querySelector("fieldset").disabled;
  await render(UI_STATE.CONTENT, { a: 1 });
  const lockedAfter = window.document.querySelector("fieldset").disabled;
  await act(() => root.unmount());
  return { mounts, unmounts, lockedDuring, lockedAfter };
}

test("m9d941 CONTENT -> LOADING -> CONTENT monta o filho uma vez (sem lockStale)", async () => {
  const r = await mountCycle({});
  assert.equal(r.mounts, 1);
  assert.equal(r.unmounts, 1, "o único desmonte é o do fim do teste");
  assert.equal(r.lockedDuring, false);
});

test("m9d941 CONTENT -> LOADING -> CONTENT monta o filho uma vez (com lockStale) e trava só durante a recarga", async () => {
  const r = await mountCycle({ lockStale: true });
  assert.equal(r.mounts, 1);
  assert.equal(r.lockedDuring, true);
  assert.equal(r.lockedAfter, false);
});

test("m9d941 o wrapper em CONTENT não muda o visual (fieldset sem borda nem padding, sem atributos de trava)", () => {
  const out = html(AsyncState, { result: { status: UI_STATE.CONTENT, data: { a: 1 } }, children: () => "X" });
  assert.match(out, /<fieldset[^>]*border:0/);
  assert.doesNotMatch(out, /data-stale-lock|aria-busy|disabled/);
});

// ---- 4. OFFLINE respeita freshOnly ----
test("m9d941 OFFLINE com freshOnly não monta o corpo do cache; sem freshOnly monta", () => {
  const result = { status: UI_STATE.OFFLINE, data: { role: "antigo" }, fresh: false, retry: () => {} };
  const only = html(AsyncState, { result, freshOnly: true, children: () => "CORPO" });
  assert.doesNotMatch(only, /CORPO/);
  assert.match(only, /Sem conexão/);
  assert.match(only, /Tentar de novo/);
  assert.match(html(AsyncState, { result, children: () => "CORPO" }), /CORPO/);
});

// ---- 3. mensagens: lista de permissão ----
const HOSTIS = [
  'relation "users" does not exist',
  'column "cpf" of relation "people" violates not-null constraint',
  'duplicate key value violates unique constraint "uq_x"',
  "connect ECONNREFUSED 127.0.0.1:5432",
  "ENOENT: no such file or directory, open '/var/app/config'",
  "Falha em /Users/x/app/server/x",
  "/api/v1/people/123 failed",
  "SQLSTATE[23000]: Integrity constraint violation",
  "PG::UniqueViolation",
  "knex: Timeout acquiring a connection",
  "C:\\Users\\x\\app.js",
  "SequelizeDatabaseError: invalid input syntax",
  "Erro em /Users/x/app.js",
  "Falha ao ler config.json",
  "Violação em people_cpf_key",
  "valor = {a:1}",
  "Request failed with status code 500",
  "https://api.exemplo.com/v1/x",
  "Falha: a::b",
  "TypeError: Cannot read properties of undefined",
];
test("m9d941 mensagem de negócio: toda entrada hostil cai na frase genérica com código de suporte", () => {
  for (const message of HOSTIS) {
    assert.equal(businessMessageOf({ message }), "", `deveria bloquear: ${message}`);
    const retry = html(AsyncState, { result: { status: UI_STATE.RETRY, error: { message }, traceId: "t-9" } });
    assert.ok(retry.includes(genericErrorText("t-9")), `RETRY mostra o genérico: ${message}`);
    const validation = html(AsyncState, { result: { status: UI_STATE.VALIDATION_ERROR, error: { message, details: { fields: { cpf: message } } } } });
    assert.ok(!validation.includes(message.replace(/[<>&"']/g, "").slice(0, 12)) || validation.includes("Revise"), `VALIDATION não vaza: ${message}`);
    assert.doesNotMatch(validation, /Sequelize|\/Users|ECONN|SQLSTATE|violates|\/api\//);
  }
});

test("m9d941 frases legítimas em português passam (negócio e campos de validação)", () => {
  const legitimas = [
    "Código interno já existe para esta empresa.",
    "CPF inválido.",
    "Valor deve ser maior que R$ 0,00.",
    "Informe o percentual (de 0 a 100%).",
    "Vigência: de 01/10/2026 a 31/12/2026.",
    "Não foi possível salvar e/ou enviar o documento.",
    "O horário deve ser entre 08:00 e 18:00.",
    "Já existe um cadastro com este CNPJ.",
  ];
  for (const message of legitimas) assert.equal(businessMessageOf({ message }), message, message);
  const out = html(AsyncState, { result: { status: UI_STATE.VALIDATION_ERROR, error: { message: "CPF inválido.", details: { fields: { cpf: "Valor deve ser maior que R$ 0,00." } } } } });
  assert.match(out, /CPF inválido\./);
  assert.match(out, /Valor deve ser maior que R\$ 0,00\./);
  assert.equal(businessMessageOf({ message: "x".repeat(201) }), "");
  assert.equal(businessMessageOf({ code: "PERSON_DUPLICATE", message: 'duplicate key value violates unique constraint "x"' }), "Já existe um cadastro igual a este.", "código de negócio conhecido vence o texto");
  const retry = html(AsyncState, { result: { status: UI_STATE.RETRY, error: { message: "Código interno já existe para esta empresa." }, traceId: "t" } });
  assert.match(retry, /Código interno já existe/);
});

// ---- 2. progresso do wizard de imóvel ----
function fakeApi({ failOwner = null, failDocs = false } = {}) {
  const calls = [];
  const api = {
    calls,
    failOwner, failDocs,
    createProperty: async (p, o) => { calls.push(["createProperty", p.title, o.idempotencyKey]); return { id: "im1" }; },
    updateProperty: async (id, p) => { calls.push(["updateProperty", id, p.title]); },
    saveDocumentation: async (id) => { calls.push(["docs", id]); if (api.failDocs) throw new Error("docs"); },
    createOffer: async (id, p, o) => { calls.push(["createOffer", o.idempotencyKey]); return { id: "of1" }; },
    updateOffer: async (id, oid) => { calls.push(["updateOffer", oid]); },
    addOwner: async (id, o, opt) => { calls.push(["addOwner", o.personId, opt.idempotencyKey]); if (api.failOwner === o.personId) throw new Error("dono"); return { id: `ow-${o.personId}` }; },
    updateOwner: async (id, oid) => { calls.push(["updateOwner", oid]); },
    removeOwner: async (id, oid) => { calls.push(["removeOwner", oid]); },
  };
  return api;
}
const names = (api) => api.calls.map((c) => (["createOffer", "createProperty", "updateProperty"].includes(c[0]) ? c[0] : `${c[0]}:${c[1]}`));
const plan = (over = {}) => ({ property: { title: "Casa" }, docs: { iptu: "1" }, offer: { askingPrice: "10" }, owners: [{ personId: "A", roleCode: "OWNER", ownershipPercent: "50" }, { personId: "B", roleCode: "OWNER", ownershipPercent: "50" }], ...over });
const sameKey = (api) => api.calls.filter((c) => c[0] === "addOwner").map((c) => c[2]);

test("m9d941 docs falha -> Tentar novamente roda só a documentação", async () => {
  const holder = { state: null }; const api = fakeApi({ failDocs: true });
  await assert.rejects(runSave(holder, "k1", plan(), api));
  api.failDocs = false; api.calls.length = 0;
  const created = await runSave(holder, "k1", plan(), api);
  assert.deepEqual(names(api), ["docs:im1", "createOffer", "addOwner:A", "addOwner:B"]);
  assert.equal(api.calls.some((c) => c[0] === "createProperty"), false, "o imóvel não é criado de novo");
  assert.equal(created.id, "im1");
});

test("m9d941 dono 2 falha -> só o dono 2 roda no retry", async () => {
  const holder = { state: null }; const api = fakeApi({ failOwner: "B" });
  await assert.rejects(runSave(holder, "k1", plan(), api));
  api.failOwner = null; api.calls.length = 0;
  await runSave(holder, "k1", plan(), api);
  assert.deepEqual(names(api), ["addOwner:B"]);
});

test("m9d941 cenário A: dono A gravado, B falha, usuário remove A: B é gravado (índice não importa) e A sai do imóvel", async () => {
  const holder = { state: null }; const api = fakeApi({ failOwner: "B" });
  await assert.rejects(runSave(holder, "k1", plan(), api));
  api.failOwner = null; api.calls.length = 0;
  await runSave(holder, "k1", plan({ owners: [{ personId: "B", roleCode: "OWNER", ownershipPercent: "50" }] }), api);
  assert.ok(names(api).includes("addOwner:B"), "B não é pulado");
  assert.ok(names(api).includes("removeOwner:ow-A"), "A, já gravado e retirado do formulário, é removido");
});

test("m9d941 cenário B: imóvel criado, docs falha, usuário corrige o nome: o imóvel existente é atualizado (não ignorado nem recriado)", async () => {
  const holder = { state: null }; const api = fakeApi({ failDocs: true });
  await assert.rejects(runSave(holder, "k1", plan(), api));
  api.failDocs = false; api.calls.length = 0;
  await runSave(holder, "k1", plan({ property: { title: "Casa Nova" } }), api);
  assert.deepEqual(api.calls[0], ["updateProperty", "im1", "Casa Nova"]);
  assert.equal(api.calls.some((c) => c[0] === "createProperty"), false);
});

test("m9d941 dado editado depois de gravado atualiza oferta e dono; sem mudança não repete nada", async () => {
  const holder = { state: null }; const api = fakeApi();
  await runSave(holder, "k1", plan(), api);
  api.calls.length = 0;
  await runSave(holder, "k1", plan(), api);
  assert.deepEqual(api.calls, [], "mesma assinatura: nenhuma chamada");
  await runSave(holder, "k1", plan({ offer: { askingPrice: "20" }, owners: [{ personId: "A", roleCode: "OWNER", ownershipPercent: "60" }, { personId: "B", roleCode: "OWNER", ownershipPercent: "50" }] }), api);
  assert.deepEqual(names(api), ["updateOffer:of1", "updateOwner:ow-A"]);
});

test("m9d941 etapa que falhou antes de gravar e mudou usa Idempotency-Key nova; sem mudança reaproveita a mesma", async () => {
  const holder = { state: null }; const api = fakeApi({ failOwner: "B" });
  await assert.rejects(runSave(holder, "k1", plan(), api));
  await assert.rejects(runSave(holder, "k1", plan(), api));
  const keys = sameKey(api).filter((k) => k.includes("|B") || k.includes("B"));
  assert.equal(new Set(keys).size, 1, "retry idêntico: mesma chave");
  await assert.rejects(runSave(holder, "k1", plan({ owners: [{ personId: "A", roleCode: "OWNER", ownershipPercent: "50" }, { personId: "B", roleCode: "OWNER", ownershipPercent: "70" }] }), api));
  assert.equal(new Set(sameKey(api).filter((k) => k.includes("B"))).size, 2, "payload do dono mudou: chave nova");
});

test("m9d941 chave de ação nova (depois do sucesso ou reset) recomeça o progresso do zero", async () => {
  const holder = { state: null }; const api = fakeApi();
  await runSave(holder, "k1", plan(), api);
  api.calls.length = 0;
  await runSave(holder, "k2", plan(), api);
  assert.ok(api.calls.some((c) => c[0] === "createProperty"));
  assert.equal(signatureOf({ b: 1, a: 2 }), signatureOf({ a: 2, b: 1 }));
});

// ---- 6. invalidação por prefixo ----
test("m9d941 cache: deleteByPrefix remove todas as chaves do prefixo e só elas", () => {
  const cache = createResultCache();
  cache.set("u|c|antifraude:OPEN:ALL", 1, 1); cache.set("u|c|antifraude:RESOLVED:HIGH", 2, 1); cache.set("u|c|outra", 3, 1);
  assert.equal(cache.deleteByPrefix("u|c|antifraude:"), 2);
  assert.equal(cache.size(), 1);
});

// ---- 9. assinatura do formulário -> mesma chave ----
test("m9d941 reenviar o mesmo formulário mantém a Idempotency-Key; formulário alterado troca", async () => {
  const keys = [];
  const controller = createActionController({ action: async ({ idempotencyKey }) => { keys.push(idempotencyKey); throw Object.assign(new Error("t"), { status: 504 }); }, isOnline: () => true });
  let last = null;
  const submit = async (payload) => { const sig = JSON.stringify(payload); if (last !== sig) { controller.reset(); last = sig; } await controller.run(payload); };
  await submit({ a: 1 }); await submit({ a: 1 }); await submit({ a: 2 });
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[1], keys[2]);
});
