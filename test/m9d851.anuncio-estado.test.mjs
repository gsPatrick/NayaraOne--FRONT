// M9-D851 — região viva do padrão de estados: texto anunciado em cada estado e a região persistente (não nasce junto com o texto).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { announcementOf, countAnnouncement, LOADED_TEXT } from "@/lib/asyncState/announce.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

test("m9d851 anúncio: carregando, conteúdo com contagem, vazio e erros", () => {
  assert.equal(announcementOf({ status: UI_STATE.LOADING }, { loadingLabel: "Carregando contatos…" }), "Carregando contatos…");
  assert.equal(announcementOf({ status: UI_STATE.LOADING }), "Carregando...");
  assert.equal(announcementOf({ status: UI_STATE.CONTENT, data: [1] }), LOADED_TEXT);
  assert.equal(announcementOf({ status: UI_STATE.CONTENT, data: [1, 2] }, { contentAnnouncement: (d) => `${d.length} itens` }), "2 itens");
  assert.equal(announcementOf({ status: UI_STATE.EMPTY }, { emptyTitle: "Nenhum papel" }), "Nenhum papel");
  assert.match(announcementOf({ status: UI_STATE.RETRY }), /Não foi possível/);
  assert.match(announcementOf({ status: UI_STATE.OFFLINE }), /Sem conexão/);
  assert.match(announcementOf({ status: UI_STATE.PERMISSION_DENIED }), /não tem acesso/);
  assert.match(announcementOf({ status: UI_STATE.ERROR, traceId: "abc" }), /abc/);
  assert.equal(announcementOf({ status: UI_STATE.SUCCESS, message: "ok" }), "", "o aviso de sucesso já é role=status");
});

test("m9d851 anúncio: contagem em português", () => {
  assert.equal(countAnnouncement(0, "contato", "contatos"), "Nenhum contato encontrado");
  assert.equal(countAnnouncement(1, "contato", "contatos"), "1 contato encontrado");
  assert.equal(countAnnouncement(12, "contato", "contatos"), "12 contatos encontrados");
});

test("m9d851 anúncio: HTML do servidor sem região vazia e o carregando visível não é uma 2ª região viva", () => {
  const out = html(AsyncState, { result: { status: UI_STATE.LOADING, data: null } });
  assert.doesNotMatch(out, /data-async-announcer/);
  assert.doesNotMatch(out, /role="status"/);
  assert.match(out, /aria-busy="true"/);
});

test("m9d851 anúncio: a região é montada vazia e só depois recebe o texto (com atraso), sempre no mesmo lugar", () => {
  const src = readFileSync(new URL("../components/molecules/AsyncState/LiveAnnouncer.js", import.meta.url), "utf8");
  assert.match(src, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(src, /useState\(""\)/);
  assert.match(src, /setTimeout\(\(\) => setShown/);
  const as = readFileSync(new URL("../components/molecules/AsyncState/AsyncState.js", import.meta.url), "utf8");
  assert.match(as, /<LiveAnnouncer [^>]*\/>\s*<StateView/);
});
