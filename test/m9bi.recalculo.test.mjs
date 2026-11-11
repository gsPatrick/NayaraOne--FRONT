// DI-BI-3 (Marco 9, BI de Tecnologia) — campo "Minutos entre os recálculos dos indicadores técnicos e de IA" (analytics.tec.recalculo_min) na aba BI e Centro de Comando:
// o padrão (4) e a faixa (1 a 60) são os da API (SETTINGS_SCHEMA e TECH_DEFAULTS do repositório irmão); quem valida é a API, e a tela manda o número e mostra a recusa no
// próprio campo. A tela é montada de verdade (jsdom) com a API simulada; nenhuma chamada sai da máquina.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { BI_TECNOLOGIA_KPI_GROUPS } from "@/app/painel/configuracoes/biTecnologiaKpiGroups.js";
import BiTab from "@/app/painel/configuracoes/BiTab.js";
import { stubApi, ok, refused, mount, settle, type, click, textOf } from "./_loader/domApi.mjs";

const require = createRequire(import.meta.url);
const KEY = "analytics.tec.recalculo_min";
const LABEL = "Minutos entre os recálculos dos indicadores técnicos e de IA";
// repositório irmão da API: layout de teste (API) ou o do projeto (NayaraOne--API)
const API_ROOT = ["../../API", "../../NayaraOne--API"].map((p) => new URL(p, import.meta.url).pathname).find((p) => fs.existsSync(`${p}/src/features/settings/settings.service.js`));

const field = () => BI_TECNOLOGIA_KPI_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g.title }))).find((f) => f.key === KEY);

test("DI-BI-3 o campo está no grupo das sondas de Tecnologia, numérico, padrão 4, com a faixa de 1 a 60 escrita na ajuda", () => {
  const f = field();
  assert.ok(f, "campo presente na aba BI e Centro de Comando");
  assert.deepEqual([f.group, f.label, f.type, f.defaultValue], ["Tecnologia: sondas de saúde e histórico", LABEL, "number", 4]);
  assert.match(f.helper, /^De 1 a 60\./, "a faixa aparece antes de tudo");
  assert.match(f.helper, /Padrão: 4\.$/);
  assert.match(f.helper, /Acima de 5 o indicador passa a aparecer como desatualizado/, "explica por que o padrão fica abaixo do frescor de 5 minutos");
  assert.equal(BI_TECNOLOGIA_KPI_GROUPS.flatMap((g) => g.fields).filter((x) => x.key === KEY).length, 1);
});

test("DI-BI-3 a faixa e o padrão do Front são os da API: inteiro de 1 a 60, padrão 4; 1 e 60 entram, 0, 61 e 4,5 são recusados", (t) => {
  if (!API_ROOT) return t.skip("repositório irmão da API ausente");
  const { SETTINGS_SCHEMA } = require(`${API_ROOT}/src/features/settings/settings.service.js`);
  const { TECH_DEFAULTS } = require(`${API_ROOT}/src/features/analytics/read-models/tecnologia.settings.js`);
  const spec = SETTINGS_SCHEMA[KEY];
  assert.deepEqual([spec.type, spec.min, spec.max], ["integer", 1, 60]);
  assert.equal(TECH_DEFAULTS[KEY], field().defaultValue);
  const [, min, max] = field().helper.match(/^De (\d+) a (\d+)\./).map(Number);
  assert.deepEqual([min, max], [spec.min, spec.max], "a ajuda diz a mesma faixa que a API aplica");
  const accepted = (v) => Number.isInteger(v) && v >= spec.min && v <= spec.max;
  assert.deepEqual([1, 4, 60, 0, 61, 4.5].map(accepted), [true, true, true, false, false, false]);
});

const settingsRoute = (value) => ({ "GET /settings?prefix=analytics.": () => ok([{ key: KEY, value }]) });
const inputOf = (window) => window.document.getElementById(`bi-${KEY}`);

test("DI-BI-3 a tela mostra o valor gravado na empresa e, fora da faixa, a recusa da API aparece com o nome do campo e nada é dado como salvo", async () => {
  const api = stubApi({
    ...settingsRoute(7),
    [`PUT /settings/${encodeURIComponent(KEY)}`]: ({ body }) => (Number.isInteger(body.value) && body.value >= 1 && body.value <= 60
      ? ok({ key: KEY, value: body.value })
      : refused(400, "SETTING_INVALID_VALUE", `O valor de "${KEY}" deve ser ${body.value < 1 ? ">= 1" : "<= 60"}.`)),
  });
  const screen = await mount(BiTab);
  await settle();
  const input = inputOf(screen.window);
  assert.ok(input, "o campo é desenhado");
  assert.deepEqual([input.type, input.value], ["number", "7"], "o valor que a empresa gravou, não o padrão");
  assert.match(textOf(input.closest("div")), /De 1 a 60\./);
  const save = [...screen.window.document.querySelectorAll("button")].find((b) => textOf(b) === "Salvar");

  await type(screen.window, input, "0");
  await click(screen.window, save);
  await settle();
  assert.deepEqual(api.calls.filter((c) => c.method === "PUT").map((c) => c.body), [{ value: 0 }], "manda o número digitado, como número");
  const shown = textOf(screen.container);
  assert.match(shown, new RegExp(`Não salvamos este campo .*${LABEL}: O valor de "${KEY}" deve ser >= 1\\.`));
  assert.doesNotMatch(shown, /Configurações do BI salvas/);

  await type(screen.window, input, "61");
  await click(screen.window, save);
  await settle();
  assert.match(textOf(screen.container), /deve ser <= 60\./);

  await type(screen.window, input, "60");
  await click(screen.window, save);
  await settle();
  assert.deepEqual(api.calls.filter((c) => c.method === "PUT").map((c) => c.body.value), [0, 61, 60]);
  assert.match(textOf(screen.container), /Configurações do BI salvas\./, "60 é o limite de cima e é aceito");
  await screen.unmount();
});
