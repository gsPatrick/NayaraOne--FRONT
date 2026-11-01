// M9-D862 (reabertura F04) — o texto de faixa dos campos inteiros nunca mostra "undefined" nem "NaN".
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { integerRangeText, integerRangeError, integerInRange } from "@/app/painel/configuracoes/settingsFormat.js";

const dir = new URL("../app/painel/configuracoes/", import.meta.url);

async function allIntegerFields() {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "integer" && node.key) out.push(node);
    Object.values(node).forEach(walk);
  };
  for (const f of fs.readdirSync(dir).filter((n) => /Groups\.js$/.test(n))) {
    const mod = await import(`@/app/painel/configuracoes/${f}`);
    Object.values(mod).forEach(walk);
  }
  return out;
}

test("m9d862 faixa só cita o limite que existe", () => {
  assert.equal(integerRangeText({ min: 1 }), "A partir de 1.");
  assert.equal(integerRangeText({ max: 23 }), "Até 23.");
  assert.equal(integerRangeText({ min: 1, max: 365 }), "Entre 1 e 365.");
  assert.equal(integerRangeText({ min: 0, max: 23 }), "Entre 0 e 23.");
  assert.equal(integerRangeText({}), "Número inteiro.");
});

test("m9d862 nenhum campo inteiro de nenhum grupo gera faixa ou erro com undefined ou NaN", async () => {
  const fields = await allIntegerFields();
  assert.ok(fields.length > 50);
  for (const field of fields) {
    for (const text of [integerRangeText(field), integerRangeError(field)]) {
      assert.ok(!/undefined|NaN|null/.test(text), `${field.key}: ${text}`);
    }
  }
});

test("m9d862 os quatro campos de fila e IA mostram 'A partir de'", async () => {
  const fields = await allIntegerFields();
  for (const key of ["fila_max", "fila_antigos_min", "fila_idade_min"]) {
    const f = fields.find((x) => x.key === `governanca.finops.${key}`);
    assert.match(integerRangeText(f), /^A partir de 1\.$/);
  }
  const ia = fields.find((x) => x.key === "governanca.finops.ia_custo_chamada_centavos");
  assert.equal(integerRangeText(ia), "A partir de 0.");
});

test("m9d862 validação do Salvar usa a mesma regra e não compara com undefined", () => {
  const semMax = { min: 1 };
  assert.equal(integerInRange(5000, semMax), true);
  assert.equal(integerInRange(0, semMax), false);
  assert.equal(integerInRange(1.5, semMax), false);
  assert.equal(integerInRange(NaN, semMax), false);
  assert.equal(integerInRange(400, { min: 1, max: 365 }), false);
  const tab = fs.readFileSync(new URL("GovernancaTab.js", dir), "utf8");
  assert.match(tab, /helper=\{integerRangeText\(field\)\}/);
  assert.doesNotMatch(tab, /\$\{field\.max\}/);
});
