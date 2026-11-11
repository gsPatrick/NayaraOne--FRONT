// Marco 3 §14 — tela do carrinho de imóveis (verificação independente de 11/11/2026, CAD-14: "não há tela de carrinho no Front").
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { html } from "./_loader/render.mjs";
import { publicCartUrl, clicksByProperty, selectionError, CART_STATUS_LABELS } from "@/lib/crm/carts.js";
import CartCard from "@/app/painel/crm/carrinhos/CartCard.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const CART = {
  id: "c1", status: "ACTIVE", expiresAt: "2026-11-18T12:00:00Z", createdAt: "2026-11-11T12:00:00Z", currentVersion: 2,
  shareLink: { token: "tok123" },
  versions: [
    { versionNumber: 1, createdAt: "2026-11-11T12:00:00Z", properties: [{ id: "p1", title: "Casa Jardim", internalCode: "C-1" }] },
    { versionNumber: 2, createdAt: "2026-11-11T13:00:00Z", properties: [{ id: "p1", title: "Casa Jardim", internalCode: "C-1" }, { id: "p2", title: "Apto Centro", internalCode: "A-2" }] },
  ],
  tracking: { views: 3, clicks: 2, lastViewedAt: "2026-11-11T14:00:00Z", clicksByProperty: { p2: 2 }, viewsByVersion: { 2: 3 } },
};

test("m3im carrinho: link público, cliques por imóvel da versão enviada e validação da seleção", () => {
  assert.equal(publicCartUrl("https://app.exemplo.com/", "a b"), "https://app.exemplo.com/carrinho/a%20b");
  assert.equal(publicCartUrl("https://x", ""), "");
  assert.deepEqual(clicksByProperty(CART).map((p) => [p.id, p.clicks]), [["p1", 0], ["p2", 2]]);
  assert.equal(selectionError([]), "Selecione ao menos um imóvel.");
  assert.match(selectionError(["p1", "p1"]), /duas vezes/);
  assert.equal(selectionError(["p1"]), "");
  assert.equal(CART_STATUS_LABELS.EXPIRED, "Expirado");
});

test("m3im carrinho: o cartão mostra validade, rastreio, imóveis enviados com cliques, link e histórico de versões", () => {
  const out = html(CartCard, { cart: CART, properties: [], onUpdateItems: async () => true, onShare: async () => true, busy: false });
  assert.match(out, /Ativo/);
  assert.match(out, /Visualizações do link/);
  assert.match(out, />3</);
  assert.match(out, /Apto Centro \(A-2\) — 2 clique\(s\)/);
  assert.match(out, /\/carrinho\/tok123/);
  assert.match(out, /Histórico de versões \(2\)/);
  assert.match(out, /Alterar imóveis/);
  const expirado = html(CartCard, { cart: { ...CART, status: "EXPIRED", shareLink: null }, properties: [], onUpdateItems: async () => true, onShare: async () => true });
  assert.match(expirado, /Expirado/);
  assert.doesNotMatch(expirado, /Gerar link/, "carrinho expirado não gera link novo");
});

test("m3im carrinho: telas ligadas à API (painel do corretor e página pública sem login) e no menu do CRM", () => {
  const page = ler("app/painel/crm/carrinhos/page.js");
  for (const fn of ["listOpportunityCarts", "createCart", "updateCartItems", "generateCartShareLink"]) assert.match(page, new RegExp(fn));
  assert.match(page, /<AsyncState/);
  const api = ler("lib/api/carts.js");
  assert.match(api, /\/opportunities\/\$\{opportunityId\}\/carts/);
  assert.match(api, /skipAuth: true/);
  const publico = ler("app/carrinho/[token]/page.js");
  assert.match(publico, /getPublicCart/);
  assert.match(publico, /clickPublicCartProperty/);
  assert.doesNotMatch(publico, /AppShell/, "a página pública não usa o painel (sem login)");
  assert.match(ler("components/molecules/CrmNavMenu/CrmNavMenu.js"), /\/painel\/crm\/carrinhos/);
  assert.match(ler("app/painel/_nav.js"), /\/painel\/crm\/carrinhos/);
});
