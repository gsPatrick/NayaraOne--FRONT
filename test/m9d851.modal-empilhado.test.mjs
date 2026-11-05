// M9-D851 — diálogo sobre diálogo (ex.: verificação em duas etapas sobre "Excluir papel"): só o de cima trata Tab e Esc, e ao fechar o foco não cai no <body>.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { activateModalFocus } from "@/lib/a11y/modalFocus.js";

const dom = (markup) => new JSDOM(`<!doctype html><html lang="pt-BR"><body>${markup}</body></html>`, { runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const key = (window, target, init) => { const event = new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }); target.dispatchEvent(event); return event; };

test("m9d851 Esc com dois diálogos abertos fecha só o de cima e devolve o foco ao de baixo", () => {
  const { window } = dom('<div id="baixo" role="dialog" tabindex="-1"><button id="fechar">Fechar</button><button id="excluir" disabled>Excluir</button></div><div id="cima" role="dialog" tabindex="-1"><input id="codigo" aria-label="Código"></div>');
  const { document } = window;
  const fechados = [];
  document.getElementById("fechar").focus();
  const offBaixo = activateModalFocus({ container: document.getElementById("baixo"), onClose: () => fechados.push("baixo"), doc: document });
  document.activeElement.blur(); // o gatilho do de cima ficou desabilitado e o foco caiu no body
  assert.equal(document.activeElement, document.body);
  const offCima = activateModalFocus({ container: document.getElementById("cima"), onClose: () => fechados.push("cima"), doc: document });
  document.getElementById("codigo").focus();
  key(window, document.getElementById("codigo"), { key: "Escape" });
  assert.deepEqual(fechados, ["cima"], "Esc fecha só o diálogo de cima");
  offCima();
  assert.ok(document.getElementById("baixo").contains(document.activeElement) && document.activeElement !== document.body, "o foco volta ao diálogo de baixo, não ao body");
  key(window, document.activeElement, { key: "Escape" });
  assert.deepEqual(fechados, ["cima", "baixo"]);
  offBaixo();
});

test("m9d851 Tab dentro do diálogo é conduzido item a item (no Safari o Tab nativo pula botões), com exceção do campo de data", () => {
  const { window } = dom('<div id="d" role="dialog" tabindex="-1"><button id="a">A</button><button id="b">B</button><input id="dt" type="date"><button id="c">C</button></div>');
  const { document } = window;
  const off = activateModalFocus({ container: document.getElementById("d"), onClose: () => {}, doc: document });
  document.getElementById("a").focus();
  assert.equal(key(window, document.activeElement, { key: "Tab" }).defaultPrevented, true);
  assert.equal(document.activeElement.id, "b", "Tab vai ao próximo item mesmo sem ajuda do navegador");
  key(window, document.activeElement, { key: "Tab" });
  assert.equal(document.activeElement.id, "dt");
  assert.equal(key(window, document.activeElement, { key: "Tab" }).defaultPrevented, false, "no campo de data o navegador anda entre dia, mês e ano");
  document.getElementById("c").focus();
  key(window, document.activeElement, { key: "Tab" });
  assert.equal(document.activeElement.id, "a", "no último volta ao primeiro");
  key(window, document.activeElement, { key: "Tab", shiftKey: true });
  assert.equal(document.activeElement.id, "c", "Shift+Tab no primeiro vai ao último");
  off();
});
