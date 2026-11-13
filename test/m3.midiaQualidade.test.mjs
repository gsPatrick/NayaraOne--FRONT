// Revisão de qualidade da mídia do imóvel (livro do Marco 3 §6/§7): a tela de detalhe do imóvel mostra o status da foto e
// deixa aprovar ou recusar (recusa só com motivo), chamando PATCH /properties/:id/media/:mediaId/quality.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MEDIA_QUALITY_LABELS, MEDIA_QUALITY_TONE } from "@/lib/mediaQuality.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("m3 mídia: os três status de qualidade têm rótulo em português e tom", () => {
  assert.deepEqual(Object.keys(MEDIA_QUALITY_LABELS).sort(), ["APPROVED", "PENDING", "REJECTED"]);
  for (const k of Object.keys(MEDIA_QUALITY_LABELS)) assert.ok(MEDIA_QUALITY_TONE[k], k);
  assert.equal(MEDIA_QUALITY_LABELS.APPROVED, "Aprovada");
});

test("m3 mídia: a API do Front revisa pela rota de qualidade e a listagem traz o status", () => {
  const api = ler("lib/api/properties.js");
  assert.match(api, /\/properties\/\$\{propertyId\}\/media\/\$\{mediaId\}\/quality/);
  assert.match(api, /method: "PATCH"/);
  assert.match(api, /qualityStatus: m\.qualityStatus \|\| "PENDING"/);
});

test("m3 mídia: a tela do imóvel mostra a revisão e a recusa exige motivo", () => {
  assert.match(ler("app/painel/imoveis/[id]/page.js"), /<MediaQualityReview/);
  const comp = ler("components/molecules/MediaQualityReview/MediaQualityReview.js");
  assert.match(comp, /disabled=\{reason\.trim\(\)\.length < 3\}/);
  assert.match(comp, /review\("APPROVED"\)/);
});
