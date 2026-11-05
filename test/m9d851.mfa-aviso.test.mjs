// M9-D851 — aviso "MFA exigido e não habilitado": foco, anúncio, link para Meu perfil e "Fechar aviso"; todas as telas usam a mesma regra.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { html } from "./_loader/render.mjs";
import MfaSetupRequiredNotice from "@/components/molecules/MfaSetupRequiredNotice/MfaSetupRequiredNotice.js";
import { isMfaSetupRequired, MFA_SETUP_NOTICE } from "@/lib/errors/mfaSetup.js";

test("m9d851 mfa: o aviso é anunciado (role=alert), focável, com link para Meu perfil e botão de fechar", () => {
  const out = html(MfaSetupRequiredNotice, { onDismiss() {} });
  assert.match(out, /role="alert"/);
  assert.match(out, /tabindex="-1"/);
  assert.match(out, /href="\/painel\/perfil"[^>]*>Ir para Meu perfil</);
  assert.match(out, />Fechar aviso</);
  assert.match(out, new RegExp(MFA_SETUP_NOTICE.title));
  assert.doesNotMatch(out, /MFA_REQUIRED|\/users\/me/);
});

test("m9d851 mfa: regra única do código da API", () => {
  assert.equal(isMfaSetupRequired({ code: "MFA_REQUIRED_NOT_ENABLED" }), true);
  assert.equal(isMfaSetupRequired({ code: "MFA_STEP_UP_REQUIRED" }), false);
  assert.equal(isMfaSetupRequired(null), false);
});

test("m9d851 mfa: toda tela que mostra o aviso usa a regra única e oferece fechar", () => {
  for (const file of ["app/painel/papeis/page.js", "app/painel/papeis/novo/page.js", "app/painel/papeis/[id]/page.js", "app/painel/usuarios/[id]/page.js"]) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /"MFA_REQUIRED_NOT_ENABLED"/, file);
    assert.match(src, /isMfaSetupRequired\(err\)/, file);
    assert.match(src, /<MfaSetupRequiredNotice onDismiss=/, file);
  }
  const lista = readFileSync(new URL("../app/painel/papeis/page.js", import.meta.url), "utf8");
  assert.match(lista, /isMfaSetupRequired\(err\)\) \{[\s\S]{0,200}setDeleteTarget\(null\)/, "excluir: fecha a confirmação antes de mostrar o aviso");
});
