// Pessoa do grupo vinculada a esta empresa (DI-M9I-2 a DI-M9I-5, ISO-4 de 11/11/2026): o cadastro com CPF/CNPJ de outra empresa
// do grupo vira o fluxo "vincular a esta empresa" (com confirmação, só para quem pode), a ficha distingue a pessoa vinculada e os
// erros novos da API chegam em linguagem simples no campo certo.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mapPerson } from "@/lib/api/people.js";
import { humanizeApiError } from "@/lib/errors/apiErrors.js";
import { PERSON_FIELD_IDS } from "@/lib/errors/personWizard.js";
import { podeOferecerVinculo, oferecerVinculo, VINCULO_DIALOGO } from "@/app/painel/pessoas/novo/vinculoNoGrupo.js";
import { PESSOAS_VINCULO_FIELDS } from "@/app/painel/configuracoes/PessoasTab.js";

let chamadas;
beforeEach(() => {
  chamadas = [];
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) }, location: { pathname: "/painel/pessoas/novo", search: "", href: "" } };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url: String(url), init });
    const body = { success: true, data: { id: "p1", personType: "PF", legalName: "Maria Souza", taxIdNormalized: "52998224725", status: "ACTIVE", vinculo: { origem: "VINCULADA", vinculadaEm: "2026-11-11T10:00:00.000Z" }, contacts: [], documents: [], roles: [], addresses: [] } };
    return { ok: true, status: 201, headers: { get: () => null }, text: async () => JSON.stringify(body) };
  };
});

test("pessoa vinculada: a ficha sabe que a base é de outra empresa e usa a data do vínculo", () => {
  const vinculada = mapPerson({ id: "p1", personType: "PF", legalName: "Maria", vinculo: { origem: "VINCULADA", vinculadaEm: "2026-11-11T10:00:00.000Z" } });
  assert.equal(vinculada.vinculo, "VINCULADA");
  assert.equal(vinculada.createdAt, "2026-11-11T10:00:00.000Z");
  const propria = mapPerson({ id: "p2", personType: "PF", legalName: "João", createdAt: "2026-01-01T00:00:00.000Z", vinculo: { origem: "PROPRIA" } });
  assert.equal(propria.vinculo, "PROPRIA");
  assert.equal(mapPerson({ id: "p3", personType: "PF", legalName: "Antiga" }).vinculo, "PROPRIA", "resposta sem o campo (API anterior) conta como própria");
});

test("CPF/CNPJ do grupo: só oferece vincular a quem tem a permissão; cancelar não chama a API; confirmar manda CPF, nome e os dados desta empresa", async () => {
  assert.equal(podeOferecerVinculo({ code: "PERSON_TAX_ID_IN_GROUP", details: { podeVincular: true } }), true);
  assert.equal(podeOferecerVinculo({ code: "PERSON_TAX_ID_IN_GROUP", details: { podeVincular: false } }), false);
  assert.equal(podeOferecerVinculo({ code: "PERSON_DUPLICATE" }), false);
  assert.match(VINCULO_DIALOGO.message, /só os dados básicos/);
  assert.equal(VINCULO_DIALOGO.confirmLabel, "Vincular a esta empresa");

  const payload = { taxIdNormalized: "52998224725", legalName: "Maria Souza", contacts: [{ contactType: "EMAIL", valueNormalized: "m@b.test" }], address: { street: "Rua B" }, roles: ["CLIENTE"], documents: [], personType: "PF", status: "ACTIVE" };
  assert.equal(await oferecerVinculo(payload, async () => false), null);
  assert.equal(chamadas.length, 0, "cancelar não chama a API");
  const pessoa = await oferecerVinculo(payload, async (opcoes) => opcoes.title === VINCULO_DIALOGO.title);
  assert.equal(pessoa.vinculo, "VINCULADA");
  assert.equal(chamadas.length, 1);
  assert.match(chamadas[0].url, /\/people\/links$/);
  assert.equal(chamadas[0].init.method, "POST");
  const corpo = JSON.parse(chamadas[0].init.body);
  assert.deepEqual(Object.keys(corpo).sort(), ["address", "contacts", "documents", "legalName", "reason", "roles", "taxIdNormalized"]);
  assert.equal(corpo.taxIdNormalized, "52998224725");
});

test("erros do vínculo em linguagem simples e no campo certo", () => {
  const semPermissao = humanizeApiError({ code: "PERSON_TAX_ID_IN_GROUP", message: "x" }, PERSON_FIELD_IDS);
  assert.match(semPermissao.fields["p-doc"], /outra empresa do grupo/);
  const nome = humanizeApiError({ code: "PERSON_LINK_NOT_MATCHED", message: "x" }, PERSON_FIELD_IDS);
  assert.match(nome.fields["p-name"], /como está no documento/);
  assert.match(humanizeApiError({ code: "PERSON_LINK_RATE_LIMIT", message: "x" }).message, /Espere alguns minutos/);
  assert.match(humanizeApiError({ code: "PERSON_BASE_OWNER_ONLY", message: "x" }).message, /outra empresa do grupo/);
  assert.match(humanizeApiError({ code: "PERSON_LINKED_ELSEWHERE", message: "x" }).message, /não pode ser excluído nem mesclado/);
});

test("parâmetros do vínculo na tela de Configurações: chaves, padrões e faixas iguais aos da API", () => {
  assert.deepEqual(PESSOAS_VINCULO_FIELDS.map((f) => [f.key, f.defaultValue, f.min, f.max]), [
    ["people.vinculo.tentativas_max", 10, 1, 1000],
    ["people.vinculo.janela_minutos", 60, 1, 1440],
  ]);
});
