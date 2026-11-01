// M9-D870 (reabertura F05) — alteração de feature flag e de configuração com responsável aparece em Atividades com a chave, o antes e o depois e a versão.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activityTitle, collapseRepeated } from "@/lib/audit/activityPresent.js";
import { entityTypeLabel } from "@/lib/audit/labels.js";

const KEY = "qa.m9.flag_teste";
const base = { userId: "u1", action: "governance.flag.changed", entityType: "governance.feature_flag", entityId: "f1" };
const criada = { ...base, id: "1", beforeJson: null, afterJson: { key: KEY, value: false, version: 1 }, reason: "Chave criada no registro." };
const alterada = { ...base, id: "2", beforeJson: { key: KEY, value: false, version: 1 }, afterJson: { key: KEY, value: true, version: 2 }, reason: "Liberar o piloto." };

test("m9d870 Atividades: flag criada e alterada mostram a chave, o antes e o depois e a versão, uma linha por ato", () => {
  assert.equal(activityTitle(criada), `${KEY}: criada com valor desligado (versão 1)`);
  assert.equal(activityTitle(alterada), `${KEY}: alterado de desligado para ligado (versão 2). Liberar o piloto.`);
  assert.equal(collapseRepeated([alterada, criada]).length, 2, "criação e alteração são atos diferentes");
});

test("m9d870 Atividades: o tipo da flag tem nome legível e o registro sem chave não quebra", () => {
  assert.equal(entityTypeLabel("governance.feature_flag"), "Feature flag (chave de funcionalidade)");
  assert.equal(entityTypeLabel("governance.config_entry"), "Configuração com responsável");
  assert.match(activityTitle({ ...alterada, beforeJson: { value: 1 }, afterJson: { value: 2 } }), /^Chave de funcionalidade: alterado de 1 para 2/);
});
