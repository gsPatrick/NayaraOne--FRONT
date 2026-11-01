// M9-D433 (reabertura F03) — a aba Marketing mostra o rótulo do campo e não a chave técnica ao recusar um parâmetro.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildLabelMap, labelSettingMessage } from "@/lib/settings/errorLabel.js";

const labels = buildLabelMap([{ key: "marketing.url.max_saltos", label: "Redirecionamentos seguidos e verificados" }]);

test("m9d433 erro com chave técnica de Marketing aparece com o rótulo", () => {
  const msg = labelSettingMessage('O valor de "marketing.url.max_saltos" deve ser <= 10.', labels);
  assert.equal(msg, 'O valor de "Redirecionamentos seguidos e verificados" deve ser <= 10.');
});

test("m9d433 chave de Marketing desconhecida nunca aparece", () => {
  assert.ok(!labelSettingMessage('O valor de "marketing.url.nova" é inválido.', {}).includes("marketing."));
});

test("m9d433 a aba Marketing traduz o erro ao salvar", () => {
  const tab = fs.readFileSync(new URL("../app/painel/configuracoes/MarketingTab.js", import.meta.url), "utf8");
  assert.match(tab, /labelSettingError\(err, buildLabelMap\(ALL_FIELDS\)/);
});
