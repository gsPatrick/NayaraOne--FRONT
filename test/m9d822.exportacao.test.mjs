// M9-D822 (reaberturas F03, F06, F14, F17) — erro de parâmetro com rótulo, aviso que some, exportação sem pedir o código à toa e aviso de arquivo vazio.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildLabelMap, labelSettingMessage } from "@/lib/settings/errorLabel.js";
import { needsMfaPrompt, exportDoneNotice } from "@/lib/api/dlpExports.js";
import { GOVERNANCA_DLP_GROUPS } from "@/app/painel/configuracoes/governancaDlpGroups.js";
import { GOVERNANCA_DLP_EXPORT_GROUPS } from "@/app/painel/configuracoes/governancaDlpExportGroups.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const labels = buildLabelMap([...GOVERNANCA_DLP_GROUPS, ...GOVERNANCA_DLP_EXPORT_GROUPS].flatMap((g) => g.fields));

test("m9d822 F03 erro 422 da classe padrão e dos formatos aparece com o rótulo e sem a chave", () => {
  for (const key of ["governanca.dlp.classificacao_padrao", "governanca.dlp.exportacao.formatos"]) {
    assert.ok(labels[key], `o rótulo de ${key} existe nos grupos`);
    const msg = labelSettingMessage(`O valor de "${key}" deve ser um dos seguintes: A, B.`, labels);
    assert.ok(msg.includes(labels[key]) && !msg.includes("governanca."), msg);
  }
});

test("m9d822 F03 a aba Governança traduz o erro ao salvar", () => {
  assert.match(read("app/painel/configuracoes/GovernancaTab.js"), /labelSettingError\(err, buildLabelMap\(ALL_FIELDS\)/);
});

test("m9d822 F06 o erro some ao salvar com sucesso e ao mudar um valor", () => {
  const tab = read("app/painel/configuracoes/GovernancaTab.js");
  assert.match(tab, /function handleChange[\s\S]{0,200}setError\(""\)/);
  assert.match(tab, /setOriginal\(values\);\s*setError\(""\);\s*setSuccess\(/);
});

test("m9d822 F14 só pede o código quando a API responde MFA_STEP_UP_REQUIRED", () => {
  assert.equal(needsMfaPrompt({ code: "MFA_STEP_UP_REQUIRED" }, false), true);
  assert.equal(needsMfaPrompt({ code: "MFA_STEP_UP_REQUIRED" }, true), false, "depois de confirmar não abre a janela de novo");
  assert.equal(needsMfaPrompt({ code: "GOV_DLP_PURPOSE_REQUIRED" }, false), false);
  assert.equal(needsMfaPrompt(null), false);
  const modal = read("components/organisms/ExportRequestModal/ExportRequestModal.js");
  assert.match(modal, /onClick=\{\(\) => handleExport\(false\)\}/);
  assert.doesNotMatch(modal, /onClick=\{\(\) => setMfaOpen\(true\)\}/);
  assert.match(modal, /handleExport\(true\)/);
});

test("m9d822 F17 arquivo com 0 linhas é avisado", () => {
  const empty = exportDoneNotice({ fileName: "a.csv", rowCount: 0 });
  assert.equal(empty.tone, "warning");
  assert.match(empty.text, /vazio/);
  const full = exportDoneNotice({ fileName: "a.csv", rowCount: 3 });
  assert.equal(full.tone, "success");
  assert.match(exportDoneNotice({ fileName: "d.txt", rowCount: 0 }, "registro(s)").text, /0 registro\(s\)/);
});
