// Pessoas do fechamento do Marco 3 (DI-M3PE-1 a 6): CPF/CNPJ com dígito verificador na tela, catálogo de papéis com VENDEDOR, revisão de
// duplicidade ANTES de criar (forte, médio com motivo, fraco com confirmação, grupo pelo vínculo), texto da classificação do documento e
// os parâmetros novos em Configurações > Pessoas.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as api from "@/lib/api/people.js";
import * as wizard from "@/lib/errors/personWizard.js";
// Módulos novos importados dentro de cada teste: na base (12acd76) cada teste falha pela própria regra, não o arquivo inteiro.
const duplicidade = () => import("@/app/painel/pessoas/novo/duplicidade.js");
const papeis = () => import("@/app/painel/pessoas/RoleChips.js");
const leitura = () => import("@/lib/people/documentoLeitura.js");
const grupos = () => import("@/app/painel/configuracoes/pessoasGroups.js");
const aba = () => import("@/app/painel/configuracoes/PessoasTab.js");
import { ROLE_LABELS } from "@/lib/mock/people.js";

let chamadas;
let resposta;
beforeEach(() => {
  chamadas = [];
  resposta = { success: true, data: [] };
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) }, location: { pathname: "/painel/pessoas/novo", search: "", href: "" } };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url: String(url), init });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(resposta) };
  };
});

const basico = (taxIdNormalized, personType = "PF") => ({ basic: { personType, legalName: "Maria", taxIdNormalized }, contacts: [], address: {} });

test("M3-01 a tela recusa CPF/CNPJ com dígito verificador errado antes de enviar (529.982.247-26 da sonda)", () => {
  const { validatePersonStep } = wizard;
  assert.equal(typeof wizard.isValidTaxId, "function", "a tela confere o dígito verificador");
  const isValidTaxId = wizard.isValidTaxId;
  assert.equal(isValidTaxId("529.982.247-25"), true);
  assert.equal(isValidTaxId("529.982.247-26"), false);
  assert.equal(isValidTaxId("111.111.111-11"), false);
  assert.equal(isValidTaxId("11.222.333/0001-81"), true);
  assert.equal(isValidTaxId("11.222.333/0001-80"), false);
  assert.match(validatePersonStep("basico", basico("529.982.247-26"))["p-doc"], /CPF inválido: os dígitos verificadores não conferem/);
  assert.match(validatePersonStep("basico", basico("11.222.333/0001-80", "PJ"))["p-doc"], /CNPJ inválido/);
  assert.equal(validatePersonStep("basico", basico("529.982.247-25"))["p-doc"], undefined);
});

test("M3-02 VENDEDOR tem rótulo; o catálogo da empresa monta as opções e o papel fora do catálogo continua visível só para desmarcar", async () => {
  assert.equal(ROLE_LABELS.VENDEDOR, "Vendedor");
  const { roleOptions } = await papeis();
  const { listPersonRoleCatalog } = api;
  const opcoes = roleOptions([{ code: "CLIENTE", label: "Cliente" }, { code: "VENDEDOR", label: "Vendedor" }], ["VENDEDOR", "ANTIGO"]);
  assert.deepEqual(opcoes.map((o) => o.code), ["CLIENTE", "VENDEDOR", "ANTIGO"]);
  assert.equal(opcoes[2].foraDoCatalogo, true);
  resposta = { success: true, data: [{ code: "VENDEDOR", label: "Vendedor" }] };
  assert.deepEqual(await listPersonRoleCatalog(), [{ code: "VENDEDOR", label: "Vendedor" }]);
  assert.match(chamadas[0].url, /\/people\/roles-catalog$/);
});

const payload = { personType: "PF", legalName: "Rosa Amaral", taxIdNormalized: "52998224725", birthOrFoundationDate: "1975-09-09", contacts: [{ contactType: "EMAIL", valueNormalized: "rosa@exemplo.com" }], roles: ["CLIENTE"], address: null };
const deps = (resultado, { confirmar = true, motivo = "Pessoa diferente, mesmo e-mail do escritório." } = {}) => {
  const log = { confirm: [], motivo: [], verificar: [] };
  return {
    log,
    deps: {
      verificar: async (rascunho) => { log.verificar.push(rascunho); return resultado; },
      confirm: async (o) => { log.confirm.push(o); return confirmar; },
      pedirMotivo: async (o) => { log.motivo.push(o); return motivo; },
    },
  };
};

test("CRMX-010 forte: o mesmo CPF nesta empresa bloqueia e leva ao cadastro existente; no grupo, oferece o vínculo a quem pode", async () => {
  const { revisarAntesDeCriar, rascunhoDe } = await duplicidade();
  const a = deps({ forte: { nestaEmpresa: { id: "p9", legalName: "Rosa A." }, noGrupo: false } });
  const r1 = await revisarAntesDeCriar(payload, a.deps);
  assert.equal(r1.bloqueio.link, "/painel/pessoas/p9");
  assert.deepEqual(a.log.verificar[0], rascunhoDe(payload));
  assert.equal("roles" in a.log.verificar[0], false, "a consulta manda só o rascunho de identificação");
  assert.deepEqual(await revisarAntesDeCriar(payload, deps({ forte: { nestaEmpresa: null, noGrupo: true, podeVincular: true } }).deps), { vincular: true });
  assert.match((await revisarAntesDeCriar(payload, deps({ forte: { nestaEmpresa: null, noGrupo: true, podeVincular: false } }).deps)).bloqueio.mensagem, /permissão de vincular/);
});

test("M3-03 médio: sem a permissão de exceção bloqueia; com ela pede o motivo (mínimo da API) e manda allowDuplicate + duplicateReason", async () => {
  const { revisarAntesDeCriar } = await duplicidade();
  const candidatos = [{ personId: "p2", legalName: "Rosa Outra" }];
  const sem = await revisarAntesDeCriar(payload, deps({ forte: {}, medio: { candidatos, podeForcar: false, motivoMinimo: 12 }, fraco: { candidatos: [] } }).deps);
  assert.match(sem.bloqueio.mensagem, /Rosa Outra/);
  assert.equal(sem.bloqueio.link, "/painel/pessoas/p2");
  const com = deps({ forte: {}, medio: { candidatos, podeForcar: true, motivoMinimo: 12 }, fraco: { candidatos: [] } });
  const r = await revisarAntesDeCriar(payload, com.deps);
  assert.equal(com.log.motivo[0].minimo, 12);
  assert.equal(r.payload.allowDuplicate, true);
  assert.equal(r.payload.duplicateReason, "Pessoa diferente, mesmo e-mail do escritório.");
  const cancelado = await revisarAntesDeCriar(payload, deps({ forte: {}, medio: { candidatos, podeForcar: true } }, { motivo: null }).deps);
  assert.deepEqual(cancelado, { cancelado: true });
  const grupo = deps({ forte: {}, medio: { candidatos: [], noGrupo: true, podeForcar: true } });
  await revisarAntesDeCriar(payload, grupo.deps);
  assert.match(grupo.log.motivo[0].mensagem, /outra empresa do grupo.*vínculo pelo CPF\/CNPJ/);
});

test("CRMX-010 fraco: pede a confirmação da revisão antes de criar; confirmado manda similarReviewed, cancelado não cria", async () => {
  const { revisarAntesDeCriar, rascunhoDe } = await duplicidade();
  const { checkPersonDuplicates } = api;
  const fraco = { forte: {}, medio: { candidatos: [] }, fraco: { candidatos: [{ personId: "p3", legalName: "ROSA M. AMARAL" }] } };
  const ok = deps(fraco);
  const r = await revisarAntesDeCriar(payload, ok.deps);
  assert.equal(r.payload.similarReviewed, true);
  assert.match(ok.log.confirm[0].message, /ROSA M\. AMARAL/);
  assert.equal(ok.log.confirm[0].confirmLabel, "Revisei: é outra pessoa");
  assert.deepEqual(await revisarAntesDeCriar(payload, deps(fraco, { confirmar: false }).deps), { cancelado: true });
  const limpo = await revisarAntesDeCriar(payload, deps({ forte: {}, medio: { candidatos: [] }, fraco: { candidatos: [] } }).deps);
  assert.deepEqual(limpo.payload, payload);
  resposta = { success: true, data: { forte: {} } };
  await checkPersonDuplicates(rascunhoDe(payload));
  assert.match(chamadas[0].url, /\/people\/duplicates\/check$/);
  assert.equal(chamadas[0].init.method, "POST");
});

test("CAD-05 ficha: classificação e motores da leitura em texto simples; M3-01: marca de revisão do CPF antigo chega da API", async () => {
  const { mapPerson } = api;
  const p0 = mapPerson({ id: "p1", personType: "PF", legalName: "Antiga", taxIdNormalized: "52998224726", dataQuality: { revisao: [{ key: "TAX_ID_DIGITO_INVALIDO", label: "x" }] } });
  assert.deepEqual((p0.revisao || []).map((r) => r.key), ["TAX_ID_DIGITO_INVALIDO"], "a marca de revisão chega à ficha");
  const { textoClassificacao, textoMotores } = await leitura();
  assert.equal(textoClassificacao({ classification: { metodo: "CONTEUDO" } }), "Classificação: tipo identificado pelo conteúdo do documento.");
  assert.match(textoClassificacao({ classification: { metodo: "DECLARADO", pendencia: "Tipo informado (RG) diverge do identificado no conteúdo (CNH)." } }), /diverge/);
  assert.equal(textoClassificacao({}), "");
  assert.match(textoMotores({ engines: { antivirus: "CLAMAV", leitura: "INDISPONIVEL" } }), /indisponível/);
  assert.match(textoMotores({ engines: { antivirus: "LABORATORIO", leitura: "LABORATORIO" } }), /laboratório/);
  assert.equal(textoMotores({ engines: { antivirus: "CLAMAV", leitura: "LOCAL" } }), "");
  const p = mapPerson({ id: "p1", personType: "PF", legalName: "Antiga", taxIdNormalized: "52998224726", dataQuality: { revisao: [{ key: "TAX_ID_DIGITO_INVALIDO", label: "CPF/CNPJ com dígito verificador inválido" }] } });
  assert.deepEqual(p.revisao.map((r) => r.key), ["TAX_ID_DIGITO_INVALIDO"]);
  assert.deepEqual(mapPerson({ id: "p2", personType: "PF", legalName: "Nova" }).revisao, []);
});

test("Configurações > Pessoas: os parâmetros novos estão na aba, com o tipo certo e a conversão para a API", async () => {
  const tab = await aba();
  const PESSOAS_FIELDS = tab.PESSOAS_FIELDS || tab.PESSOAS_VINCULO_FIELDS || [];
  const chavesDaAba = PESSOAS_FIELDS.map((f) => f.key);
  assert.ok(chavesDaAba.includes("people.papeis") && chavesDaAba.includes("people.documentos.confianca_minima"), `a aba Pessoas não tem os parâmetros novos: ${chavesDaAba.join(", ")}`);
  const { PESSOAS_VINCULO_FIELDS } = await grupos();
  const { pessoasApiValue, pessoasFieldError } = tab;
  const chaves = PESSOAS_FIELDS.map((f) => f.key);
  for (const k of ["people.vinculo.tentativas_max", "people.papeis", "people.deduplicacao.ddi_padrao", "people.deduplicacao.motivo_minimo", "people.deduplicacao.contato_no_grupo",
    "people.documentos.confianca_minima", "people.documentos.campos_criticos", "people.documentos.classificacao", "people.documentos.motores_laboratorio"]) assert.ok(chaves.includes(k), k);
  assert.equal(PESSOAS_VINCULO_FIELDS.length, 2);
  const campo = (k) => PESSOAS_FIELDS.find((f) => f.key === k);
  assert.equal(pessoasApiValue(campo("people.documentos.confianca_minima"), "0,85"), 0.85);
  assert.throws(() => pessoasApiValue(campo("people.documentos.confianca_minima"), "1,5"), /Entre 0 e 1/);
  assert.equal(pessoasApiValue(campo("people.deduplicacao.motivo_minimo"), "12"), 12);
  assert.equal(pessoasApiValue(campo("people.papeis"), "  CLIENTE=Cliente  "), "CLIENTE=Cliente");
  assert.equal(pessoasApiValue(campo("people.documentos.motores_laboratorio"), false), false);
  assert.equal(campo("people.documentos.motores_laboratorio").defaultValue, false, "laboratório desligado por padrão");
  assert.equal(pessoasFieldError(campo("people.papeis"), "  "), "Informe um valor.");
  assert.match(pessoasFieldError(campo("people.deduplicacao.motivo_minimo"), "2"), /Entre 5 e 500/);
});
