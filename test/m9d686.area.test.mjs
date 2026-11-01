// M9-D686 (reabertura F09) — linha da Saúde Geral: o texto da cor aparece uma vez só, a área sem dado é cinza com "Sem dados suficientes" e o motivo mostra o nome do indicador,
// nunca o código. Renderiza a linha no servidor, sem rede.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import { AreaRow } from "@/components/organisms/HealthDashboard/HealthDashboard.js";

const CODIGO = /\b[a-z]{2,}\.[a-z_0-9]{3,}\b/;
const visivel = (out) => out.replace(/ (data-[a-z-]+|class|id|aria-[a-z]+|href)="[^"]*"/g, "").replace(/<[^>]+>/g, "|");
const area = (over) => ({ key: "COMMERCIAL", label: "Comercial", href: "/painel/analytics/comercial", domains: ["COMMERCIAL"], kpis: [], openAlerts: 1, freshness: null, reasons: [], ...over });

test("m9d686 área sem dado é cinza, com o texto uma vez só e sem código", () => {
  const out = html(AreaRow, { area: area({ noData: true, light: { color: "CINZA", text: "Sem dados suficientes" }, summary: "Sem dados suficientes" }), onDetail: () => {} });
  assert.match(out, /data-health-color="CINZA"/);
  assert.equal((visivel(out).match(/Sem dados suficientes/g) || []).length, 1, "texto da cor duplicado");
  assert.doesNotMatch(out, /Vermelho: ação necessária/);
  assert.ok(!CODIGO.test(visivel(out)));
});

test("m9d686 área vermelha mostra o texto da cor uma vez e o motivo com o nome do indicador", () => {
  const light = { color: "VERMELHO", text: "Vermelho: ação necessária" };
  const out = html(AreaRow, { area: area({ light, summary: light.text, reasons: ["Aprovações financeiras pendentes: ainda sem atualização", "1 alerta crítico aberto"] }), onDetail: () => {} });
  assert.equal((visivel(out).match(/Vermelho: ação necessária/g) || []).length, 1, "texto da cor duplicado");
  assert.match(out, /Aprovações financeiras pendentes: ainda sem atualização/);
  assert.ok(!CODIGO.test(visivel(out)), "código cru no motivo");
});
