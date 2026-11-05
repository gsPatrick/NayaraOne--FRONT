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
