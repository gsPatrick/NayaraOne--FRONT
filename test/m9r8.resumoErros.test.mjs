// Verificação independente do Marco 9, rodada 8 (12/11/2026), observação do item 5: os erros novos da API (porta da forma, classes 22 e 23 do banco,
// contrato da consulta) trazem `details.fields` como LISTA de nomes. O `fieldErrorsOf` tratava `fields` como mapa e o resumo de erros mostrava o link
// "0" (o índice da lista) ou o nome interno do campo. Agora o resumo mostra o rótulo do campo e a mensagem, sem nome interno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { classifyFailure, fieldErrorsOf } from "@/lib/asyncState/states.js";
// importação por nome do módulo (e não das funções), para que cada teste falhe pelo próprio comportamento na versão anterior, sem a função nova
import * as apiErrors from "@/lib/errors/apiErrors.js";
import { readFileSync } from "node:fs";
import { PERSON_FIELD_IDS } from "@/lib/errors/personWizard.js";

const { humanizeApiError } = apiErrors;
const fieldProblemsForDisplay = (...a) => apiErrors.fieldProblemsForDisplay(...a);
const withFieldLabels = (...a) => apiErrors.withFieldLabels(...a);
const saveErrorText = (...a) => apiErrors.saveErrorText(...a);
const TECH = /legalName|preferredName|nextActionDueAt|campoInternoQualquer|"|[a-z]+[A-Z][A-Za-z]+/;
const erro = (status, code, message, details) => Object.assign(new Error(message), { status, code, details });

// as formas que a API devolve hoje (rodadas 7 e 8)
const PORTA = erro(400, "REQUEST_BODY_TOO_DEEP", 'O campo "legalName" passa da profundidade aceita (64 níveis de objetos ou listas).', { fields: ["legalName"], part: "body", maxDepth: 64 });
const TEXTO_LONGO = erro(400, "VALUE_TOO_LONG", 'O texto do campo "preferredName" passa do tamanho máximo (150 caracteres).', { fields: ["preferredName"], maxLength: 150 });
const DOIS = erro(400, "INVALID_FIELD_VALUE", "Um valor enviado não é válido para o campo.", { fields: ["zipCode", "campoInternoQualquer"] });
const CONSULTA = erro(400, "QUERY_PARAMETER_INVALID", 'O parâmetro "status" da consulta deve ser um texto.', { fields: ["status"], problems: [{ field: "status", message: 'O parâmetro "status" da consulta deve ser um texto.' }], part: "query" });
const ESQUEMA = erro(400, "OPPORTUNITY_VALIDATION", 'O campo "nextActionDueAt" deve ser uma data em texto (AAAA-MM-DD ou data e hora ISO).', { fields: ["nextActionDueAt"], problems: [{ field: "nextActionDueAt", message: 'O campo "nextActionDueAt" deve ser uma data em texto (AAAA-MM-DD ou data e hora ISO).' }] });

test("m9r8 fieldErrorsOf lê details.fields em lista: o nome do campo, nunca o índice da lista", () => {
  assert.deepEqual(fieldErrorsOf(PORTA), [{ field: "legalName", message: PORTA.message }]);
  assert.deepEqual(fieldErrorsOf(DOIS).map((p) => p.field), ["zipCode", "campoInternoQualquer"]);
  assert.deepEqual(fieldErrorsOf(DOIS).map((p) => p.message), ["", ""], "a mensagem do erro não cita o campo: nenhuma mensagem por campo");
  assert.deepEqual(fieldErrorsOf(erro(400, "X", "x", { fields: { zipCode: "invalid" } })), [{ field: "zipCode", message: "invalid" }], "o mapa continua valendo");
});

test("m9r8 resumo: rótulo do campo e mensagem, sem nome interno e sem o índice", () => {
  assert.equal(withFieldLabels('O campo "legalName" passa da profundidade aceita.'), "O campo Nome ou razão social passa da profundidade aceita.");
  assert.deepEqual(fieldProblemsForDisplay(PORTA), [{ field: "legalName", label: "Nome ou razão social", message: "O campo Nome ou razão social passa da profundidade aceita (64 níveis de objetos ou listas)." }]);
  assert.deepEqual(fieldProblemsForDisplay(TEXTO_LONGO).map((p) => p.message), ["O texto do campo Nome de uso passa do tamanho máximo (150 caracteres)."]);
  assert.deepEqual(fieldProblemsForDisplay(DOIS), [
    { field: "zipCode", label: "CEP", message: "Confira o campo CEP." },
    { field: "campoInternoQualquer", label: null, message: "Confira este campo." },
  ]);
  assert.deepEqual(fieldProblemsForDisplay(ESQUEMA).map((p) => [p.label, p.message]), [["Prazo da próxima ação", "O campo Prazo da próxima ação deve ser uma data em texto (AAAA-MM-DD ou data e hora ISO)."]]);
  for (const e of [PORTA, TEXTO_LONGO, DOIS, CONSULTA, ESQUEMA]) {
    for (const p of fieldProblemsForDisplay(e)) assert.doesNotMatch(p.message, TECH, `${e.code}: ${p.message}`);
  }
});

test("m9r8 AsyncState: o resumo do 400 mostra rótulo e mensagem (antes: o link \"0\" ou o nome interno)", () => {
  for (const [e, esperado] of [[PORTA, /Nome ou razão social passa da profundidade aceita/], [DOIS, /CEP/], [ESQUEMA, /Prazo da próxima ação/], [CONSULTA, /Situação/]]) {
    const out = html(AsyncState, { result: { status: classifyFailure(e), error: e } });
    const itens = [...out.matchAll(/<li[^>]*><a href="#error-[^"]*">([^<]*)<\/a><\/li>/g)].map((m) => m[1]);
    assert.ok(itens.length >= 1, `há itens no resumo: ${out}`);
    assert.match(itens.join(" | "), esperado);
    for (const texto of itens) {
      assert.notEqual(texto.trim(), "0");
      assert.doesNotMatch(texto, /^\d+$/);
      assert.doesNotMatch(texto, TECH, texto);
    }
  }
});

test("m9r8 AsyncState: mensagem sem o nome do campo ganha o rótulo na frente; mensagem que já diz o campo fica como veio", () => {
  const semRotulo = erro(400, "PERSON_VALIDATION", "Dados inválidos.", { problems: [{ field: "zipCode", message: "Use 8 números." }] });
  assert.match(html(AsyncState, { result: { status: classifyFailure(semRotulo), error: semRotulo } }), /<a href="#error-zipCode">CEP: Use 8 números\.<\/a>/);
  const comRotulo = erro(422, "VALIDATION_ERROR", "Dados inválidos", { problems: [{ field: "email", reason: "Informe um e-mail válido" }] });
  assert.match(html(AsyncState, { result: { status: classifyFailure(comRotulo), error: comRotulo } }), /<a href="#error-email">Informe um e-mail válido<\/a>/);
});

test("m9r8 humanizeApiError com details.fields em lista aponta o campo certo da tela, com texto humano", () => {
  const r = humanizeApiError(PORTA, PERSON_FIELD_IDS);
  assert.deepEqual(Object.keys(r.fields), ["p-name"]);
  assert.doesNotMatch(r.fields["p-name"] + r.message, TECH);
  const z = humanizeApiError(DOIS, PERSON_FIELD_IDS);
  assert.equal(z.fields["p-zip"], "Confira o campo CEP.");
});

test("m9r8 edição de pessoa: o erro ao salvar diz o rótulo e o limite, marca o campo e não mostra o nome interno (antes: a mensagem crua com \"preferredName\")", () => {
  const e = erro(400, "PERSON_VALIDATION", 'O campo "preferredName" deve ser um texto de até 150 caracteres.', { fields: ["preferredName"], problems: [{ field: "preferredName", message: 'O campo "preferredName" deve ser um texto de até 150 caracteres.' }] });
  const ids = { legalName: "e-name", preferredName: "e-preferred" };
  const t = saveErrorText(e, ids);
  assert.equal(t.message, "O campo Nome de uso deve ser um texto de até 150 caracteres.");
  assert.deepEqual(Object.keys(t.fields), ["e-preferred"]);
  assert.doesNotMatch(t.message + Object.values(t.fields).join(" "), TECH);
  assert.equal(saveErrorText(erro(500, "INTERNAL_ERROR", "Algo deu errado. Informe o código abc ao suporte.", undefined), ids).message, "Algo deu errado. Informe o código abc ao suporte.");
  const fonte = readFileSync(new URL("../app/painel/pessoas/[id]/editar/page.js", import.meta.url), "utf8");
  assert.match(fonte, /saveErrorText\(err, EDIT_FIELD_IDS\)/, "a tela de edição usa o texto humano");
  assert.doesNotMatch(fonte, /setSubmitError\(err\?\.message/, "e não a mensagem crua da API");
});
