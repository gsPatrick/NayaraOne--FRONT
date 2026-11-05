// M9-D851 — rótulos das permissões em português simples: TODA permissão do catálogo da API (GET /permissions, salvo em
// test/_fixtures/permission-codes.json a partir da pilha local) tem módulo e ação cadastrados; chave desconhecida nunca aparece crua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import RoleForm from "@/components/organisms/RoleForm/RoleForm.js";
import { GROUP_LABELS, ACTION_LABELS, permissionGroupKey, permissionActionKey, groupLabel, actionLabel, permissionLabel, groupPermissions } from "@/lib/rbac/permissionLabels.js";
import { SUBGROUP_LABELS, CODE_ACTION_LABELS } from "@/lib/rbac/permissionLabelData.js";

const CODES = JSON.parse(readFileSync(new URL("./_fixtures/permission-codes.json", import.meta.url), "utf8"));
const CRU = /\b[a-z][a-zA-Z-]*:[a-zA-Z-]+\b/;
const TECNICO = /\b(manage|mass|send|suppression|procurement|killswitch|drilldown|rebuild|bulk|admin|read|create|update|delete)\b/;

test("m9d851 rótulos: o catálogo tem as permissões citadas no achado", () => {
  assert.ok(CODES.length >= 150, `catálogo com ${CODES.length} permissões`);
  for (const code of ["marketing:send:mass", "marketing:suppression:manage", "procurement:read", "procurement:approve"]) assert.ok(CODES.includes(code), code);
});

test("m9d851 rótulos: TODA permissão do catálogo tem módulo e ação cadastrados (nenhuma cai no texto genérico)", () => {
  const semModulo = []; const semAcao = [];
  for (const code of CODES) {
    const group = permissionGroupKey(code);
    if (!GROUP_LABELS[group] && !SUBGROUP_LABELS[group]) semModulo.push(code);
    if (!CODE_ACTION_LABELS[code] && !ACTION_LABELS[permissionActionKey(code)]) semAcao.push(code);
  }
  assert.deepEqual(semModulo, [], `sem rótulo de módulo: ${semModulo.join(", ")}`);
  assert.deepEqual(semAcao, [], `sem rótulo de ação: ${semAcao.join(", ")}`);
});

test("m9d851 rótulos: nenhum rótulo tem chave técnica ou palavra em inglês", () => {
  for (const code of CODES) {
    const label = permissionLabel(code);
    assert.doesNotMatch(label, CRU, `${code} -> ${label}`);
    assert.doesNotMatch(label, TECNICO, `${code} -> ${label}`);
  }
  assert.equal(permissionLabel("marketing:send:mass"), "Marketing — envio de mensagens: Enviar em massa");
  assert.equal(permissionLabel("marketing:suppression:manage"), "Marketing — lista de bloqueio: Gerenciar");
  assert.equal(permissionLabel("procurement:approve"), "Compras: Aprovar");
});

test("m9d851 rótulos: chave desconhecida vira texto legível, nunca 'chave:acao' crua", () => {
  assert.equal(groupLabel("marketing:novidade"), "Marketing — outros recursos");
  assert.equal(groupLabel("governance:coisa:nova"), "Governança — outros recursos");
  assert.equal(groupLabel("modulo_que_nao_existe"), "Outro módulo");
  assert.equal(actionLabel("frobnicate"), "Ação específica");
  for (const code of ["xyz:abc", "marketing:foo:bar", "a:b:c:d"]) assert.doesNotMatch(permissionLabel(code), CRU, code);
});

test("m9d851 rótulos: a matriz de Papéis com o catálogo inteiro não mostra nenhuma chave crua", () => {
  const catalog = CODES.map((code, i) => ({ id: `p${i}`, code, description: "" }));
  const out = html(RoleForm, { mode: "create", catalog, onSubmit() {}, onCancel() {} }).replace(/ (title|data-[a-z-]+|class|id|for|name|value)="[^"]*"/g, "");
  const visivel = out.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visivel, CRU);
  assert.match(visivel, /Marketing — envio de mensagens/);
  assert.match(visivel, /Enviar em massa/);
  assert.match(visivel, /Compras/);
  assert.equal(groupPermissions(catalog).filter((g) => g.label === g.groupKey).length, 0);
});
