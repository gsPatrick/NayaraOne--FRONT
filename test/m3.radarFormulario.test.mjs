// M3-15 — Formulário do Radar com as quatro categorias do livro (Marco 3 §13: obrigatório, preferência, flexível, exclusão)
// no formato que a API aceita (NayaraOne--API/src/features/radar/radarCriteria.js): obrigatórios nas chaves planas,
// `preferences`/`flexible` com `weight` (> 0) e `exclusions` sem peso. Números com DecimalInput + toNumber (vírgula decimal).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, useState, act } from "react";
import { JSDOM, VirtualConsole } from "jsdom";
import { html } from "./_loader/render.mjs";
import RadarCriteriaForm from "@/components/organisms/RadarCriteriaForm/RadarCriteriaForm.js";
import { emptyRadarForm, buildRadarCriteria, formFromCriteriaJson, errorSummaryItems } from "@/lib/radarCriteria.js";

// O react-dom decide no import se o navegador tem o evento "input": o DOM precisa existir antes de carregá-lo.
const boot = new JSDOM("<!doctype html><body></body>", { virtualConsole: new VirtualConsole() });
globalThis.window = boot.window; globalThis.document = boot.window.document;
// Node 20 (o do CI) não tem `navigator` global e o react-dom o lê na carga; Node 21+ já tem (nada muda).
if (!("navigator" in globalThis)) Object.defineProperty(globalThis, "navigator", { value: boot.window.navigator, configurable: true });
const { createRoot } = await import("react-dom/client");

const ESPERADO = {
  propertyType: "RESIDENTIAL", offerType: "SALE", city: "Campinas", state: "SP",
  minPrice: 300000, maxPrice: 600000.5, minAreaM2: null, maxAreaM2: null,
  preferences: [{ code: "MIN_BEDROOMS", value: 3, weight: 2 }, { code: "NEIGHBORHOOD", value: "Taquaral", weight: 1 }],
  flexible: [
    { code: "ATTRIBUTE", key: "acabamento", value: "alto padrão", weight: 1.5 },
    { code: "MAX_DISTANCE_KM", value: 5, lat: -22.9056, lng: -47.0608, weight: 1 },
  ],
  exclusions: [{ code: "PROPERTY_TYPE", value: "LAND" }, { code: "ATTRIBUTE", key: "elevator", value: "false" }],
};

function mount() {
  const { window } = new JSDOM("<!doctype html><body><div id=r></div></body>", { pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  globalThis.window = window; globalThis.document = window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const state = { form: null };
  function Harness() {
    const [form, setForm] = useState(emptyRadarForm);
    state.form = form;
    return createElement(RadarCriteriaForm, { form, onChange: setForm, errors: {} });
  }
  const root = createRoot(window.document.getElementById("r"));
  const $ = (id) => window.document.getElementById(id);
  const fill = async (id, value) => {
    const el = $(id);
    assert.ok(el, `campo ${id} na tela`);
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
      el.dispatchEvent(new window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
  };
  const click = async (label) => {
    const btn = [...window.document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
    assert.ok(btn, `botão "${label}" na tela`);
    await act(async () => { btn.click(); });
  };
  return { root, state, fill, click, Harness, window };
}

test("m3 radar formulário: preencher as quatro categorias na tela gera o criteriaJson que a API aceita", async () => {
  const { root, state, fill, click, Harness, window } = mount();
  await act(async () => root.render(createElement(Harness)));
  // Obrigatórios (finalidade, faixa de preço com vírgula e milhar, cidade/UF)
  await fill("rd-offer-type", "SALE");
  await fill("rd-min-price", "300.000,00");
  await fill("rd-max-price", "600000,50");
  await fill("rd-city", "Campinas");
  await fill("rd-state", "sp");
  // Preferências com peso
  await click("Adicionar preferência");
  await fill("rd-preferences-0-code", "MIN_BEDROOMS");
  await fill("rd-preferences-0-value", "3");
  await fill("rd-preferences-0-weight", "2");
  await click("Adicionar preferência");
  await fill("rd-preferences-1-value", "Taquaral");
  // Flexíveis com peso: característica livre (acabamento) e distância de um ponto
  await click("Adicionar critério flexível");
  await fill("rd-flexible-0-key-choice", "__OUTRA__");
  await fill("rd-flexible-0-key", "acabamento");
  await fill("rd-flexible-0-value", "alto padrão");
  await fill("rd-flexible-0-weight", "1,5");
  await click("Adicionar critério flexível");
  await fill("rd-flexible-1-code", "MAX_DISTANCE_KM");
  await fill("rd-flexible-1-value", "5");
  await fill("rd-flexible-1-lat", "-22,9056");
  await fill("rd-flexible-1-lng", "-47,0608");
  // Exclusões (sem peso): tipo de imóvel e característica conhecida
  await click("Adicionar exclusão");
  await fill("rd-exclusions-0-value", "LAND");
  await click("Adicionar exclusão");
  await fill("rd-exclusions-1-code", "ATTRIBUTE");
  await fill("rd-exclusions-1-key-choice", "elevator");
  await fill("rd-exclusions-1-value", "false");
  assert.equal(window.document.getElementById("rd-exclusions-1-weight"), null, "exclusão não tem peso: elimina o imóvel");

  const { criteriaJson, errors } = buildRadarCriteria(state.form);
  assert.deepEqual(errors, {});
  assert.deepEqual(criteriaJson, ESPERADO);
  await act(async () => root.unmount());
});

test("m3 radar formulário: remover um item tira o critério do payload", async () => {
  const { root, state, fill, click, Harness } = mount();
  await act(async () => root.render(createElement(Harness)));
  await click("Adicionar exclusão");
  await fill("rd-exclusions-0-value", "RURAL");
  assert.equal(buildRadarCriteria(state.form).criteriaJson.exclusions.length, 1);
  await click("Remover");
  assert.deepEqual(buildRadarCriteria(state.form).criteriaJson.exclusions, []);
  await act(async () => root.unmount());
});

test("m3 radar formulário: valor, peso e ponto inválidos são recusados no Front com o campo indicado", () => {
  const form = { ...emptyRadarForm(), minPrice: "10", maxPrice: "5",
    preferences: [{ uid: "a", code: "MIN_SUITES", value: "", weight: "0" }],
    flexible: [{ uid: "b", code: "MAX_DISTANCE_KM", value: "2", lat: "", lng: "x", weight: "1" }, { uid: "c", code: "ATTRIBUTE", key: "", value: "rústico", weight: "1" }],
    exclusions: [{ uid: "d", code: "PROPERTY_TYPE", value: "" }] };
  const { errors } = buildRadarCriteria(form);
  assert.deepEqual(Object.keys(errors).sort(), ["exclusions.0.value", "flexible.0.lat", "flexible.0.lng", "flexible.1.key", "maxPrice", "preferences.0.value", "preferences.0.weight"].sort());
  const itens = errorSummaryItems(errors);
  assert.ok(itens.find((i) => i.id === "rd-flexible-1-key-choice" && /Critério flexível 2, característica/.test(i.label)));
  assert.ok(itens.find((i) => i.id === "rd-max-price"));
});

test("m3 radar formulário: a edição lê o radar salvo nas quatro categorias e devolve o mesmo payload", () => {
  const form = formFromCriteriaJson(ESPERADO);
  assert.equal(form.flexible[0].otherKey, true, "característica fora da lista vira campo livre");
  assert.equal(form.exclusions[1].otherKey, false, "característica conhecida fica na lista");
  assert.deepEqual(buildRadarCriteria(form).criteriaJson, ESPERADO);
  // Obrigatórios dentro de `required` (outro formato aceito pela API) também são lidos.
  assert.equal(formFromCriteriaJson({ required: { city: "Valinhos", maxPrice: 900000 } }).city, "Valinhos");
  const out = html(RadarCriteriaForm, { form, onChange: () => {}, errors: {} });
  for (const titulo of ["Obrigatórios", "Preferências", "Flexíveis", "Exclusões"]) assert.match(out, new RegExp(titulo));
  assert.match(out, /id="rd-preferences-0-weight"[^>]*value="2"/);
  assert.doesNotMatch(out, /type="number"/, "nenhum campo numérico nativo (DecimalInput)");
});
