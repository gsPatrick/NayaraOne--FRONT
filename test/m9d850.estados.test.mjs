// M9-D850 — padrão de estados de UI: o mapa de status HTTP escolhe o estado e o componente único desenha cada um.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { createAsyncController, createActionController } from "@/lib/asyncState/controller.js";
import { createResultCache } from "@/lib/asyncState/cache.js";
import { UI_STATE, classifyFailure, fieldErrorsOf } from "@/lib/asyncState/states.js";
import { fieldErrorProps, fieldErrorId } from "@/lib/asyncState/fields.js";
import { parseFreshSeconds, loadFreshSeconds, resetFreshSeconds } from "@/lib/asyncState/freshness.js";

const failure = (status, extra = {}) => Object.assign(new Error(extra.message || "falhou"), { status, code: extra.code, details: extra.details, traceId: extra.traceId });
const run = async (fetcher, options = {}) => {
  const controller = createAsyncController({ fetcher, cache: createResultCache(), ...options });
  await controller.load();
  return controller;
};
const view = (controller, props = {}) => html(AsyncState, { result: { ...controller.getState(), retry: controller.retry }, ...props, children: props.children || (() => "CONTEUDO") });

test("m9d850 UI endpoint 403 não vira tela vazia enganosa", async () => {
  const controller = await run(async () => { throw failure(403, { code: "PERMISSION_DENIED", details: { required: "legal:read" } }); });
  assert.equal(controller.getState().status, UI_STATE.PERMISSION_DENIED);
  const out = view(controller, { emptyTitle: "Nenhum contrato encontrado" });
  assert.match(out, /Você não tem acesso a esta área\./);
  assert.doesNotMatch(out, /Nenhum contrato encontrado|Nada por aqui|CONTEUDO/, "403 nunca mostra o estado vazio nem o conteúdo");
  assert.equal(controller.getState().data, null);
});

test("m9d850 PERMISSION_DENIED mostra o código da permissão e o texto de a quem pedir", async () => {
  const controller = await run(async () => { throw failure(403, { code: "PERMISSION_DENIED", details: { required: "legal:read" } }); });
  const out = view(controller);
  assert.match(out, /<code>legal:read<\/code>/);
  assert.match(out, /Peça ao administrador da sua empresa/);
  const noCode = await run(async () => { throw failure(403, { code: "PERMISSION_DENIED", details: { required: "x y; <script>" } }); });
  assert.doesNotMatch(view(noCode), /<script>|<code>/, "só código de permissão válido; nunca texto livre");
});

test("m9d850 200 vazio mostra EMPTY", async () => {
  const controller = await run(async () => []);
  assert.equal(controller.getState().status, UI_STATE.EMPTY);
  const out = view(controller, { emptyTitle: "Nenhum contrato", emptyDescription: "Crie o primeiro.", emptyAction: { label: "Novo contrato", href: "/painel/contratos/novo" } });
  assert.match(out, /Nenhum contrato/);
  assert.match(out, /<a [^>]*href="\/painel\/contratos\/novo"[^>]*>Novo contrato<\/a>/);
  assert.equal((await run(async () => ({ items: [] }))).getState().status, UI_STATE.EMPTY);
  assert.equal((await run(async () => [{ id: 1 }])).getState().status, UI_STATE.CONTENT);
  assert.match(view(await run(async () => [{ id: 1 }])), /CONTEUDO/);
});

test("m9d850 422 liga erro ao campo e foca o resumo", async () => {
  const error = failure(422, { code: "VALIDATION_ERROR", message: "Dados inválidos", details: { problems: [{ field: "email", reason: "Informe um e-mail válido" }] } });
  const controller = await run(async () => { throw error; });
  assert.equal(controller.getState().status, UI_STATE.VALIDATION_ERROR);
  const out = view(controller);
  assert.match(out, /tabindex="-1"/, "o resumo recebe foco (tabIndex -1 + focus() ao montar)");
  assert.match(out, /role="alert"/);
  assert.match(out, /<a href="#error-email">Informe um e-mail válido<\/a>/);
  const props = fieldErrorProps(error, "email");
  assert.deepEqual([props.errorId, props.message, props.inputProps["aria-describedby"], props.inputProps["aria-invalid"]], ["error-email", "Informe um e-mail válido", "error-email", true]);
  assert.deepEqual(fieldErrorProps(error, "nome"), { message: null, errorId: null, inputProps: {} });
  assert.equal(fieldErrorId("endereço.cep"), "error-endere-o-cep");
  assert.deepEqual(fieldErrorsOf(failure(400, { details: { fields: { cpf: "Informe o CPF com 11 dígitos" } } })), [{ field: "cpf", message: "Informe o CPF com 11 dígitos" }]);
  const source = (await import("node:fs")).readFileSync(new URL("../components/molecules/AsyncState/AsyncState.js", import.meta.url), "utf8");
  assert.match(source, /ref\.current\.focus\(\)/, "foco no resumo ao aparecer");
});

test("m9d850 503 mostra OFFLINE com retry", async () => {
  const controller = await run(async () => { throw failure(503, { code: "PROVIDER_UNAVAILABLE" }); });
  assert.equal(controller.getState().status, UI_STATE.OFFLINE);
  const out = view(controller);
  assert.match(out, /Sem conexão ou serviço indisponível/);
  assert.match(out, /Tentar de novo/);
  for (const status of [502, 504, 0]) assert.equal(classifyFailure(failure(status)), UI_STATE.OFFLINE, String(status));
  assert.equal(classifyFailure(failure(200, { code: "NETWORK_ERROR" })), UI_STATE.OFFLINE);
  assert.equal(classifyFailure(failure(500), { online: false }), UI_STATE.OFFLINE, "navigator.onLine = false");
});

test("m9d850 500 mostra RETRY com traceId e 503 mostra OFFLINE", async () => {
  const retry = await run(async () => { throw failure(500, { message: "Erro interno.", traceId: "trace-abc-123" }); });
  assert.equal(retry.getState().status, UI_STATE.RETRY);
  const out = view(retry);
  assert.match(out, /trace-abc-123/);
  assert.match(out, /Tentar novamente/);
  assert.doesNotMatch(out, /Tentar de novo/, "RETRY e OFFLINE não se sobrepõem");
  for (const status of [429, 500, 501, 500]) assert.equal(classifyFailure(failure(status)), UI_STATE.RETRY, String(status));
  for (const status of [404, 409, 418]) assert.equal(classifyFailure(failure(status)), UI_STATE.ERROR, String(status));
  const generic = await run(async () => { throw failure(404, { traceId: "t-9" }); });
  assert.match(view(generic), /Algo deu errado\. Informe o código t-9 ao suporte\./);
  assert.doesNotMatch(view(generic), /at \w+ \(|\.js:\d+/, "nunca stack");
});

test("m9d850 dado em cache com mais de 60 s aparece marcado desatualizado", async () => {
  let clock = 1_000_000;
  const cache = createResultCache();
  const controller = createAsyncController({ fetcher: async () => [{ id: 1 }], cacheKey: "k", cache, now: () => clock, getFreshSeconds: () => 60 });
  await controller.load();
  assert.equal(controller.getState().status, UI_STATE.CONTENT);
  controller.setFetcher(async () => { throw failure(503); });
  clock += 30_000;
  await controller.retry();
  let state = controller.getState();
  assert.deepEqual([state.status, state.stale, state.fromCache, state.data.length], [UI_STATE.OFFLINE, false, true, 1], "30 s: dado atual, sem marca");
  assert.doesNotMatch(view(controller), /desatualizado/);
  clock += 31_000;
  await controller.retry();
  state = controller.getState();
  assert.deepEqual([state.stale, state.data.length], [true, 1], "61 s: desatualizado");
  const out = view(controller);
  assert.match(out, /desatualizados?/);
  assert.match(out, /CONTEUDO/, "o dado em cache continua visível");
  const tight = createAsyncController({ fetcher: async () => [1], cacheKey: "k2", cache: createResultCache(), now: () => clock, getFreshSeconds: () => 5 });
  await tight.load();
  tight.setFetcher(async () => { throw failure(503); });
  clock += 6_000;
  await tight.retry();
  assert.equal(tight.getState().stale, true, "governanca.ui.cache_fresco_s muda o limite");
  assert.equal(parseFreshSeconds(undefined), 60);
  assert.equal(parseFreshSeconds({ value: 15 }), 15);
  assert.equal(parseFreshSeconds(0), 60);
  resetFreshSeconds();
  assert.equal(await loadFreshSeconds(async () => ({ value: 90 })), 90);
  resetFreshSeconds();
  assert.equal(await loadFreshSeconds(async () => { throw failure(403); }), 60, "sem permissão de ler a configuração, vale o padrão do livro");
  resetFreshSeconds();
});

test("m9d850 403 jamais mostra dado em cache (só o OFFLINE mostra o último 200)", async () => {
  const cache = createResultCache();
  const controller = createAsyncController({ fetcher: async () => [{ id: 1 }], cacheKey: "c", cache });
  await controller.load();
  controller.setFetcher(async () => { throw failure(403, { code: "PERMISSION_DENIED" }); });
  await controller.retry();
  assert.deepEqual([controller.getState().status, controller.getState().data], [UI_STATE.PERMISSION_DENIED, null]);
});

test("m9d850 retry reenvia a mesma Idempotency-Key", async () => {
  const keys = [];
  let calls = 0;
  const controller = createActionController({
    action: async ({ idempotencyKey }) => { keys.push(idempotencyKey); calls += 1; if (calls < 3) throw failure(503); return { ok: true }; },
    successMessage: "Contrato criado.",
  });
  await controller.run({ titulo: "x" });
  assert.equal(controller.getState().status, UI_STATE.OFFLINE);
  await controller.retry();
  assert.equal(controller.getState().status, UI_STATE.OFFLINE);
  await controller.retry();
  assert.equal(controller.getState().status, UI_STATE.SUCCESS);
  assert.equal(new Set(keys).size, 1, "as três tentativas usam a mesma chave");
  assert.ok(keys[0].length >= 8 && keys[0].length <= 128, "tamanho aceito pela API (8 a 128)");
  await controller.run({ titulo: "y" });
  assert.notEqual(controller.getIdempotencyKey(), keys[0], "depois do sucesso a próxima ação usa outra chave");
  assert.equal(keys.length, 4);
  assert.notEqual(keys[3], keys[0]);
  const failed = createActionController({ action: async () => { throw failure(500); } });
  await failed.run();
  assert.notEqual(failed.getState().status, UI_STATE.SUCCESS, "falha no meio volta a RETRY, nunca a SUCCESS");
  assert.equal(failed.getState().status, UI_STATE.RETRY);
});

test("m9d850 sucesso é anunciado com role=status e o que foi feito", async () => {
  const controller = createActionController({ action: async () => ({ id: 7 }), successMessage: (r) => `Contrato ${r.id} criado.` });
  await controller.run();
  const out = html(AsyncState, { result: controller.getState() });
  assert.match(out, /role="status"/);
  assert.match(out, /Contrato 7 criado\./);
});

test("m9d850 carregando é aria-busy com o texto Carregando...", () => {
  const out = html(AsyncState, { result: { status: UI_STATE.LOADING, data: null } });
  assert.match(out, /aria-busy="true"/);
  assert.match(out, /Carregando\.\.\./);
});
