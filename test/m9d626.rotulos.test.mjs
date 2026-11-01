// M9-D612/D626/D634 (reabertura F08) — rótulos em português nos painéis de BI: nenhum código de indicador, de read model ou termo em inglês fora da dica.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import BiMetricCard from "@/components/molecules/analytics/BiMetricCard/BiMetricCard.js";
import BiBarsWidget from "@/components/molecules/analytics/BiBarsWidget/BiBarsWidget.js";
import BiTableWidget from "@/components/molecules/analytics/BiTableWidget/BiTableWidget.js";
import BiBanner from "@/components/molecules/analytics/BiBanner/BiBanner.js";
import { METRIC_LABELS, READ_MODEL_LABELS, metricTitle, readModelLabel, ptText } from "@/lib/analytics/ptLabels.js";

const CODIGO = /\b[a-z]{2,}\.[a-z_0-9]{3,}\b|\brm_[a-z_]+|\bRm [a-z]/;
const INGLES = /Freshness|Grounding|\bDLQ\b|Financing|Tool calls|Budget|Opt-out|\bReviews\b|evaluation/;
const semDicas = (out) => out.replace(/ (title|data-[a-z-]+)="[^"]*"/g, "");
const metric = (code) => ({ metricCode: code, name: code, version: 1, value: 1, formatted: "1", incomplete: false, status: "OK", valueNatureLabel: "Real", quality: { checks: [], inheritedFrom: [] }, freshness: { state: "FRESH", label: "Atualizado" } });
const widget = (code, type, title, view = {}) => ({ position: 2, type, metricCode: code, title, metric: metric(code), view: { series: [], items: [], facts: [], ...view }, config: { group: "rm" }, drilldown: { enabled: false, allowed: false } });

test("m9d626 o catálogo cobre todos os indicadores e read models, sem código nem inglês nos rótulos", () => {
  for (const [code, label] of Object.entries(METRIC_LABELS)) { assert.doesNotMatch(label, CODIGO, code); assert.doesNotMatch(label, INGLES, code); }
  for (const [rm, label] of Object.entries(READ_MODEL_LABELS)) { assert.match(rm, /^rm_/); assert.doesNotMatch(label, /_|\brm\b/i, rm); }
  for (const code of ["fin.free_cash", "fin.payables_7d", "crm.leads_by_origin", "crm.broker_conversion", "sup.satisfaction", "legal.values", "tec.freshness"]) assert.ok(METRIC_LABELS[code], code);
});

test("m9d626 título com código cru ou termo em inglês vira o nome em português; título já em português não muda", () => {
  assert.equal(metricTitle("fin.free_cash", "fin.free_cash"), "Caixa livre por empresa");
  assert.equal(metricTitle("fin.free_cash", ""), "Caixa livre por empresa");
  assert.equal(metricTitle("cor.cases_by_stage", "Financing cases por estágio"), "Casos de financiamento por estágio");
  assert.equal(metricTitle("tec.queues_dlq", "Filas e DLQ"), "Filas e fila de falhas");
  assert.equal(metricTitle("crm.visits", "Visitas realizadas"), "Visitas realizadas");
  assert.equal(ptText("Grounding"), "Fundamentação");
  assert.equal(ptText("Freshness dos dados do BI"), "Atualidade dos dados do BI");
});

test("m9d626 read model: 'Rm ai cost' e 'rm_ai_cost' viram a fonte em português; id comum não é tocado", () => {
  assert.equal(readModelLabel("rm_ai_cost"), "Custo de IA");
  assert.equal(readModelLabel("Rm ai cost"), "Custo de IA");
  assert.equal(readModelLabel("Rm tech auth failures"), "Falhas de autenticação");
  assert.equal(readModelLabel("rm_novo_desconhecido"), "Fonte de dado sem nome cadastrado");
  assert.equal(readModelLabel("ate_2000"), null);
});

test("m9d626 painel Tecnologia: linhas por read model, colunas e título sem código nem inglês fora da dica", () => {
  const items = ["rm_ai_cost", "rm_tech_auth_failures", "rm_crm_lead_daily"].map((id) => ({ id, label: id.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), formatted: "5 min", value: 5, cells: [{ key: "idade_min", formatted: "5 min" }] }));
  const view = { items, columns: [{ key: "idade_min", label: "Idade" }, { key: "x", label: "Grounding" }], facts: [{ key: "a", label: "Total na DLQ", formatted: "0" }] };
  const out = semDicas(html(BiTableWidget, { widget: widget("tec.freshness", "TABLE", "Freshness dos dados do BI", view), users: {}, projects: {}, centers: {} }));
  assert.doesNotMatch(out, CODIGO);
  assert.doesNotMatch(out, INGLES);
  assert.match(out, /Custo de IA/);
  assert.match(out, /Leads por dia/);
  assert.match(out, /Atualidade dos dados do BI/);
});

test("m9d626 cartões e barras mostram o nome em português quando a API manda o código como título", () => {
  for (const [Cmp, type] of [[BiMetricCard, "KPI_CARD"], [BiBarsWidget, "BAR"]]) {
    const out = html(Cmp, { widget: widget("fin.free_cash", type, "fin.free_cash"), users: {}, projects: {}, centers: {} });
    assert.match(semDicas(out), /Caixa livre por empresa/);
    assert.doesNotMatch(semDicas(out), CODIGO);
    assert.match(out, /title="Caixa livre por empresa \(fin\.free_cash\), versão 1"/, "o código só na dica");
  }
});

test("m9d626 faixa de qualidade usa o nome do indicador, nunca o código", () => {
  const banner = { visible: true, message: "2 indicadores não estão confiáveis neste painel.", degradedMetrics: [
    { metricCode: "sup.satisfaction", title: "sup.satisfaction", reason: "Dado incompleto" }, { metricCode: "legal.values", title: "legal.values", reason: "Ainda sem atualização" }] };
  const out = html(BiBanner, { widget: { banner } });
  assert.doesNotMatch(semDicas(out), CODIGO);
  assert.match(out, /Satisfação \(CSAT\)/);
  assert.match(out, /Valores estimados e confirmados/);
});

test("m9d626 todos os painéis de BI (Financeiro e Vendas/CRM incluídos) passam pelo mesmo componente e tratam o 403 pelo estado comum", async () => {
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  const base = new URL("../app/painel/analytics/", import.meta.url);
  const pastas = readdirSync(base).filter((n) => existsSync(new URL(`${n}/page.js`, base)) && n !== "saude");
  assert.ok(pastas.includes("financeiro") && pastas.includes("crm"));
  for (const pasta of pastas) {
    const fonte = readFileSync(new URL(`${pasta}/page.js`, base), "utf8");
    assert.match(fonte, /<BiDashboard /, `${pasta} usa o painel genérico`);
    assert.doesNotMatch(fonte, /Permissão ausente|<Alert/, `${pasta} não tem alerta próprio de permissão`);
  }
});
