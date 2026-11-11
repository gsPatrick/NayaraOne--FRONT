// Fechamento M5 (vistorias/prazos) — aba "Locação e Jurídico" de Configurações: as chaves que a API lê (legalRules.settings.js e
// leaseObligations.settings.js da API), com o padrão que a API usa enquanto a empresa não grava nada e a mesma faixa que a API confere.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JURIDICO_FIELDS, JURIDICO_GROUPS, JURIDICO_PREFIXES, BRAZIL_TIME_ZONES } from "@/app/painel/configuracoes/juridicoGroups.js";
import { juridicoFieldError, selectOptions, toApiValue, toFormValue } from "@/app/painel/configuracoes/juridicoFormat.js";
import { allSettingLabels } from "@/lib/settings/allLabels.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const PHOTO = { SALE: 1, SALE_CASH: 1, SALE_FINANCED: 1, SALE_TRADE: 1, SALE_INSTALLMENTS: 1, LEASE: 0, LEASE_RESIDENTIAL: 0, LEASE_COMMERCIAL: 0, LEASE_SEASONAL: 0, PROPERTY_ADMIN: 0, SERVICE: 0, CONSTRUCTION: 0, USED_PROPERTY_DELIVERY: 1 };
const ESPERADO = {
  ...Object.fromEntries(Object.entries(PHOTO).map(([t, d]) => [`legal.chaves.fotos_minimas.${t}`, { type: "integer", defaultValue: d, min: 0, max: 50 }])),
  "legal.prazos.fuso_horario": { type: "select", defaultValue: "America/Sao_Paulo" },
  ...Object.fromEntries(["LOW", "MEDIUM", "HIGH", "CRITICAL"].flatMap((c) => [
    [`legal.prazos.alerta_antecedencia_horas.${c}`, { type: "integer", defaultValue: 48, min: 1, max: 720 }],
    [`legal.prazos.escalonamento_horas.${c}`, { type: "integer", defaultValue: 24, min: 1, max: 720 }],
  ])),
  "legal.processo.recebivel.base.SETTLEMENT": { type: "boolean", defaultValue: true },
  "legal.processo.recebivel.base.FINAL_JUDGMENT": { type: "boolean", defaultValue: true },
  "legal.processo.recebivel.base.PROVISIONAL_ENFORCEMENT": { type: "boolean", defaultValue: false },
  "legal.processo.recebivel.base.EXTRAJUDICIAL_TITLE": { type: "boolean", defaultValue: false },
  "legal.processo.recebivel.base.COURT_DEPOSIT_RELEASE": { type: "boolean", defaultValue: false },
  "billing.utility_proof_grace_days": { type: "integer", defaultValue: 5, min: 0, max: 60 },
  "billing.reimbursement_overdue_alert_days": { type: "integer", defaultValue: 30, min: 1, max: 365 },
  "locacao.titularidade.prazo_dias": { type: "integer", defaultValue: 30, min: 1, max: 90 },
  "locacao.encerramento.bloqueia.TRANSFER": { type: "boolean", defaultValue: true },
  "locacao.encerramento.bloqueia.CYCLE_OVERDUE": { type: "boolean", defaultValue: true },
  "locacao.encerramento.bloqueia.REIMBURSEMENT_PENDING": { type: "boolean", defaultValue: false },
};

test("m5vp parâmetros: a aba lista as chaves da API com padrão e faixa iguais", () => {
  assert.deepEqual(JURIDICO_FIELDS.map((f) => f.key).sort(), Object.keys(ESPERADO).sort());
  for (const field of JURIDICO_FIELDS) {
    for (const [prop, value] of Object.entries(ESPERADO[field.key])) assert.equal(field[prop], value, `${field.key}.${prop}`);
  }
});

test("m5vp parâmetros: rótulo e ajuda em português, padrão dito na ajuda, sem chave técnica", () => {
  for (const group of JURIDICO_GROUPS) assert.match(group.subtitle, /livro do Marco 5/);
  for (const field of JURIDICO_FIELDS) {
    for (const text of [field.label, field.helper]) {
      assert.ok(text && text.length > 5, field.key);
      assert.doesNotMatch(text, /legal\.|billing\.|locacao\.|_|undefined|NaN|America\//, `${field.key}: ${text}`);
    }
    assert.match(field.helper, /^Padrão: /, field.key);
  }
  assert.match(JURIDICO_FIELDS.find((f) => f.key === "legal.chaves.fotos_minimas.LEASE").helper, /^Padrão: 0 \(não exige foto\)/);
  for (const zone of BRAZIL_TIME_ZONES) assert.doesNotMatch(zone.label, /America|_/);
  assert.ok(BRAZIL_TIME_ZONES.some((z) => z.value === "America/Manaus"));
});

test("m5vp parâmetros: cada chave cai num prefixo lido e entra no mapa de rótulos da tela de Atividades", () => {
  const labels = allSettingLabels();
  for (const field of JURIDICO_FIELDS) {
    assert.ok(JURIDICO_PREFIXES.some((p) => field.key.startsWith(p)), field.key);
    assert.equal(labels[field.key], field.label, field.key);
  }
});

test("m5vp parâmetros: conversão de valor (inteiro na faixa, booleano, fuso) e faixa recusada antes da API", () => {
  const fotos = JURIDICO_FIELDS.find((f) => f.key === "legal.chaves.fotos_minimas.SALE");
  assert.equal(toFormValue(fotos, undefined), "1");
  assert.equal(toFormValue(fotos, 3), "3");
  assert.equal(toApiValue(fotos, "0"), 0);
  assert.throws(() => toApiValue(fotos, "51"), /entre 0 e 50/);
  assert.throws(() => toApiValue(fotos, "1,5"), /inteiro/);
  assert.match(juridicoFieldError(fotos, "51"), /Entre 0 e 50/);
  const base = JURIDICO_FIELDS.find((f) => f.key === "legal.processo.recebivel.base.EXTRAJUDICIAL_TITLE");
  assert.equal(toFormValue(base, "true"), true);
  assert.equal(toFormValue(base, null), false);
  assert.equal(toApiValue(base, true), true);
  const fuso = JURIDICO_FIELDS.find((f) => f.key === "legal.prazos.fuso_horario");
  assert.equal(toFormValue(fuso, null), "America/Sao_Paulo");
  assert.equal(toFormValue(fuso, " America/Manaus "), "America/Manaus");
  assert.equal(toApiValue(fuso, "America/Recife"), "America/Recife");
  assert.throws(() => toApiValue(fuso, " "), /Escolha/);
  assert.equal(selectOptions(fuso, "America/Manaus").length, BRAZIL_TIME_ZONES.length);
  const extra = selectOptions(fuso, "Europe/Lisbon");
  assert.equal(extra.length, BRAZIL_TIME_ZONES.length + 1);
  assert.doesNotMatch(extra[extra.length - 1].label, /Europe\//);
});

test("m5vp parâmetros: aba registrada em Configurações, grava pelo caminho comum e cobrança avisa a nova versão da regra", () => {
  const page = read("app/painel/configuracoes/page.js");
  assert.match(page, /\{ label: "Locação e Jurídico", content: <JuridicoTab \/> \}/);
  const tab = read("app/painel/configuracoes/JuridicoTab.js");
  assert.match(tab, /import \{ listSettings, updateSetting \} from "@\/lib\/api\/settings"/);
  assert.match(tab, /isMfaSettingError\(err\) \? mfaSettingMessage\(err\)/);
  assert.ok(tab.split("\n").length <= 400);
  assert.match(read("app/painel/configuracoes/CobrancaTab.js"), /Motor de Regras[\s\S]*REG-LOC-001[\s\S]*REG-LOC-002/);
});
