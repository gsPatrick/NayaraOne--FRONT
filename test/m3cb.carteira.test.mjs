// Marco 3, livro §18 ("Trocar responsável — Permissão específica + audit"; "Corretor visualizar carteira alheia — Escopo conforme política de
// equipe"): a edição da oportunidade só manda o responsável quando ele muda, com o motivo; a aba CRM de Configurações traz a política da carteira
// com o mesmo catálogo e padrão da API (src/features/crm/carteira/carteira.settings.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildOpportunityEditPatch, ownerChangeError, ownerChanged, REASSIGN_PERMISSION } from "@/app/painel/crm/opportunityEditPatch.js";
import { CARTEIRA_KEY, CRM_FIELDS, CRM_GROUPS } from "@/app/painel/configuracoes/crmGroups.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const opp = { id: "o1", ownerUserId: "u-a" };
const form = (over = {}) => ({ nextAction: " Ligar ", nextActionDueAt: "", ownerUserId: "u-a", ownerChangeReason: "", temperature: "", expectedValue: "1500,50", ...over });

test("m3 CAD-18: sem troca de responsável, o PATCH não leva ownerUserId (nem o motivo)", () => {
  const patch = buildOpportunityEditPatch(form(), opp);
  assert.equal("ownerUserId" in patch, false);
  assert.equal("ownerChangeReason" in patch, false);
  assert.equal(patch.nextAction, "Ligar");
  assert.equal(patch.expectedValue, 1500.5, "valor com vírgula convertido por toNumber");
  assert.equal(ownerChangeError(form(), opp), "");
});

test("m3 CAD-18: trocar o responsável exige o motivo (mínimo 5 caracteres) e manda os dois campos", () => {
  assert.equal(ownerChanged(form({ ownerUserId: "u-b" }), opp), true);
  assert.match(ownerChangeError(form({ ownerUserId: "u-b", ownerChangeReason: "abc" }), opp), /motivo da troca de responsável \(mínimo 5/);
  assert.match(ownerChangeError(form({ ownerUserId: "" }), opp), /novo responsável/);
  const ok = form({ ownerUserId: "u-b", ownerChangeReason: "  Corretor saiu de férias  " });
  assert.equal(ownerChangeError(ok, opp), "");
  const patch = buildOpportunityEditPatch(ok, opp);
  assert.equal(patch.ownerUserId, "u-b");
  assert.equal(patch.ownerChangeReason, "Corretor saiu de férias");
});

test("m3 CAD-18: a tela trava o responsável sem a permissão de troca e mostra o campo do motivo só quando ele muda", () => {
  assert.equal(REASSIGN_PERMISSION, "crm:opportunities:reassign");
  const page = read("app/painel/crm/page.js");
  assert.match(page, /useHasPermission\(REASSIGN_PERMISSION\)/);
  assert.match(page, /disabled=\{!canReassign\}/);
  assert.match(page, /ownerChanged\(form, opportunity\) \?/);
  assert.match(page, /buildOpportunityEditPatch\(form, opportunity\)/);
  assert.doesNotMatch(page, /ownerUserId: form\.ownerUserId \|\| null,\n\s+temperature/, "o PATCH antigo (que sempre mandava o responsável) saiu");
});

test("m3 CRM-TS-012: a aba CRM traz a política da carteira com o catálogo e o padrão da API, em português", () => {
  assert.deepEqual(CRM_FIELDS.map((f) => f.key), [CARTEIRA_KEY]);
  const field = CRM_FIELDS[0];
  assert.equal(field.key, "crm.carteira.registro_sem_oportunidade");
  assert.equal(field.defaultValue, "CLIENTE_DA_CARTEIRA");
  assert.deepEqual(field.options.map((o) => o.value), ["CLIENTE_DA_CARTEIRA", "SOMENTE_PROPRIOS"]);
  for (const text of [CRM_GROUPS[0].title, CRM_GROUPS[0].subtitle, field.label, field.helper, ...field.options.map((o) => o.label)]) {
    assert.doesNotMatch(text, /crm\.|_|undefined/, text);
  }
  assert.match(field.helper, /^Padrão: /);
  const pagina = read("app/painel/configuracoes/page.js");
  assert.match(pagina, /\{ label: "CRM", content: <CrmTab \/> \}/);
  assert.match(read("app/painel/configuracoes/CrmTab.js"), /listSettings\("crm\."\)/);
});
