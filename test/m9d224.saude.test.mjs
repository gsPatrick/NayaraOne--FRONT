// M9-D224 (reabertura F11) — painel Integrações: saúde sem texto repetido, avisos que dizem o que fazer e mensagem de vazio que quebra linha.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { html } from "./_loader/render.mjs";
import Table from "@/components/organisms/Table/Table.js";
import { formatLatency, COTA_NAO_INFORMADA, SEM_SINCRONIZACAO } from "@/app/painel/integracoes/saude/saudeFormat.js";

const ROOT = new URL("..", import.meta.url).pathname;
const ler = (rel) => fs.readFileSync(`${ROOT}${rel}`, "utf8");

test("m9d224 latencia sem chamadas mostra o aviso uma vez só", () => {
  assert.equal(formatLatency(null, null), "Sem chamadas");
  assert.equal(formatLatency(undefined, undefined), "Sem chamadas");
  assert.equal(formatLatency(120, 800), "120 ms / 800 ms");
  assert.ok(!/Sem chamadas.*Sem chamadas/.test(formatLatency(null, null)));
});

test("m9d224 avisos de cota e de sincronização dizem o que fazer", () => {
  assert.match(COTA_NAO_INFORMADA, /nada a fazer/);
  assert.match(SEM_SINCRONIZACAO, /rode o fluxo/);
  const page = ler("app/painel/integracoes/saude/page.js");
  assert.ok(!page.includes("Fornecedor não informa") && !page.includes("Nunca sincronizou"));
});

test("m9d224 mensagem de vazio da tabela larga fica presa à borda e quebra linha", () => {
  const out = html(Table, { columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }], rows: [], minWidth: 1500, emptyMessage: "Nenhuma integração cadastrada para este ambiente." });
  assert.match(out, /Nenhuma integração cadastrada para este ambiente\./);
  assert.match(out, /class="[^"]*emptyText/);
  const css = ler("components/organisms/Table/Table.module.css");
  const bloco = css.slice(css.indexOf(".emptyText"));
  assert.match(bloco, /position:\s*sticky/);
  assert.match(bloco, /white-space:\s*normal/);
  assert.ok(!/overflow:\s*hidden|text-overflow/.test(bloco.slice(0, bloco.indexOf("}"))));
});

test("m9d224 regra de escolha do registro tem ajuda e ocupa a linha inteira", () => {
  const tab = ler("app/painel/configuracoes/integracoesEscolhaGroups.js") + ler("app/painel/configuracoes/IntegracoesRegistroTab.js");
  assert.match(tab, /label: "Regra de escolha",\s*helper:/);
  assert.match(tab, /className="formGridFull">\s*<FormField label=\{field\.label\}/);
});
