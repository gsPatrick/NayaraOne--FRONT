// Marco 3 — Imóveis (verificação independente de 11/11/2026): documento e mídia com arquivo real, condições da oferta, preço
// mínimo confidencial só com properties:internal, parâmetros do gate de publicação e unidades com alteração e inativação.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { html } from "./_loader/render.mjs";
import { planDocumentation } from "@/lib/properties/documentPlan.js";
import { buildOfferPayload, isValidAskingPrice } from "@/lib/properties/offerPayload.js";
import { KEYS, DEFAULTS, DOCUMENT_TYPE_OPTIONS, FIELD_OPTIONS, parseList, serializeList, validate } from "@/lib/settings/imoveisCrm.js";
import { runSave, fileIdentities } from "@/app/painel/imoveis/novo/saveProgress.js";
import OfferExtraFields from "@/components/organisms/OfferExtraFields/OfferExtraFields.js";
import OfferHistoryList from "@/components/organisms/PropertyFilesPanel/OfferHistoryList.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const arquivo = (name) => ({ name, size: 10, lastModified: 1 });

test("m3im documentação: dado sem arquivo não é salvo e volta como pendência (a matrícula também vive no imóvel)", () => {
  const plan = planDocumentation({ iptuNumber: "021.045", condoFee: "1.200,50", registryNumber: "84.320", regularizationStatus: "" }, {}, []);
  assert.deepEqual(plan.rows, []);
  assert.deepEqual(plan.missingFiles.map((m) => m.type), ["IPTU", "CONDO_FEE"]);
});

test("m3im documentação: arquivo novo substitui a linha do tipo; sem arquivo novo reaproveita o anexado só se o dado mudou", () => {
  const existing = [{ id: "d1", documentType: "IPTU", fileId: "f1", valueNumber: "021.045" }, { id: "d2", documentType: "REGISTRY", fileId: null, valueNumber: "1" }];
  const novo = arquivo("matricula.pdf");
  const plan = planDocumentation({ iptuNumber: "021.045", registryNumber: "84.320", condoFee: "1.200,50" }, { REGISTRY: novo, CONDO_FEE: arquivo("boleto.pdf") }, existing);
  const por = Object.fromEntries(plan.rows.map((r) => [r.type, r]));
  assert.equal(por.IPTU, undefined, "IPTU igual e já anexado: nada a fazer");
  assert.equal(por.REGISTRY.file, novo);
  assert.deepEqual(por.REGISTRY.replaceIds, ["d2"]);
  assert.equal(por.CONDO_FEE.payload.valueAmount, 1200.5, "valor BR convertido com toNumber");
  const mudou = planDocumentation({ iptuNumber: "999" }, {}, existing);
  assert.equal(mudou.rows[0].reuseFileId, "f1");
  assert.deepEqual(mudou.rows[0].replaceIds, ["d1"]);
});

test("m3im oferta: preço do DecimalInput, condições e preço mínimo só para quem tem properties:internal", () => {
  const offer = { offerType: "SALE", askingPrice: "150.000,50", confidentialMinPrice: "140000", conditions: "  Entrada de 20%  ", status: "ACTIVE", validFrom: "", validUntil: "" };
  const semPermissao = buildOfferPayload(offer, { canSeeConfidential: false });
  assert.equal(semPermissao.askingPrice, 150000.5);
  assert.equal(semPermissao.conditions, "Entrada de 20%");
  assert.equal("confidentialMinPrice" in semPermissao, false, "a chave nem vai: a edição de quem não vê nunca apaga o valor");
  assert.equal(buildOfferPayload(offer, { canSeeConfidential: true }).confidentialMinPrice, 140000);
  assert.equal(buildOfferPayload({ ...offer, confidentialMinPrice: "" }, { canSeeConfidential: true }).confidentialMinPrice, null);
  assert.equal(isValidAskingPrice("0"), false);
  assert.equal(isValidAskingPrice("abc"), false);
  assert.equal(isValidAskingPrice("1,5"), true);
});

test("m3im oferta: o campo do preço mínimo só aparece com a permissão; condições sempre", () => {
  const offer = { confidentialMinPrice: "", conditions: "" };
  const sem = html(OfferExtraFields, { idPrefix: "t", offer, onChange: () => {}, canSeeConfidential: false });
  assert.doesNotMatch(sem, /Preço mínimo confidencial/);
  assert.match(sem, /Condições da oferta/);
  assert.match(html(OfferExtraFields, { idPrefix: "t", offer, onChange: () => {}, canSeeConfidential: true }), /Preço mínimo confidencial/);
});

test("m3im oferta: a substituída mostra por qual oferta foi substituída", () => {
  const out = html(OfferHistoryList, { offers: [
    { id: "a", offerType: "SALE", askingPrice: 500000, status: "SUPERSEDED", supersededByOfferId: "b", supersededAt: "2026-11-11T10:00:00Z" },
    { id: "b", offerType: "SALE", askingPrice: 480000, status: "ACTIVE" },
  ] });
  assert.match(out, /Substituída/);
  assert.match(out, /480\.000,00/);
});

test("m3im mídia e documento: a API do Front manda o fileId (nunca storageKey nem qualidade) e sobe o arquivo antes", () => {
  const api = ler("lib/api/properties.js");
  const add = api.slice(api.indexOf("export async function addPropertyMedia"), api.indexOf("export async function uploadPropertyMedia"));
  assert.match(add, /fileId/);
  assert.doesNotMatch(add, /storageKey|qualityStatus:/);
  assert.match(api, /apiFetch\("\/files", \{\s*method: "POST"/);
  assert.match(api, /"property-media"/);
  assert.match(api, /"property-documents"/);
  const ficha = ler("app/painel/imoveis/[id]/page.js");
  assert.match(ficha, /<PropertyDocumentsPanel/);
  assert.match(ficha, /<PropertyMediaManager/);
  assert.match(ficha, /<OfferHistoryList/);
});

test("m3im wizard: a mídia escolhida sobe uma vez só (Tentar novamente não repete) e a documentação recebe os arquivos", async () => {
  const calls = [];
  const api = {
    createProperty: async () => ({ id: "im1" }),
    updateProperty: async () => {},
    saveDocumentation: async (id, docs, files) => { calls.push(["docs", Object.keys(files)]); },
    createOffer: async () => ({ id: "of1" }),
    updateOffer: async () => {},
    addOwner: async () => ({ id: "ow" }),
    updateOwner: async () => {},
    removeOwner: async () => {},
    uploadMedia: async (id, file) => { calls.push(["media", file.name]); if (api.fail && file.name === "b.jpg") throw new Error("falhou"); return { id: `m-${file.name}` }; },
  };
  const plan = { property: { title: "Casa" }, docs: { iptuNumber: "1" }, docFiles: { IPTU: arquivo("iptu.pdf") }, offer: null, owners: [], media: [{ id: "x", file: arquivo("a.jpg") }, { id: "y", file: arquivo("b.jpg") }, { id: "z" }] };
  const holder = { state: null };
  api.fail = true;
  await assert.rejects(runSave(holder, "k1", plan, api));
  api.fail = false;
  calls.length = 0;
  await runSave(holder, "k1", plan, api);
  assert.deepEqual(calls, [["media", "b.jpg"]], "só a mídia que falhou sobe de novo");
  assert.deepEqual(fileIdentities({ IPTU: arquivo("iptu.pdf") }), { IPTU: "iptu.pdf|10|1" });
});

test("m3im configuração: documentos e campos do gate e validade do carrinho, com padrão do comportamento anterior", () => {
  assert.deepEqual(DEFAULTS.documentTypes, ["REGISTRY", "IPTU"]);
  assert.equal(DEFAULTS.cartDays, 7);
  assert.deepEqual(parseList("IPTU,FOTO,REGISTRY", DOCUMENT_TYPE_OPTIONS, DEFAULTS.documentTypes), ["IPTU", "REGISTRY"]);
  assert.deepEqual(parseList("", FIELD_OPTIONS, DEFAULTS.fields), DEFAULTS.fields);
  assert.equal(serializeList(["IPTU", "REGISTRY"], DOCUMENT_TYPE_OPTIONS), "REGISTRY,IPTU");
  assert.deepEqual(Object.keys(validate({ documentTypes: [], fields: [], cartDays: "0" })).sort(), ["cartDays", "documentTypes", "fields"]);
  assert.deepEqual(validate({ documentTypes: ["IPTU"], fields: ["title"], cartDays: "30" }), {});
  assert.equal(KEYS.fields, "real_estate.publication.required_fields");
  const page = ler("app/painel/configuracoes/page.js");
  assert.match(page, /Imóveis e CRM/);
  assert.match(page, /<ImoveisCrmTab \/>/);
});

test("m3im unidades: a ficha da empresa altera e inativa/reativa a unidade pela rota PATCH /units/:id", () => {
  const painel = ler("components/molecules/UnitEditPanel/UnitEditPanel.js");
  assert.match(painel, /method: "PATCH"/);
  assert.match(painel, /status: inactive \? "ACTIVE" : "INACTIVE"/);
  assert.match(painel, /hasPermission\("units:update"\)/);
  assert.match(ler("app/painel/empresas/[id]/page.js"), /<UnitEditPanel unit=\{unit\}/);
  void createElement;
});
