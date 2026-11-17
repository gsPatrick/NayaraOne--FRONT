// Contrato dos arquivos de campos do BI em Configurações: todo export de app/painel/configuracoes/bi*Groups.js é uma LISTA DE GRUPOS, cada grupo com `fields` (lista).
// Quem percorre esses arquivos (o contrato M9-D686 com a API, test/m9d686.contrato.test.mjs) itera todo export como grupos. Em 17/11/2026 o
// biQualidadeGroups.js passou a exportar CONFERENCIAS_SO_AVISAM (lista de conferências, sem `fields`) e o M9-D686 quebrou com "group.fields is not
// iterable" só onde a API está ao lado; este teste pega o mesmo erro sem a API. Constante auxiliar vai para arquivo próprio (biConferenciasSoAvisam.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const DIR = new URL("../app/painel/configuracoes/", import.meta.url);

test("todo export de app/painel/configuracoes/bi*Groups.js é lista de grupos com fields", async () => {
  const arquivos = fs.readdirSync(DIR).filter((n) => /^bi.*Groups\.js$/.test(n));
  assert.ok(arquivos.length > 10, `arquivos de grupos: ${arquivos.length}`);
  const ruins = [];
  for (const nome of arquivos) {
    const mod = await import(new URL(nome, DIR).href);
    for (const [exp, valor] of Object.entries(mod)) {
      if (!Array.isArray(valor)) { ruins.push(`${nome} ${exp}: não é lista`); continue; }
      valor.forEach((g, i) => { if (!g || !Array.isArray(g.fields)) ruins.push(`${nome} ${exp}[${i}]: grupo sem fields`); });
    }
  }
  assert.deepEqual(ruins, []);
});

test("as conferências que só avisam continuam virando os campos do grupo de Qualidade", async () => {
  const { CONFERENCIAS_SO_AVISAM } = await import(new URL("biConferenciasSoAvisam.js", DIR).href);
  const { BI_QUALIDADE_GROUPS } = await import(new URL("biQualidadeGroups.js", DIR).href);
  const chaves = BI_QUALIDADE_GROUPS.flatMap((g) => g.fields).map((f) => f.key).filter((k) => k.startsWith("analytics.qualidade.completude_bloqueia."));
  assert.deepEqual(chaves, CONFERENCIAS_SO_AVISAM.map((c) => `analytics.qualidade.completude_bloqueia.${c.codigo}`));
});
