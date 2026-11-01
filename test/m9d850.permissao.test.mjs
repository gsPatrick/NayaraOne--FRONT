// M9-D850 (reabertura F07) — catálogo único código -> nome legível de permissão e a tela de 403 sem números nem código cru.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { permissionName, missingPermissionText } from "@/lib/rbac/permissionName.js";
import { classifyFailure } from "@/lib/asyncState/states.js";
import { NAV_SECTIONS } from "@/app/painel/_nav.js";
import * as routePermissionsModule from "@/lib/rbac/routePermissions.js";

const semDicas = (out) => out.replace(/ (title|data-[a-z-]+)="[^"]*"/g, "");
const forbidden = (required) => Object.assign(new Error("negado"), { status: 403, code: "PERMISSION_DENIED", details: { required } });

test("m9d850 catálogo de permissão: código vira módulo e ação em português, sem expor o código", () => {
  assert.equal(permissionName("properties:read"), "Imóveis: leitura");
  assert.equal(permissionName("crm:opportunities:update"), "CRM — Oportunidades: edição");
  assert.equal(permissionName("analytics:read:tech"), "Painéis de BI: leitura (indicadores técnicos)");
  assert.equal(permissionName("modulo.novo:xyz"), "uma permissão específica");
  assert.equal(permissionName(undefined), "uma permissão específica");
  assert.equal(missingPermissionText("people:read"), "Falta a permissão Contatos (Pessoas): leitura.");
});

test("m9d850 toda permissão cobrada pelo menu tem nome legível (nenhuma cai em 'uma permissão específica')", () => {
  const codes = new Set(NAV_SECTIONS.flatMap((s) => s.items).map((i) => i.permission).filter(Boolean));
  assert.ok(codes.size > 10);
  for (const code of codes) assert.doesNotMatch(permissionName(code), /específica/, code);
});

test("m9d850 403 mostra o aviso com o nome legível e nenhum código de permissão no texto da tela", () => {
  const error = forbidden("properties:read");
  const out = html(AsyncState, { result: { status: classifyFailure(error), error } });
  assert.match(out, /Falta a permissão Imóveis: leitura\./);
  assert.doesNotMatch(semDicas(out), /properties:read/);
  assert.doesNotMatch(semDicas(out), /\b0\b|R\$ 0,00/, "falta de permissão não mostra número nenhum");
});

test("m9d850 tela de lista de contratos: os indicadores só aparecem com o dado carregado (nunca 0 / R$ 0,00 em 403, carga ou erro)", () => {
  const fonte = readFileSync(new URL("../app/painel/contratos/lista/page.js", import.meta.url), "utf8");
  assert.match(fonte, /showKpis/);
  assert.match(fonte, /\{showKpis \? \(\s*<div className=\{styles\.grid\}>/);
});

test("m9d850 menu e tela exigem a mesma permissão: cada filho do menu herda a do item, e as telas do Financeiro só cobram finance:read na carga principal", () => {
  const { getRequiredPermission } = routePermissionsModule;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      for (const child of item.children || []) assert.equal(getRequiredPermission(child.href), item.permission ?? null, child.href);
    }
  }
  const ler = (rel) => readFileSync(new URL(`../app/painel/financeiro/${rel}`, import.meta.url), "utf8");
  for (const rel of ["lancamentos/page.js", "contas-bancarias/page.js"]) {
    const fonte = ler(rel);
    const carga = fonte.slice(fonte.indexOf("Promise.all(["), fonte.indexOf("Promise.all([") + 700);
    assert.match(carga, /listPeople\(\)\.catch\(lookupFallback/, `${rel}: pessoas é apoio`);
  }
  assert.match(ler("lancamentos/page.js"), /listBankAccounts\(\)\.catch\(lookupFallback/);
  assert.match(ler("lancamentos/page.js"), /listCostCenters\(\)\.catch\(lookupFallback/);
});

test("m9d850 Saúde Geral usa o estado comum de falta de permissão como os demais painéis (sem alerta próprio)", () => {
  const fonte = readFileSync(new URL("../components/organisms/HealthDashboard/HealthDashboard.js", import.meta.url), "utf8");
  assert.match(fonte, /<AsyncState result=\{\{ status: classifyFailure\(error\)/);
  assert.doesNotMatch(fonte, /<Alert tone="danger">\{error\}/);
});
