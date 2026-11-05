// M9-D851 — mensagens compreensíveis: português simples, o que houve e o que fazer; erro de campo no formato "Informe o CPF com 11 dígitos".
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { plainMessageProblems } from "@/lib/a11y/plainMessage.js";
import { MESSAGES, genericErrorText } from "@/lib/asyncState/messages.js";
import { lookupProblemText } from "@/components/molecules/AsyncState/LookupProblems.js";
import { SESSION_EXPIRED_TEXT } from "@/lib/auth/returnTo.js";
import { humanizeApiError, humanizeMessage } from "@/lib/errors/apiErrors.js";
import { validatePersonStep, PERSON_FIELD_IDS } from "@/lib/errors/personWizard.js";

const require = createRequire(import.meta.url);
const { walk, errorLiterals } = require("../scripts/a11yStatic.js");
const ROOT = new URL("..", import.meta.url).pathname;

test("m9d851 mensagens de erro de campo em linguagem simples", () => {
  for (const ok of ["Informe o CPF com 11 dígitos", "Use o formato MM/AAAA.", "Informe um e-mail válido", "Não foi possível carregar as obras."]) assert.deepEqual(plainMessageProblems(ok), [], ok);
  assert.deepEqual(plainMessageProblems("Erro 500"), ["curta demais para dizer o que houve", "erro só com o número do status"].filter((p) => plainMessageProblems("Erro 500").includes(p)));
  assert.ok(plainMessageProblems("Erro 500").includes("erro só com o número do status"));
  assert.ok(plainMessageProblems("VALIDATION_ERROR em cpf").includes("código técnico solto na mensagem"));
  assert.ok(plainMessageProblems("Failed to fetch").length >= 1);
  assert.ok(plainMessageProblems("TypeError: undefined is not a function").length >= 1);
  assert.ok(plainMessageProblems("x").includes("curta demais para dizer o que houve"));
  // Ampliado (05/11/2026): erro de campo do assistente de pessoa e mensagem da API traduzida nunca trazem nome interno de campo nem aspas.
  const vazio = { basic: { personType: "PF", legalName: "", taxIdNormalized: "" }, contacts: [{ value: "" }], address: { zipCode: "", street: "", neighborhood: "", city: "", state: "" } };
  const campos = ["basico", "contatos", "endereco"].flatMap((id) => Object.values(validatePersonStep(id, vazio)));
  const api = [humanizeMessage('Os campos "groupId", "companyId" e "legalName" são obrigatórios.'), ...Object.values(humanizeApiError({ code: "PERSON_DOCUMENT_INVALID_FORMAT", message: "x" }, PERSON_FIELD_IDS).fields)];
  assert.ok(campos.length >= 8);
  for (const text of [...campos, ...api]) { assert.deepEqual(plainMessageProblems(text), [], text); assert.doesNotMatch(text, /"|groupId|companyId|legalName|taxIdNormalized/, text); assert.match(text, /^(Informe|Preencha|Confira)/, text); }
});

test("m9d851 as mensagens do padrão de estados e do login seguem o formato o que houve e o que fazer", () => {
  const texts = [...Object.entries(MESSAGES).filter(([name]) => name !== "offlineCode").map(([, text]) => text), genericErrorText("trace-1"), genericErrorText(null), SESSION_EXPIRED_TEXT,
    lookupProblemText({ label: "os imóveis", state: "PERMISSION_DENIED", permission: "properties:read" }),
    lookupProblemText({ label: "as obras", state: "OFFLINE" }), lookupProblemText({ label: "as pessoas", state: "RETRY", traceId: "t-9" }), lookupProblemText({ label: "os dados", state: "ERROR", traceId: null })];
  for (const text of texts) assert.deepEqual(plainMessageProblems(text), [], text);
  assert.match(genericErrorText("abc"), /Informe o código abc ao suporte\./);
  assert.match(MESSAGES.offlineText, /Verifique a internet e tente novamente/);
  assert.match(MESSAGES.permissionHelp, /Peça ao administrador/);
});

test("m9d851 nenhum texto de erro escrito nas telas e componentes traz código solto, inglês ou 'Erro 500' sozinho", () => {
  let total = 0;
  const bad = [];
  for (const dir of ["app/painel", "components", "lib"]) {
    for (const file of walk(`${ROOT}${dir}`)) {
      for (const literal of errorLiterals(fs.readFileSync(file, "utf8"))) {
        total += 1;
        const problems = plainMessageProblems(literal.text);
        if (problems.length) bad.push(`${file.replace(ROOT, "")}:${literal.line} ${JSON.stringify(literal.text)} (${problems.join("; ")})`);
      }
    }
  }
  assert.ok(total > 200, `textos de erro conferidos: ${total}`);
  assert.deepEqual(bad, []);
});
