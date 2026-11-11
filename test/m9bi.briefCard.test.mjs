// M9-D685 / M9-D693 (livro §17, Guia §9) — o cartão do briefing da NAY Diretoria no Centro de Comando (CommandCenter.js). A tela é montada de verdade (jsdom) e lê
// `GET /analytics/dashboards/command_center` de uma API simulada (nenhuma chamada sai da máquina). Estados: carregando (nada do briefing aparece antes da resposta),
// GENERATED (cada item com o fato, a variação, a fonte e o frescor; fechamento quando houver) e FAILED ("Briefing indisponível", sem item nem fonte inventados).
import { test } from "node:test";
import assert from "node:assert/strict";
import CommandCenter from "@/components/organisms/CommandCenter/CommandCenter.js";
import { html } from "./_loader/render.mjs";
import { stubApi, ok, mount, settle, textOf } from "./_loader/domApi.mjs";

const ROUTE = "GET /analytics/dashboards/command_center";
const view = (brief) => ({ asOfDate: "2026-10-28", generatedAt: "2026-10-28T09:42:00Z", brief, widgets: [], hidden: null, blocks: [] });
const GENERATED = {
  id: "b1", briefType: "DAILY", status: "GENERATED", available: true, periodStart: "2026-10-27", periodEnd: "2026-10-27", closing: "As demais áreas estão dentro do esperado.",
  items: [
    { refId: "i1", tipo: "EXCECAO", fato: "Caixa livre: R$ 150,00.", variacao: "Variação de R$ 50,00 (50,00%) contra 26/10/2026.", fonte: [{ metricCode: "fin.free_cash" }], freshness: { label: "Atualizado às 06:30" } },
    { refId: "i2", tipo: "ATENCAO_QUALIDADE", fato: "Integrações com erro: dado incompleto.", variacao: "", fonte: [{ metricCode: "tec.integration_errors" }, { metricCode: "tec.availability" }] },
  ],
};
const FAILED = { id: "b0", briefType: "DAILY", status: "FAILED", available: false, message: "Briefing indisponível", items: [], closing: null };
const PERMS = { permissions: ["analytics:read"] };

test("M9-D685 carregando: antes da resposta da API o Centro de Comando mostra só o indicador de carga, sem briefing", async () => {
  const ssr = html(CommandCenter, PERMS);
  assert.match(ssr, /role="status"[^>]*>|aria-label="Carregando"/);
  assert.doesNotMatch(ssr, /data-command-brief|Briefing da NAY/);
  const api = stubApi({ [ROUTE]: { gate: true, reply: () => ok(view(GENERATED)) } });
  const screen = await mount(CommandCenter, PERMS);
  await settle(2);
  assert.ok(screen.container.querySelector('[aria-label="Carregando"]'), "spinner enquanto a resposta não chega");
  assert.equal(screen.container.querySelector("[data-command-brief]"), null);
  api.release();
  await settle();
  assert.equal(screen.container.querySelector('[aria-label="Carregando"]'), null);
  assert.equal(screen.container.querySelector("[data-command-brief]").getAttribute("data-command-brief"), "available");
  assert.deepEqual(api.calls.map((c) => `${c.method} ${c.path}`), [ROUTE]);
  await screen.unmount();
});

test("M9-D693 GENERATED: cada item com fato, variação, fontes e frescor, na ordem do servidor, e o fechamento", async () => {
  stubApi({ [ROUTE]: () => ok(view(GENERATED)) });
  const screen = await mount(CommandCenter, PERMS);
  await settle();
  const card = screen.container.querySelector("[data-command-brief]");
  assert.equal(card.getAttribute("data-command-brief"), "available");
  assert.match(textOf(card), /^Briefing da NAY Diretoria/);
  const items = [...card.querySelectorAll("li")].map(textOf);
  assert.deepEqual(items, [
    "Caixa livre: R$ 150,00. Variação de R$ 50,00 (50,00%) contra 26/10/2026. Fonte: fin.free_cash · Atualizado às 06:30",
    "Integrações com erro: dado incompleto. Fonte: tec.integration_errors, tec.availability",
  ]);
  assert.match(textOf(card), /As demais áreas estão dentro do esperado\.$/);
  assert.doesNotMatch(textOf(card), /Briefing indisponível/);
  await screen.unmount();
});

test("M9-D693 FAILED: \"Briefing indisponível\", sem item, sem fonte e sem fechamento (nenhum texto inventado)", async () => {
  stubApi({ [ROUTE]: () => ok(view(FAILED)) });
  const screen = await mount(CommandCenter, PERMS);
  await settle();
  const card = screen.container.querySelector("[data-command-brief]");
  assert.equal(card.getAttribute("data-command-brief"), "unavailable");
  assert.deepEqual([...card.children].map(textOf), ["Briefing da NAY Diretoria", "Briefing indisponível"], "só o título e o aviso");
  assert.equal(card.querySelectorAll("li").length, 0);
  assert.doesNotMatch(textOf(card), /Fonte:/);
  await screen.unmount();
});

test("M9-D693 sem briefing na resposta (empresa sem IA ligada) o cartão não aparece e o resto do Centro de Comando sim", async () => {
  stubApi({ [ROUTE]: () => ok(view(null)) });
  const screen = await mount(CommandCenter, PERMS);
  await settle();
  assert.equal(screen.container.querySelector("[data-command-brief]"), null);
  assert.ok(screen.container.querySelector('[data-bi-panel="command_center"]'));
  assert.match(textOf(screen.container), /Posição em 28\/10\/2026/);
  await screen.unmount();
});
