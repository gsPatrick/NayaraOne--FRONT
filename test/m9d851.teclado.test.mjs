// M9-D851 — teclado e foco: formulário só com teclado, modal que prende e devolve o foco, linha clicável com Enter e Espaço.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM, VirtualConsole } from "jsdom";
import { html } from "./_loader/render.mjs";
import { withPainelProviders } from "./_loader/axe.mjs";
import { activateModalFocus, focusablesIn } from "@/lib/a11y/modalFocus.js";
import { activatable } from "@/lib/a11y/keyboard.js";
import Modal from "@/components/organisms/Modal/Modal.js";

const require = createRequire(import.meta.url);
const { scan, clickableWithoutKeyboard } = require("../scripts/a11yStatic.js");
const dom = (markup) => new JSDOM(`<!doctype html><html lang="pt-BR"><body>${markup}</body></html>`, { runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const key = (window, target, init) => { const event = new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }); target.dispatchEvent(event); return event; };

test("m9d851 fluxo de formulário completo só com teclado", async () => {
  const Page = await withPainelProviders((await import("@/app/painel/pessoas/novo/page.js")).default);
  const { window } = dom(html(Page));
  const { document } = window;
  const controls = [...document.querySelectorAll("input:not([type=hidden]), select, textarea, button, a[href], [role=button], [role=link], [tabindex]")].filter((el) => !el.closest("[aria-hidden=true]") && el.getAttribute("aria-hidden") !== "true");
  assert.ok(controls.length >= 6, `controles do formulário: ${controls.length}`);
  assert.equal(document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length, 0, "nenhum tabindex positivo (a ordem de Tab é a ordem visual do documento)");
  const reached = [];
  for (const el of controls.filter((c) => c.getAttribute("tabindex") !== "-1" && !c.disabled)) { el.focus(); if (document.activeElement === el) reached.push(el); }
  assert.equal(reached.length, controls.filter((c) => c.getAttribute("tabindex") !== "-1" && !c.disabled).length, "todo controle recebe foco");
  for (const field of document.querySelectorAll("input:not([type=hidden]):not([aria-hidden=true]), select, textarea")) {
    const named = field.getAttribute("aria-label") || field.getAttribute("aria-labelledby") || (field.id && document.querySelector(`label[for="${field.id}"]`)) || field.closest("label");
    assert.ok(named, `campo sem rótulo: ${field.outerHTML.slice(0, 80)}`);
  }
  const clickable = [...document.querySelectorAll("div[onclick], span[onclick]")];
  assert.equal(clickable.length, 0);
  assert.ok([...document.querySelectorAll("button")].some((b) => /salvar|cadastrar|criar|continuar/i.test(b.textContent)), "a ação principal é um <button> (Enter e Espaço ativam)");
  const { violations } = { violations: scan().filter((f) => f.code === "GOV_A11Y_KEYBOARD") };
  assert.deepEqual(violations, [], "nenhuma linha clicável sem teclado em app/painel e components");
});

test("m9d851 modal prende e devolve o foco", () => {
  const { window } = dom('<button id="gatilho">Abrir</button><div id="dlg" role="dialog" aria-modal="true" aria-label="Excluir" tabindex="-1"><button id="a">Cancelar</button><input id="b" aria-label="Motivo"><button id="c">Excluir</button></div>');
  const { document } = window;
  const trigger = document.getElementById("gatilho");
  trigger.focus();
  let closed = 0;
  const off = activateModalFocus({ container: document.getElementById("dlg"), onClose: () => { closed += 1; }, doc: document });
  assert.equal(document.activeElement.id, "dlg", "o foco entra no diálogo");
  document.getElementById("a").focus();
  document.getElementById("c").focus();
  let event = key(window, document.getElementById("c"), { key: "Tab" });
  assert.equal(event.defaultPrevented, true);
  assert.equal(document.activeElement.id, "a", "Tab no último volta ao primeiro (sem armadilha nem fuga)");
  event = key(window, document.getElementById("a"), { key: "Tab", shiftKey: true });
  assert.equal(document.activeElement.id, "c", "Shift+Tab no primeiro vai ao último");
  trigger.focus();
  key(window, trigger, { key: "Tab" });
  assert.equal(document.activeElement.id, "a", "foco que escapou volta para dentro");
  key(window, document.getElementById("a"), { key: "Escape" });
  assert.equal(closed, 1, "Esc fecha");
  off();
  assert.equal(document.activeElement.id, "gatilho", "o foco volta ao botão que abriu");
  assert.equal(focusablesIn(document.getElementById("dlg")).length, 3);
  const empty = dom('<button id="g">x</button><div id="d" tabindex="-1"></div>');
  empty.window.document.getElementById("g").focus();
  const offEmpty = activateModalFocus({ container: empty.window.document.getElementById("d"), doc: empty.window.document });
  assert.equal(key(empty.window, empty.window.document.getElementById("d"), { key: "Tab" }).defaultPrevented, true, "sem controle focável o foco fica no diálogo");
  offEmpty();
  const source = html(Modal, { open: true, title: "Excluir papel", onClose() {}, children: "Confirma?" });
  assert.match(source, /role="dialog"[^>]*aria-modal="true"[^>]*aria-label="Excluir papel"/);
  assert.match(source, /aria-label="Fechar"/);
});

test("m9d851 linha clicável também ativa com Enter e Espaço", () => {
  const calls = [];
  const props = activatable(() => calls.push("go"));
  assert.deepEqual([props.role, props.tabIndex], ["link", 0]);
  const target = {};
  const press = (k, t = target) => { let prevented = false; props.onKeyDown({ key: k, target: t, currentTarget: target, preventDefault() { prevented = true; } }); return prevented; };
  assert.equal(press("Enter"), true);
  assert.equal(press(" "), true);
  assert.equal(press("Tab"), false);
  assert.equal(press("Enter", {}), false, "Enter dentro de um botão interno não ativa a linha");
  props.onClick();
  assert.equal(calls.length, 3);
  assert.deepEqual(clickableWithoutKeyboard('<div onClick={() => go()}>x</div>').length, 1);
  assert.deepEqual(clickableWithoutKeyboard('<div {...activatable(() => go())}>x</div>'), []);
  assert.deepEqual(clickableWithoutKeyboard('<div onClick={(e) => e.stopPropagation()}>x</div>'), []);
});
