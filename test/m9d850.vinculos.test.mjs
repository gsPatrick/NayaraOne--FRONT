// M9-D850 (reabertura F12) — cruzamento de usuários e vínculos com a resposta REAL de GET /memberships (camelCase e snake_case juntos, empresa e papel embutidos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMemberships, NO_MEMBERSHIP_TEXT } from "@/lib/users/memberships.js";

// Forma capturada da API (banco descartável, perfil gestor): o item traz userId e user_id, company{name} e role{name}.
const real = (userId, extra = {}) => ({ id: `m-${userId}`, groupId: "g", companyId: "c", userId, unitId: null, roleId: "r", status: "ACTIVE", user_id: userId, company_id: "c", role: { id: "r", name: "CI LEITURA EM CLARO" }, unit: null, company: { id: "c", name: "CI — Empresa Fictícia A" }, ...extra });

test("m9d850 cruza o usuário com o vínculo pela resposta real e mostra empresa e papel", () => {
  const list = [real("u1"), real("u2")];
  assert.deepEqual(buildMemberships("u1", list), [{ company: "CI — Empresa Fictícia A", role: "CI LEITURA EM CLARO", unit: null }]);
});

test("m9d850 aceita a chave em snake_case e ignora vínculo revogado; sem vínculo ativo a célula diz isso", () => {
  const onlySnake = { ...real("u3"), userId: undefined };
  assert.equal(buildMemberships("u3", [onlySnake]).length, 1);
  assert.equal(buildMemberships("u4", [real("u4", { status: "REVOKED" })]).length, 0);
  assert.equal(buildMemberships("u5", null).length, 0);
  assert.match(NO_MEMBERSHIP_TEXT, /Sem vínculo ativo nesta empresa/);
});

test("m9d850 a tela de Usuários usa o cruzamento único e falha de GET /memberships vira estado de erro, não 'sem vínculo'", () => {
  const fonte = readFileSync(new URL("../app/painel/usuarios/page.js", import.meta.url), "utf8");
  assert.match(fonte, /buildMemberships\(u\.id, apiMemberships/);
  assert.match(fonte, /Promise\.all\(\[apiFetch\("\/users"\), apiFetch\("\/memberships"\)\]\)/, "as duas cargas dentro do padrão de estados: se uma falha, a tela mostra a falha");
  assert.doesNotMatch(fonte, /"Sem vínculo com empresa"/);
});
