// DI-BI2-2 e DI-BI2-10 (resposta de 16/11/2026) — aba "BI e Centro de Comando" em Configurações:
//  - o grupo "Conferências que só avisam" oferece uma chave por verificação (analytics.qualidade.completude_bloqueia.<código>), booleana, desligada por padrão,
//    só para as verificações em que o livro não exige o campo; mesmas chaves e padrões da API e de Maturacao/demandas/parametros.csv;
//  - todo owner padrão dos indicadores mostrado na tela usa um papel do catálogo único ("Área (papel código)", sem acento no código).
// A conferência com a API e com o catálogo roda quando o repositório irmão está ao lado; sem ele, só a parte do Front.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { BI_QUALIDADE_GROUPS } from "@/app/painel/configuracoes/biQualidadeGroups.js";
import { CONFERENCIAS_SO_AVISAM } from "@/app/painel/configuracoes/biConferenciasSoAvisam.js";

const require = createRequire(import.meta.url);
const here = (p) => new URL(p, import.meta.url).pathname;
const API_ROOT = ["../../API", "../../NayaraOne--API"].map(here).find((p) => fs.existsSync(`${p}/src/features/analytics/quality/quality.settings.js`));
const CSV = ["../../Maturacao/demandas/parametros.csv", "../../../Maturacao/demandas/parametros.csv"].map(here).find((p) => fs.existsSync(p));
const CONFIG_DIR = here("../app/painel/configuracoes/");

// Catálogo de papéis de owner (o mesmo de NayaraOne--API/src/features/analytics/read-models/owner.roles.js).
const OWNER_ROLES = {
  "financeiro-gestor": "Diretoria Financeira",
  "comercial-gestor": "Gerência Comercial",
  "locacao-gestor": "Gerência de Locação",
  "obras-gestor": "Diretoria de Obras",
  "estoque-gestor": "Almoxarifado",
  "juridico-gestor": "Jurídico",
  "correspondente-gestor": "Correspondente Bancário",
  "marketing-gestor": "Marketing",
  "atendimento-gestor": "Atendimento",
  "ti-gestor": "Tecnologia",
};
const SO_AVISAM = ["project_nonconf_cause_code_completeness", "project_occurrences_cause_code_completeness", "rental_insp_keys_contract_id_completeness"];

function csvRows() {
  const text = fs.readFileSync(CSV, "utf8");
  return text.split("\n").slice(1).filter(Boolean).map((line) => (line.match(/"((?:[^"]|"")*)"/g) || []).map((c) => c.slice(1, -1).replace(/""/g, '"')));
}

test("DI-BI2-2 cada verificação que só avisa tem a sua chave booleana, desligada por padrão, com o motivo do livro", () => {
  const group = BI_QUALIDADE_GROUPS.find((g) => g.title === "Conferências que só avisam (o livro não exige o campo)");
  assert.ok(group, "grupo na aba do BI");
  assert.deepEqual(CONFERENCIAS_SO_AVISAM.map((c) => c.codigo), SO_AVISAM, "só os itens 6 e 11 do plano (o livro não exige o campo)");
  assert.deepEqual(group.fields.map((f) => [f.key, f.type, f.defaultValue]), SO_AVISAM.map((c) => [`analytics.qualidade.completude_bloqueia.${c}`, "boolean", false]));
  for (const f of group.fields) assert.match(f.helper, /livro .*Padrão: desligado \(só avisa\)\.$/);
});

test("DI-BI2-2 as chaves e os padrões são os da API (quality.checkSeverity.js)", (t) => {
  if (!API_ROOT) return t.skip("repositório irmão da API ausente");
  const { COMPLETENESS_BLOCK_SETTING_DEFAULTS } = require(`${API_ROOT}/src/features/analytics/quality/quality.checkSeverity.js`);
  const fields = BI_QUALIDADE_GROUPS.flatMap((g) => g.fields).filter((f) => f.key.startsWith("analytics.qualidade.completude_bloqueia."));
  assert.deepEqual(Object.fromEntries(fields.map((f) => [f.key, f.defaultValue])), { ...COMPLETENESS_BLOCK_SETTING_DEFAULTS });
});

test("DI-BI2-2 as três chaves estão no catálogo de parâmetros, booleanas e desligadas", (t) => {
  if (!CSV) return t.skip("Maturacao/demandas/parametros.csv ausente");
  const byKey = new Map(csvRows().map((r) => [r[0], r]));
  for (const code of SO_AVISAM) {
    const row = byKey.get(`analytics.qualidade.completude_bloqueia.${code}`);
    assert.ok(row, `${code} no catálogo`);
    assert.deepEqual([row[1], row[3], row[4]], ["BI e Centro de Comando", "booleano", "Desligado"]);
  }
});

async function ownerFields() {
  const out = [];
  for (const name of fs.readdirSync(CONFIG_DIR).filter((n) => /^bi.*Groups\.js$/.test(n))) {
    const mod = await import(`@/app/painel/configuracoes/${name}`);
    for (const value of Object.values(mod)) {
      if (!Array.isArray(value)) continue;
      for (const group of value) for (const f of (group && group.fields) || []) if (String(f.key).startsWith("analytics.owner.")) out.push({ file: name, ...f });
    }
  }
  return out;
}

test("DI-BI2-10 todo owner padrão da tela aponta para um papel do catálogo, com a área do catálogo", async () => {
  const fields = await ownerFields();
  assert.ok(fields.length >= 70, `owners na tela: ${fields.length}`);
  const wrong = fields.filter((f) => {
    const m = /^(.+) \(papel ([a-z-]+)\)$/.exec(String(f.defaultValue));
    return !m || OWNER_ROLES[m[2]] !== m[1];
  }).map((f) => `${f.file} ${f.key}: ${f.defaultValue}`);
  assert.deepEqual(wrong, [], "antes: jurídico-gestor, locação-gestor, Gestor de Estoque, tecnologia-gestor e ia-gestor");
});

test("DI-BI2-10 o catálogo de papéis da tela é o da API e o padrão de cada owner na tela é o do catálogo de parâmetros", async (t) => {
  const fields = await ownerFields();
  if (API_ROOT) assert.deepEqual(require(`${API_ROOT}/src/features/analytics/read-models/owner.roles.js`).OWNER_ROLES, OWNER_ROLES);
  if (!CSV) return t.skip("Maturacao/demandas/parametros.csv ausente");
  const csv = new Map(csvRows().filter((r) => r[0].startsWith("analytics.owner.")).map((r) => [r[0], r[4]]));
  const differ = fields.filter((f) => csv.has(f.key) && csv.get(f.key) !== f.defaultValue).map((f) => `${f.key}: tela ${f.defaultValue}, catálogo ${csv.get(f.key)}`);
  assert.deepEqual(differ, []);
});
