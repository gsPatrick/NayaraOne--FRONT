// M9-D643/D654/D662 (reabertura F08) — painéis Locação, Obras, Estoque, Pós-obra, Jurídico e Correspondente: a falta de permissão usa a tela comum,
// o texto visível não traz código de métrica, de read model ou nome técnico, e o "Dado incompleto" explica o motivo e a última atualização.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { classifyFailure, UI_STATE } from "@/lib/asyncState/states.js";
import BiMetricCard from "@/components/molecules/analytics/BiMetricCard/BiMetricCard.js";
import BiBarsWidget from "@/components/molecules/analytics/BiBarsWidget/BiBarsWidget.js";
import BiTableWidget from "@/components/molecules/analytics/BiTableWidget/BiTableWidget.js";
import { metricTooltip, incompleteReason } from "@/lib/analytics/panelText.js";

const PAINEIS = {
  rental: ["rent.active_contracts", "rent.guarantees_expiring", "rent.satisfaction"],
  construction: ["obra.delays", "obra.projected_margin", "obra.waste"],
  inventory: ["inv.stock_value", "inv.losses"],
  postwork: ["obra.postwork_cost", "obra.recurrence"],
  legal: ["legal.deadlines", "legal.values", "legal.missing_documents"],
  correspondent: ["cor.cases_by_stage", "cor.commission"],
};
const failure = (status, extra = {}) => Object.assign(new Error("falhou"), { status, ...extra });
const metric = (code, extra = {}) => ({ metricCode: code, name: "Financing cases por estágio", version: 1, value: null, formatted: null, incomplete: true, incompleteText: "Dado incompleto", status: "INCOMPLETE", valueNatureLabel: "Real", quality: { checks: [], inheritedFrom: [] }, freshness: { state: "UNKNOWN", label: "Ainda sem atualização" }, ...extra });
const widget = (code, type, extra = {}) => ({ position: 2, type, metricCode: code, title: "Título em português", metric: metric(code, extra), view: { series: [], items: [], facts: [] }, config: {}, drilldown: { enabled: false, allowed: false } });
const Component = { KPI_CARD: BiMetricCard, BAR: BiBarsWidget, TABLE: BiTableWidget };
const CODIGO = /[a-z]{2,}\.[a-z_]{3,}|\brm_|\bRm /;
const semDicas = (out) => out.replace(/ (title|data-[a-z-]+)="[^"]*"/g, "");

test("m9d643 m9d654 m9d662 403 de qualquer painel mostra a mesma tela comum de falta de permissão", () => {
  const telas = Object.keys(PAINEIS).map((painel) => {
    const error = failure(403, { code: "PERMISSION_DENIED", details: { required: painel === "rental" ? "legal:read" : "analytics:read" } });
    assert.equal(classifyFailure(error), UI_STATE.PERMISSION_DENIED);
    return html(AsyncState, { result: { status: classifyFailure(error), error } });
  });
  for (const out of telas) {
    assert.match(out, /Você não tem acesso a esta área\./);
    assert.match(out, /data-ui-state="permission-denied"|data-ui-state="PERMISSION_DENIED"/i);
    assert.doesNotMatch(out, /Permissão ausente:/, "sem o alerta próprio do painel");
  }
  assert.equal(new Set(telas.map((t) => t.replace(/<p[^>]*>Falta a permissão[^<]*<\/p>/, ""))).size, 1, "todos os painéis desenham a mesma tela");
});

test("m9d643 m9d654 m9d662 o painel genérico usa o estado comum e não um alerta próprio no 403", () => {
  const fonte = readFileSync(new URL("../components/organisms/BiDashboard/BiDashboard.js", import.meta.url), "utf8");
  assert.match(fonte, /<AsyncState result=\{\{ status: classifyFailure\(error\)/);
  assert.doesNotMatch(fonte, /<Alert tone="danger">\{error\}/);
});

test("m9d643 m9d654 m9d662 o texto visível dos cartões não traz código de métrica, de read model nem 'Rm ' fora da dica", () => {
  for (const [painel, codigos] of Object.entries(PAINEIS)) {
    for (const code of codigos) {
      for (const [type, Cmp] of Object.entries(Component)) {
        const out = html(Cmp, { widget: widget(code, type), users: {}, projects: {}, centers: {} });
        assert.doesNotMatch(semDicas(out), CODIGO, `${painel} ${code} ${type}`);
        assert.match(out, new RegExp(`title="Título em português \\(${code.replace(".", "\\.")}\\), versão 1"`), "o código só aparece na dica, com o rótulo em português (nunca o nome técnico do catálogo)");
      }
    }
  }
});

test("m9d643 m9d654 m9d662 dica sem versão publicada não vira o código cru", () => {
  const w = widget("legal.values", "KPI_CARD");
  w.metric.version = null;
  assert.equal(metricTooltip(w, w.metric), "Título em português (legal.values), sem versão publicada");
});

test("m9d643 m9d654 m9d662 Dado incompleto explica o motivo e a última atualização", () => {
  const nunca = incompleteReason(metric("rent.vacancy"));
  assert.match(nunca, /ainda não foi gravado/);
  assert.match(nunca, /Última atualização: nenhuma até agora\./);
  const reprovou = incompleteReason(metric("rent.vacancy", { quality: { checks: [{ checkCode: "x" }], inheritedFrom: [] }, refreshedAt: "2026-10-28T12:00:00.000Z", freshness: { state: "STALE" } }));
  assert.match(reprovou, /Uma verificação de qualidade reprovou/);
  assert.match(reprovou, /Última atualização: 28\/10\/2026/);
  assert.doesNotMatch(reprovou + nunca, CODIGO);
  for (const [type, Cmp] of Object.entries(Component)) {
    const out = html(Cmp, { widget: widget("obra.delays", type), users: {}, projects: {}, centers: {} });
    assert.match(out, /data-bi-reason/, type);
    assert.match(out, />Dado incompleto</);
  }
  assert.equal(incompleteReason({ incomplete: false }), null);
});
