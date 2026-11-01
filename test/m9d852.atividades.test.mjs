// M9-D852 (reabertura F05) — a tela de Atividades mostra uma linha por ato, com "de X para Y" e sem chave técnica.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { activityTitle, activitySearchText, collapseRepeated } from "@/lib/audit/activityPresent.js";
import { entityTypeLabel } from "@/lib/audit/labels.js";
import { allSettingLabels } from "@/lib/settings/allLabels.js";

const KEY = "governanca.dlp.classificacao_padrao";
const criada = { id: "1", userId: "u1", action: "settings.create", entityType: "TenantSetting", entityId: "e1", beforeJson: null, afterJson: { key: KEY, value: "INTERNA" }, reason: `Configuração "${KEY}" criada para o tenant.` };
const atualizada = { id: "2", userId: "u1", action: "settings.update", entityType: "TenantSetting", entityId: "e1", beforeJson: { key: KEY, value: "INTERNA" }, afterJson: { key: KEY, value: "CONFIDENCIAL" }, reason: `Configuração "${KEY}" atualizada para o tenant.` };
const formatos = { id: "3", userId: "u1", action: "settings.create", entityType: "TenantSetting", entityId: "e2", beforeJson: null, afterJson: { key: "governanca.dlp.exportacao.formatos", value: ["csv", "xlsx"] }, reason: "x" };

test("m9d852 parâmetro mostra o rótulo e o valor antes e depois, sem a chave técnica", () => {
  const a = activityTitle(atualizada);
  const c = activityTitle(criada);
  for (const t of [a, c]) assert.ok(!t.includes("governanca.") && !t.includes("_padrao"), t);
  assert.ok(a.includes("alterado de") && a.includes("para"), a);
  assert.ok(c.includes("definido pela primeira vez"), c);
  assert.notEqual(a, c);
});

test("m9d852 lista de formatos aparece legível e a busca não usa a chave técnica", () => {
  const t = activityTitle(formatos);
  assert.ok(!t.includes("governanca."), t);
  assert.match(t, /csv, xlsx/);
  assert.ok(!activitySearchText(atualizada, "Ana").includes("governanca.dlp"));
});

test("m9d852 rótulo vem das abas de configuração", () => {
  assert.ok(Object.keys(allSettingLabels()).length > 200);
  assert.ok(allSettingLabels()["governanca.finops.fila_max"]);
});

test("m9d852 tipo de entidade técnico nunca aparece cru", () => {
  assert.equal(entityTypeLabel("analytics.alert_instance"), "Alerta de indicador");
  for (const raw of ["analytics.novo_tipo", "DataClassification", "some_thing"]) {
    const label = entityTypeLabel(raw);
    assert.ok(!/[._]|[a-z][A-Z]/.test(label), label);
  }
});

test("m9d852 linhas repetidas do sistema viram uma só com a contagem", () => {
  const sys = (id) => ({ id, userId: null, action: "analytics.alert.evaluate", entityType: "analytics.alert_instance", entityId: "a1", reason: "Alerta avaliado." });
  const out = collapseRepeated([sys("1"), sys("2"), sys("3"), atualizada, sys("4")]);
  assert.equal(out.length, 3);
  assert.equal(out[0].repeticoes, 3);
  assert.equal(out[2].repeticoes, 1);
  assert.equal(collapseRepeated([atualizada, criada]).length, 2);
});

test("m9d852 todo arquivo de grupos de configuração está no registro de rótulos", () => {
  const dir = new URL("../app/painel/configuracoes/", import.meta.url);
  const reg = fs.readFileSync(new URL("../lib/settings/allLabels.js", import.meta.url), "utf8");
  for (const f of fs.readdirSync(dir).filter((n) => /Groups\.js$/.test(n))) {
    assert.ok(reg.includes(`configuracoes/${f.replace(/\.js$/, "")}"`), `${f} fora de lib/settings/allLabels.js`);
  }
});

test("m9d852 a tela de Atividades usa a apresentação e filtra por entidade no servidor", () => {
  const page = fs.readFileSync(new URL("../app/painel/atividades/page.js", import.meta.url), "utf8");
  assert.match(page, /activityTitle\(row\)/);
  assert.match(page, /collapseRepeated\(matching\)/);
  assert.match(page, /listAuditLog\(entityFilter \? \{ entityType: entityFilter \} : \{\}\)/);
});
