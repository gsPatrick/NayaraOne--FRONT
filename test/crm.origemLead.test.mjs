// Origem do lead obrigatória na nova oportunidade (segunda leva de 16/11/2026, item 7; M9:610 e M9:784; DI-BI2-4): rótulos de todos os
// códigos que a API aceita (com PARTNER), regra do formulário, envio pela lib e o campo obrigatório na tela; ajuda das configurações do funil.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LEAD_SOURCE_LABELS, LEAD_SOURCE_CODES, LEAD_SOURCE_OPTIONS, leadSourceLabel } from "@/lib/labels/leadSource.js";
import { leadSourceError, LEAD_SOURCE_REQUIRED_MESSAGE } from "@/app/painel/crm/opportunityRules.js";
import { createOpportunity } from "@/lib/api/crm.js";
import { MARKETING_FUNIL_GROUPS } from "@/app/painel/configuracoes/marketingFunilGroups.js";

// Espelho de LEAD_SOURCES da API (src/features/marketing/tracking/tracking.catalog.js).
const API_LEAD_SOURCES = ["FORM", "WHATSAPP", "PHONE", "EMAIL", "SITE", "PORTAL", "SOCIAL", "REFERRAL", "PARTNER", "OTHER"];

let chamadas;
beforeEach(() => {
  chamadas = [];
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) }, location: { pathname: "/painel/crm", search: "", href: "" } };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url: String(url), init });
    return { ok: true, status: 201, headers: { get: () => null }, text: async () => JSON.stringify({ success: true, data: { id: "o-1", stage: "NEW" } }) };
  };
});

test("origem do lead: todo código da API tem rótulo em português, PARTNER incluído, e nenhum código cru vai à tela", () => {
  assert.deepEqual(LEAD_SOURCE_CODES, API_LEAD_SOURCES);
  for (const code of API_LEAD_SOURCES) assert.ok(LEAD_SOURCE_LABELS[code] && LEAD_SOURCE_LABELS[code] !== code, code);
  assert.equal(LEAD_SOURCE_LABELS.PARTNER, "Parceiro (API)");
  assert.deepEqual(LEAD_SOURCE_OPTIONS[1], { value: "WHATSAPP", label: "WhatsApp" });
  assert.equal(leadSourceLabel("whatsapp"), "WhatsApp");
  assert.equal(leadSourceLabel(null), "Origem não informada");
});

test("origem do lead: sem origem (ou fora da lista) o formulário não envia", () => {
  assert.equal(leadSourceError(""), LEAD_SOURCE_REQUIRED_MESSAGE);
  assert.equal(leadSourceError(undefined), LEAD_SOURCE_REQUIRED_MESSAGE);
  assert.equal(leadSourceError("FEIRA"), LEAD_SOURCE_REQUIRED_MESSAGE);
  for (const code of API_LEAD_SOURCES) assert.equal(leadSourceError(code), "", code);
});

test("origem do lead: a lib envia leadSource no POST /opportunities", async () => {
  await createOpportunity({ personId: "p-1", ownerUserId: "u-1", stage: "novo", leadSource: "PORTAL", nextAction: "Ligar", nextActionDueAt: "2026-11-20T12:00:00.000Z" });
  const post = chamadas.find((c) => c.url.endsWith("/opportunities") && c.init?.method === "POST");
  assert.ok(post, "houve o POST");
  assert.equal(JSON.parse(post.init.body).leadSource, "PORTAL");
});

test("origem do lead: a tela de nova oportunidade tem o campo obrigatório, confere antes de enviar e manda a origem", () => {
  const src = fs.readFileSync(new URL("../app/painel/crm/page.js", import.meta.url), "utf8");
  assert.match(src, /<FormField label="Origem do lead" htmlFor="o-lead-source" required error=\{errors\.leadSource\}/);
  assert.match(src, /LEAD_SOURCE_OPTIONS\.map/);
  assert.match(src, /if \(leadSourceError\(leadSource\)\) nextErrors\.leadSource = leadSourceError\(leadSource\);/);
  assert.match(src, /ownerUserId,\n\s+leadSource,\n\s+nextAction: nextAction\.trim\(\)/);
});

test("origem do lead: a ajuda das origens do lead novo lista PARTNER e diz que o WhatsApp entra como WHATSAPP", () => {
  const field = MARKETING_FUNIL_GROUPS.flatMap((g) => g.fields).find((f) => f.key === "marketing.lead_novo.origens");
  for (const code of API_LEAD_SOURCES) assert.ok(field.helper.includes(code), code);
  assert.match(field.helper, /PARTNER é o lead que chega pela API de parceiro/);
  assert.match(field.helper, /WhatsApp entra como WHATSAPP/);
});
