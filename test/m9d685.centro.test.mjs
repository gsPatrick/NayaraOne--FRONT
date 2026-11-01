// M9-D685 (reabertura F10) — Centro de Comando: o bloco adiado diz qual indicador está ruim (nome legível, sem código cru) e a última atualização;
// bloco com itens mostra "Ver todos".
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import CommandBlock from "@/components/organisms/CommandCenter/CommandBlock.js";

const CODIGO = /[a-z]{2,}\.[a-z_]{3,}/;
const base = { key: "PRAZOS", title: "Quais prazos estão críticos", question: "Quais prazos estão críticos?", items: [], total: 0, hiddenText: null, viewAllHref: null };

test("m9d685 bloco adiado traz o nome do indicador, o motivo e a última atualização, sem código", () => {
  const out = html(CommandBlock, { block: { ...base, deferred: true, deferredText: "Conclusão adiada: dado incompleto", reasons: [
    { metricCode: "legal.deadlines", name: "Prazos jurídicos", reason: "Dado incompleto", lastUpdateAt: "2026-10-31T12:00:00Z" },
    { metricCode: "fin.payables_7d", name: "Contas a pagar em 7 dias", reason: "Ainda sem atualização", lastUpdateAt: null },
  ] } });
  assert.match(out, /Prazos jurídicos<\/strong>: Dado incompleto\./);
  assert.match(out, /Última atualização em/);
  assert.match(out, /ainda não foi atualizado/);
  assert.ok(!CODIGO.test(out.replace(/ (data-[a-z-]+|class|id|aria-[a-z]+)="[^"]*"/g, "")), "nenhum código cru de indicador no texto");
});

test("m9d685 bloco com itens mostra o link Ver todos", () => {
  const item = { id: "i1", type: "X", title: "Prazo vencido", severity: "CRITICAL", source: { metricCode: "legal.deadlines" }, link: { href: "/painel/analytics/juridico" } };
  const out = html(CommandBlock, { block: { ...base, deferred: false, items: [item], total: 1, viewAllHref: "/painel/centro-de-comando?bloco=PRAZOS" } });
  assert.match(out, /Ver todos \(1\)/);
});
