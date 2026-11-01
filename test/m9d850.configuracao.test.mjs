// M9-D850 (reabertura F16) e M9-D870 (reabertura F15) — aba Governança: erro de faixa inline ao sair do campo e salvar sem alterar nunca grava (nem desliga módulo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changedFields, integerFieldError, invalidChangedFields, loadedValue } from "../app/painel/configuracoes/settingsFormat.js";

const ttl = { key: "governanca.mfa.ttl", label: "Validade", type: "integer", defaultValue: 600, min: 1, max: 3600 };
const dlp = { key: "governanca.modulos.dlp.habilitado", label: "DLP", type: "boolean", defaultValue: true };
const fonte = readFileSync(new URL("../app/painel/configuracoes/GovernancaTab.js", import.meta.url), "utf8");

test("m9d850 digitar 3601 num campo até 3600 acusa a faixa ao sair do campo; dentro da faixa e vazio não acusam", () => {
  assert.equal(integerFieldError(ttl, "3601"), "Valor inválido. Entre 1 e 3600.");
  assert.equal(integerFieldError(ttl, "0"), "Valor inválido. Entre 1 e 3600.");
  assert.equal(integerFieldError(ttl, "3600"), null);
  assert.equal(integerFieldError(ttl, "1"), null);
  assert.equal(integerFieldError(ttl, ""), null);
  assert.equal(integerFieldError({ ...ttl, max: undefined }, "0"), "Valor inválido. A partir de 1.", "sem teto, a frase só cita o limite que existe");
});

test("m9d850 o Salvar fica desabilitado enquanto um campo alterado está fora da faixa e volta ao corrigir", () => {
  const fields = [ttl, dlp];
  const original = { [ttl.key]: 600, [dlp.key]: true };
  assert.deepEqual(invalidChangedFields(fields, { ...original, [ttl.key]: "3601" }, original).map((f) => f.key), [ttl.key]);
  assert.deepEqual(invalidChangedFields(fields, { ...original, [ttl.key]: "3000" }, original), []);
  assert.deepEqual(invalidChangedFields(fields, original, original), [], "campo intocado nunca bloqueia");
});

test("m9d850 a aba liga o erro ao sair do campo (onBlur) e desabilita o Salvar", () => {
  assert.match(fonte, /onBlur=\{\(\) => setTouched/);
  assert.match(fonte, /error=\{touched\[field\.key\] \? integerFieldError\(field, values\[field\.key\]\) : null\}/);
  assert.match(fonte, /disabled=\{loading \|\| blocked\}/);
});

test("m9d870 salvar a aba sem alterar nada não grava nenhum campo (o módulo DLP segue ligado)", () => {
  const original = { [ttl.key]: 600, [dlp.key]: true };
  assert.deepEqual(changedFields([ttl, dlp], { ...original }, original), []);
  assert.deepEqual(changedFields([ttl, dlp], { ...original, [ttl.key]: "700" }, original).map((f) => f.key), [ttl.key], "só o campo alterado vai");
  assert.match(fonte, /const changed = changedFields\(ALL_FIELDS, values, original\)/);
  assert.match(fonte, /for \(const field of changed\)/);
});

test("m9d870 chave ausente ou nula da API mantém o padrão ligado; booleano em texto é lido pelo que diz", () => {
  assert.equal(loadedValue(dlp, null), true);
  assert.equal(loadedValue(dlp, undefined), true);
  assert.equal(loadedValue(dlp, false), false);
  assert.equal(loadedValue(dlp, "false"), false);
  assert.equal(loadedValue(dlp, "true"), true);
  assert.equal(loadedValue(dlp, "talvez"), true, "texto desconhecido não desliga");
  assert.equal(loadedValue(ttl, 900), 900);
  assert.equal(loadedValue(ttl, null), 600);
  assert.match(fonte, /next\[item\.key\] = loadedValue\(byKey\[item\.key\], item\.value\)/);
});
