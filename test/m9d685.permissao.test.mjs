// M9-D685/D686 (reabertura C6) — Centro de Comando e Saúde Geral decidem a permissão antes da carga dos dados:
// perfil sem analytics:read vê o aviso na hora, sem spinner, e o conteúdo (que carrega ao montar) nem monta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import AccessGate, { accessStatus } from "@/components/molecules/AccessGate/AccessGate.js";
import CommandCenter from "@/components/organisms/CommandCenter/CommandCenter.js";
import { HealthContent } from "@/components/organisms/HealthDashboard/HealthDashboard.js";

const SPINNER = /role="status"|data-spinner|spinner/i;
const semDicas = (out) => out.replace(/ (title|data-[a-z-]+|class|id|aria-[a-z]+)="[^"]*"/g, "");

test("m9d685 accessStatus decide pela lista do perfil", () => {
  assert.equal(accessStatus("analytics:read", ["analytics:read"]), "allowed");
  assert.equal(accessStatus("analytics:read", ["finance:read"]), "denied");
  assert.equal(accessStatus("analytics:read", []), "denied");
  assert.equal(accessStatus(null, []), "allowed");
});

test("m9d685 sem permissão o aviso aparece de imediato e o conteúdo (a carga dos dados) não monta", () => {
  let montou = 0;
  const Carga = () => { montou += 1; return createElement("p", null, "carregando dados"); };
  const out = html(AccessGate, { permission: "analytics:read", permissions: ["finance:read"], children: createElement(Carga) });
  assert.equal(montou, 0, "a carga não pode montar sem permissão");
  assert.match(out, /data-access-gate="denied"/);
  assert.match(semDicas(out), /Falta a permissão/);
  assert.doesNotMatch(out, /carregando dados/);
});

test("m9d685 com permissão o conteúdo monta", () => {
  let montou = 0;
  const Carga = () => { montou += 1; return createElement("p", null, "carregando dados"); };
  html(AccessGate, { permission: "analytics:read", permissions: ["analytics:read"], children: createElement(Carga) });
  assert.equal(montou, 1);
});

test("m9d685 Centro de Comando com perfil sem permissão mostra o aviso e nenhum spinner", () => {
  const out = html(CommandCenter, { permissions: [] });
  assert.match(out, /data-access-gate="denied"/);
  assert.match(semDicas(out), /Falta a permissão/);
  assert.doesNotMatch(out, SPINNER);
  assert.doesNotMatch(out, /data-bi-panel/);
});

test("m9d686 a página da Saúde Geral usa o conteúdo com a guarda de permissão", () => {
  const fonte = readFileSync(new URL("../components/organisms/HealthDashboard/HealthDashboard.js", import.meta.url), "utf8");
  assert.match(fonte, /<AppShell title=\{title\}>\s*<HealthContent \/>/);
});

test("m9d686 Saúde Geral com perfil sem permissão mostra o aviso e nenhum spinner", () => {
  const out = html(HealthContent, { permissions: ["finance:read"] });
  assert.match(out, /data-access-gate="denied"/);
  assert.match(semDicas(out), /Falta a permissão/);
  assert.doesNotMatch(out, /data-bi-panel/);
  assert.doesNotMatch(out.slice(out.indexOf("data-access-gate")), SPINNER);
});
