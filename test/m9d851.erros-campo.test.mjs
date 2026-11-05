// M9-D851 — erros de formulário em linguagem simples e acessíveis: validação no cliente, mapa central de rótulos, aria-invalid/aria-describedby e resumo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { createElement } from "react";
import { html } from "./_loader/render.mjs";
import { plainMessageProblems } from "@/lib/a11y/plainMessage.js";
import { humanizeApiError, humanizeMessage, quotedFieldNames } from "@/lib/errors/apiErrors.js";
import { validatePersonStep, PERSON_FIELD_IDS } from "@/lib/errors/personWizard.js";
import FormField from "@/components/molecules/FormField/FormField.js";
import Input from "@/components/atoms/Input/Input.js";
import ErrorSummary from "@/components/molecules/ErrorSummary/ErrorSummary.js";

const TECH = /groupId|companyId|legalName|taxIdNormalized|[a-z]+[A-Z][A-Za-z]+|"/;
const dom = (markup) => new JSDOM(`<!doctype html><html lang="pt-BR"><body>${markup}</body></html>`, { virtualConsole: new VirtualConsole() }).window.document;

test("m9d851 a mensagem crua da API (groupId, companyId, legalName) vira texto humano, sem nome interno", () => {
  const raw = 'Os campos "groupId", "companyId" e "legalName" são obrigatórios.';
  assert.deepEqual(quotedFieldNames(raw), ["groupId", "companyId", "legalName"]);
  const text = humanizeMessage(raw);
  assert.equal(text, "Preencha o campo Nome ou razão social.");
  assert.doesNotMatch(text, TECH);
  assert.deepEqual(plainMessageProblems(text), []);
  const onlySystem = humanizeMessage('Os campos "groupId" e "companyId" são obrigatórios.');
  assert.doesNotMatch(onlySystem, TECH);
  assert.match(onlySystem, /Saia do sistema, entre de novo/);
  assert.doesNotMatch(humanizeMessage('O campo "campoQueNaoExiste" é inválido.'), TECH);
});

test("m9d851 erro da API aponta ao campo certo da tela", () => {
  const a = humanizeApiError({ code: "PERSON_VALIDATION", message: 'Os campos "groupId", "companyId" e "legalName" são obrigatórios.' }, PERSON_FIELD_IDS);
  assert.deepEqual(Object.keys(a.fields), ["p-name"]);
  assert.equal(a.fields["p-name"], "Preencha o campo Nome ou razão social.");
  const b = humanizeApiError({ code: "PERSON_DOCUMENT_INVALID_FORMAT", message: "Documento do tipo CPF inválido: esperado 11 dígitos numéricos." }, PERSON_FIELD_IDS);
  assert.deepEqual(Object.keys(b.fields), ["p-doc"]);
  const c = humanizeApiError({ code: "X", message: "Falha.", details: { fields: { zipCode: "invalid" } } }, PERSON_FIELD_IDS);
  assert.equal(c.fields["p-zip"], "Confira o campo CEP.");
  for (const r of [a, b, c]) { assert.doesNotMatch(r.message + Object.values(r.fields).join(" "), TECH); }
  const sys = humanizeApiError({ code: "PERSON_VALIDATION", message: 'Os campos "groupId" e "companyId" são obrigatórios.' }, PERSON_FIELD_IDS);
  assert.equal(sys.systemProblem, true);
  assert.deepEqual(sys.fields, {});
});

test("m9d851 validação do assistente Novo contato: mensagem por campo, em português simples", () => {
  const empty = { basic: { personType: "PF", legalName: "", taxIdNormalized: "" }, contacts: [{ value: "" }], address: { zipCode: "", street: "", neighborhood: "", city: "", state: "" } };
  const b = validatePersonStep("basico", empty);
  assert.deepEqual(Object.keys(b), ["p-name", "p-doc"]);
  assert.equal(b["p-doc"], "Informe o CPF, só com números.");
  assert.equal(validatePersonStep("basico", { ...empty, basic: { personType: "PF", legalName: "Ana", taxIdNormalized: "123.456" } })["p-doc"], "Informe o CPF com 11 dígitos.");
  assert.equal(validatePersonStep("basico", { ...empty, basic: { personType: "PJ", legalName: "Ana", taxIdNormalized: "123" } })["p-doc"], "Informe o CNPJ com 14 dígitos.");
  assert.deepEqual(Object.keys(validatePersonStep("basico", { ...empty, basic: { personType: "PF", legalName: "Ana", taxIdNormalized: "123.456.789-09" } })), []);
  assert.deepEqual(Object.keys(validatePersonStep("contatos", empty)), ["p-contact-value-0"]);
  assert.deepEqual(Object.keys(validatePersonStep("contatos", { ...empty, contacts: [{ value: "" }, { value: "a@b.com" }] })), []);
  const e = validatePersonStep("endereco", empty);
  assert.deepEqual(Object.keys(e), ["p-zip", "p-street", "p-neighborhood", "p-city", "p-state"]);
  assert.deepEqual(validatePersonStep("revisao", empty), {});
  for (const message of [...Object.values(b), ...Object.values(e)]) { assert.deepEqual(plainMessageProblems(message), [], message); assert.doesNotMatch(message, TECH); }
});

test("m9d851 FormField liga o erro ao campo: aria-invalid, aria-describedby e id da mensagem", () => {
  const doc = dom(html(() => createElement(FormField, { label: "CPF", htmlFor: "f-cpf", required: true, error: "Informe o CPF com 11 dígitos." }, createElement(Input, { id: "f-cpf", error: true }))));
  const input = doc.getElementById("f-cpf");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(input.getAttribute("aria-required"), "true");
  const msg = doc.getElementById(input.getAttribute("aria-describedby"));
  assert.equal(msg.textContent, "Informe o CPF com 11 dígitos.");
  const ok = dom(html(() => createElement(FormField, { label: "Nome", htmlFor: "f-n", helper: "Opcional." }, createElement(Input, { id: "f-n" }))));
  assert.equal(ok.getElementById("f-n").getAttribute("aria-invalid"), null, "sem erro, sem aria-invalid");
  assert.equal(ok.getElementById(ok.getElementById("f-n").getAttribute("aria-describedby")).textContent, "Opcional.");
});

test("m9d851 resumo de erros: role=alert, focável por script e com um item por campo", () => {
  const doc = dom(html(() => createElement(ErrorSummary, { items: [{ id: "a", label: "CPF", message: "Informe o CPF." }, { id: "b", label: "Cidade", message: "Informe a cidade." }] })));
  const box = doc.querySelector("[role=alert]");
  assert.equal(box.getAttribute("tabindex"), "-1");
  assert.equal(doc.querySelectorAll("li").length, 2);
  assert.match(box.textContent, /Há 2 campos para corrigir/);
  assert.equal(html(() => createElement(ErrorSummary, { items: [] })), "");
});
