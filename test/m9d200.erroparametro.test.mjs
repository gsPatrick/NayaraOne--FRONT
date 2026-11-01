// M9-D200 (reabertura F03) — erro de parâmetro mostra o rótulo do campo, nunca a chave técnica.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildLabelMap, labelSettingMessage, labelSettingError } from "@/lib/settings/errorLabel.js";

const labels = buildLabelMap([{ key: "integration.registry.secret_scan_min_length", label: "Tamanho mínimo para detectar segredo" }]);

test("m9d200 erro 422 com chave técnica aparece com o rótulo do campo", () => {
  const msg = labelSettingMessage('O valor de "integration.registry.secret_scan_min_length" deve ser >= 24.', labels);
  assert.equal(msg, 'O valor de "Tamanho mínimo para detectar segredo" deve ser >= 24.');
  assert.ok(!msg.includes("integration."));
});

test("m9d200 chave desconhecida da tela nunca aparece", () => {
  const msg = labelSettingMessage('O valor de "governanca.dlp.classificacao_padrao" deve ser um dos seguintes: A, B.', {});
  assert.ok(!msg.includes("governanca.") && msg.includes("este parâmetro"));
});

test("m9d200 labelSettingError usa o texto padrão sem mensagem", () => {
  assert.equal(labelSettingError(null, labels, "Falhou."), "Falhou.");
  assert.ok(!labelSettingError({ message: 'O valor de "integration.registry.secret_scan_min_length" deve ser numérico.' }, labels, "x").includes("integration."));
});

test("m9d200 a aba Registro de integrações traduz o erro ao salvar", () => {
  const tab = fs.readFileSync(new URL("../app/painel/configuracoes/IntegracoesRegistroTab.js", import.meta.url), "utf8");
  assert.match(tab, /labelSettingError\(err, buildLabelMap\(ALL_FIELDS\)/);
});
