// M9-D686 (reabertura F01) — contrato Front e API dos parâmetros: o PADRÃO de cada campo das abas de Configurações (o que o Salvar envia) é aceito pelo catálogo de parâmetros
// da API (tipo, limites, lista fechada e validação própria da chave). Sem banco: lê o SETTINGS_SCHEMA do repositório irmão da API.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DIR = new URL("../app/painel/configuracoes/", import.meta.url);
const API = new URL("../../NayaraOne--API/src/features/settings/settings.service.js", import.meta.url).pathname;

function problem(spec, key, value) {
  if (!spec) return "chave desconhecida na API";
  if (spec.type === "number" || spec.type === "integer") {
    if (typeof value !== "number" || Number.isNaN(value)) return "deve ser numérico";
    if (spec.type === "integer" && !Number.isInteger(value)) return "deve ser inteiro";
    if (spec.min !== undefined && value < spec.min) return `abaixo do mínimo ${spec.min}`;
    if (spec.max !== undefined && value > spec.max) return `acima do máximo ${spec.max}`;
    return null;
  }
  if (spec.type === "boolean") return typeof value === "boolean" ? null : "deve ser booleano";
  if (spec.type === "string") {
    if (typeof value !== "string" || value.trim() === "") return "deve ser texto não vazio";
    if (Array.isArray(spec.enum) && !spec.enum.includes(value)) return "fora da lista permitida";
    if (typeof spec.validate === "function") {
      try { spec.validate(key, value); } catch (err) { return err.message; }
    }
    return null;
  }
  return "tipo de schema desconhecido";
}

async function fieldsOf(prefix) {
  const out = [];
  for (const name of fs.readdirSync(DIR).filter((n) => n.startsWith(prefix) && n.endsWith("Groups.js"))) {
    const mod = await import(new URL(name, DIR).href);
    for (const groups of Object.values(mod)) for (const group of groups) for (const field of group.fields) out.push({ file: name, field });
  }
  return out;
}

test("m9d686 o padrão de todo campo das abas de BI é aceito pela API", async () => {
  if (!fs.existsSync(API)) return; // repositório da API ausente: o contrato roda na CI com os dois lados
  const { SETTINGS_SCHEMA } = require(API);
  const fields = await fieldsOf("bi");
  assert.ok(fields.length > 50, `campos de BI encontrados: ${fields.length}`);
  const bad = [];
  for (const { file, field } of fields) {
    const found = problem(SETTINGS_SCHEMA[field.key], field.key, field.type === "number" ? Number(field.defaultValue) : field.defaultValue);
    if (found) bad.push(`${file} ${field.key}: ${found}`);
  }
  assert.deepEqual(bad, []);
});

test("m9d686 os nove semáforos da Saúde Geral: o padrão do Front é o da API e é aceito", async () => {
  if (!fs.existsSync(API)) return;
  const { RULES, HEALTH_DEFAULTS } = require(new URL("../../NayaraOne--API/src/features/analytics/healthSettings.js", import.meta.url).pathname);
  const { BI_SAUDE_GERAL_GROUPS } = await import(new URL("biSaudeGeralGroups.js", DIR).href);
  const fields = new Map(BI_SAUDE_GERAL_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]));
  for (const key of Object.keys(RULES)) {
    assert.ok(fields.has(key), `${key} tem campo na aba`);
    assert.equal(fields.get(key).defaultValue, HEALTH_DEFAULTS[key], `${key}: o padrão da tela é o da API`);
  }
});
