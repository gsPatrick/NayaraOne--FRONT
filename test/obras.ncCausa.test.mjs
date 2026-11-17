// DI-BI2-8 (resposta de 16/11/2026) — causa opcional da não conformidade na abertura e no fechamento (tela de qualidade da obra). Antes não havia como informar a causa:
// o indicador de recorrência por causa (M9:794) ficava 100% "causa não informada". A normalização é a mesma da API (nonconformityCause.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NC_CAUSE_MAX, normalizeCause, causePayload, causeLabel } from "@/app/painel/obras/lista/[id]/qualidade/ncCause.js";

const PAGE = new URL("../app/painel/obras/lista/[id]/qualidade/page.js", import.meta.url);

test("DI-BI2-8 a causa é aparada, em maiúsculas e com até 64 caracteres; vazia não vai no corpo (não apaga a causa da abertura)", () => {
  assert.equal(normalizeCause("  infiltracao "), "INFILTRACAO");
  assert.equal(normalizeCause("x".repeat(80)).length, NC_CAUSE_MAX);
  assert.deepEqual(causePayload(" infiltracao"), { causeCode: "INFILTRACAO" });
  assert.deepEqual(causePayload("   "), {});
  assert.deepEqual(causePayload(undefined), {});
  assert.equal(causeLabel({ causeCode: "INFILTRACAO" }), "Causa: INFILTRACAO");
  assert.equal(causeLabel({ causeCode: null }), "Causa não informada");
});

test("DI-BI2-8 a tela manda a causa na abertura e no fechamento e mostra a causa na lista", () => {
  const src = fs.readFileSync(PAGE, "utf8");
  assert.match(src, /createNonconformity\(project\.id, \{[\s\S]*?\.\.\.causePayload\(ncForm\.causeCode\),[\s\S]*?\}\)/, "abertura");
  assert.match(src, /closeNonconformity\(closingNc\.id, \{[\s\S]*?\.\.\.causePayload\(ncCloseCause\),[\s\S]*?\}\)/, "fechamento");
  assert.match(src, /htmlFor="m-nc-cause"/);
  assert.match(src, /htmlFor="m-nc-close-cause"/);
  assert.match(src, /causeLabel\(nc\)/, "a lista mostra a causa");
  assert.doesNotMatch(src.slice(src.indexOf('htmlFor="m-nc-cause"') - 200, src.indexOf('htmlFor="m-nc-cause"') + 50), /required/, "a causa é opcional");
});
