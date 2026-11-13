// Marco 4 — Caderno §11 e §17: os parâmetros do Financeiro que a API lê (getSetting) ficam numa aba "Financeiro" de Configurações, com o padrão que a API
// usa enquanto a empresa não grava nada e a mesma faixa que a API confere (SETTINGS_SCHEMA em src/modules/finance/application/services/finance-settings.js da API).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FINANCEIRO_FIELDS, FINANCEIRO_GROUPS, FINANCEIRO_PREFIXES } from "@/app/painel/configuracoes/financeiroGroups.js";
import { decimalFieldError, decimalRangeText, integerFieldError, integerRangeText } from "@/app/painel/configuracoes/settingsFormat.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// Chave, tipo, padrão e faixa esperados (os mesmos da API).
const ESPERADO = {
  "finance.antifraud_manual_reconciliation_min_count": { type: "integer", defaultValue: 3, min: 1, max: 100 },
  "finance.antifraud_manual_reconciliation_window_days": { type: "integer", defaultValue: 30, min: 1, max: 365 },
  "finance.reconciliation.auto_strong": { type: "boolean", defaultValue: false },
  "finance.bank_account_cooldown_hours": { type: "integer", defaultValue: 48, min: 0, max: 720 },
  // DEC-007 (DI-DEC007-1 na API): conta nova R$ 5.000,00 (antes 10.000) e as chaves antifraude.* que a decisão pede.
  "finance.antifraud_new_account_threshold": { type: "decimal", defaultValue: 5000, min: 0, max: 999999999.99 },
  "finance.antifraud_history_multiplier": { type: "decimal", defaultValue: 3, min: 1, max: 100 },
  "antifraude.outlier_bloqueio_multiplicador": { type: "decimal", defaultValue: 10, min: 1, max: 1000 },
  // DEC-007 / M4-D022 item 5 (DI-DEC007-3 na API): amostra mínima e meses de histórico da mediana.
  "antifraude.outlier_amostra_minima": { type: "integer", defaultValue: 5, min: 1, max: 100 },
  "antifraude.outlier_historico_meses": { type: "integer", defaultValue: 12, min: 1, max: 60 },
  "antifraude.duplicidade_janela_dias": { type: "integer", defaultValue: 90, min: 1, max: 365 },
  "antifraude.fornecedor_novo_dias": { type: "integer", defaultValue: 30, min: 1, max: 365 },
  "antifraude.fornecedor_novo_valor_minimo": { type: "decimal", defaultValue: 20000, min: 0.01, max: 999999999.99 },
  "antifraude.conciliacao_manual_usuario_7d": { type: "integer", defaultValue: 5, min: 1, max: 100 },
  "antifraude.conciliacao_manual_percentual_mes": { type: "decimal", defaultValue: 30, min: 1, max: 100 },
  "antifraude.estorno_frequente_usuario_30d": { type: "integer", defaultValue: 3, min: 1, max: 100 },
  // DEC-007, parametros.csv e M4-D006 item 9: 5 por empresa em 30 dias (DI-DEC007-2 na API; antes a aba mostrava 3).
  "antifraude.estorno_frequente_empresa_30d": { type: "integer", defaultValue: 5, min: 1, max: 1000 },
};

test("m4 §17.7 parâmetros: a aba Financeiro lista as chaves (as seis antigas e as dez da DEC-007) com o padrão e a faixa da API", () => {
  assert.deepEqual(FINANCEIRO_FIELDS.map((f) => f.key).sort(), Object.keys(ESPERADO).sort());
  for (const field of FINANCEIRO_FIELDS) {
    const esperado = ESPERADO[field.key];
    for (const prop of Object.keys(esperado)) assert.equal(field[prop], esperado[prop], `${field.key}.${prop}`);
  }
  assert.equal(FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_manual_reconciliation_min_count").defaultValue, 3);
  assert.equal(FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_manual_reconciliation_window_days").defaultValue, 30);
});

test("m4 §17.7 parâmetros: rótulos e ajudas em português, com o padrão dito na ajuda e sem chave técnica nem UUID", () => {
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  for (const group of FINANCEIRO_GROUPS) {
    assert.match(group.subtitle, /caderno do Marco 4/);
    assert.doesNotMatch(group.subtitle, /finance\.|uuid/i);
  }
  for (const field of FINANCEIRO_FIELDS) {
    for (const text of [field.label, field.helper]) {
      assert.ok(text && text.length > 10, field.key);
      assert.doesNotMatch(text, /finance\.|_|undefined|NaN/, `${field.key}: ${text}`);
      assert.doesNotMatch(text, uuid);
    }
    assert.match(field.helper, /^Padrão: /, field.key);
  }
  assert.match(FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_manual_reconciliation_min_count").helper, /^Padrão: 3\./);
  assert.match(FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_manual_reconciliation_window_days").helper, /^Padrão: 30 dias\./);
});

test("m4 §17.7 parâmetros: a tela lê só as chaves da aba (nunca as credenciais do banco) e cada chave cai num prefixo lido", () => {
  for (const field of FINANCEIRO_FIELDS) assert.ok(FINANCEIRO_PREFIXES.some((p) => field.key.startsWith(p)), field.key);
  for (const secret of ["finance.santander_client_secret", "finance.santander_key_pem", "finance.bank_payment_webhook_secret", "finance.payment_provider"]) {
    assert.ok(!FINANCEIRO_PREFIXES.some((p) => secret.startsWith(p)), secret);
  }
});

test("m4 §17.7 parâmetros: a faixa recusa o que a API recusaria (inteiro e decimal, vírgula ou ponto)", () => {
  const min = FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_manual_reconciliation_min_count");
  assert.equal(integerRangeText(min), "Entre 1 e 100.");
  assert.equal(integerFieldError(min, "2"), null);
  assert.match(integerFieldError(min, "0"), /Entre 1 e 100/);
  assert.match(integerFieldError(min, "101"), /Entre 1 e 100/);
  const mult = FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_history_multiplier");
  assert.equal(decimalRangeText(mult), "Entre 1 e 100.");
  assert.equal(decimalFieldError(mult, "2,5"), null);
  assert.equal(decimalFieldError(mult, "2.5"), null);
  assert.match(decimalFieldError(mult, "0,5"), /Entre 1 e 100/);
  assert.equal(decimalFieldError(mult, ""), null);
  const limite = FINANCEIRO_FIELDS.find((f) => f.key === "finance.antifraud_new_account_threshold");
  assert.equal(decimalRangeText(limite), "Entre 0 e 999999999,99.");
});

test("m4 §17.7 parâmetros: a aba está registrada em Configurações e grava pelo mesmo caminho das outras (listSettings/updateSetting)", () => {
  const page = read("app/painel/configuracoes/page.js");
  assert.match(page, /import FinanceiroTab from "\.\/FinanceiroTab";/);
  assert.match(page, /\{ label: "Financeiro", content: <FinanceiroTab \/> \}/);
  const tab = read("app/painel/configuracoes/FinanceiroTab.js");
  assert.match(tab, /from "\.\/financeiroGroups"/);
  assert.match(tab, /import \{ listSettings, updateSetting \} from "@\/lib\/api\/settings"/);
  assert.match(tab, /await updateSetting\(field\.key, toApiValue\(field, values\[field\.key\]\)\)/);
  assert.match(tab, /changedFields\(FINANCEIRO_FIELDS, values, original\)/);
  assert.ok(tab.split("\n").length <= 400);
});

test("DEC-007 MFA: o 403 de MFA recente de um parâmetro sensível não vira 'Sem permissão' (a aba mostra a frase do MFA)", async () => {
  const { isMfaSettingError, isSettingForbidden, mfaSettingMessage } = await import("@/lib/settings/errorLabel.js");
  for (const code of ["MFA_STEP_UP_REQUIRED", "MFA_STEP_UP_CANCELLED", "MFA_REQUIRED_NOT_ENABLED"]) {
    const err = { status: 403, code };
    assert.equal(isMfaSettingError(err), true, code);
    assert.equal(isSettingForbidden(err), false, code);
    assert.match(mfaSettingMessage(err), /verificação em duas etapas/);
  }
  assert.equal(isSettingForbidden({ status: 403, code: "PERMISSION_DENIED" }), true);
  assert.equal(isMfaSettingError({ status: 400, code: "MFA_STEP_UP_REQUIRED" }), false);
  for (const file of ["FinanceiroTab", "CobrancaTab", "SegurancaTab", "IaNayTab", "IntegracoesRegistroTab", "GovernancaTab"]) {
    const src = read(`app/painel/configuracoes/${file}.js`);
    assert.match(src, /isSettingForbidden\(err\)\) \{?\s*setForbidden\(true\)/, file);
    assert.match(src, /isMfaSettingError\(err\) \? mfaSettingMessage\(err\)/, file);
  }
  const financeiro = FINANCEIRO_FIELDS.filter((f) => /verificação em duas etapas/.test(f.helper)).map((f) => f.key).sort();
  assert.deepEqual(financeiro, ["finance.antifraud_new_account_threshold", "finance.bank_account_cooldown_hours", "finance.reconciliation.auto_strong"]);
});

test("DEC-007 rodada 2: cada campo numérico mostra o valor em vigor que o antifraude usa (gravado, padrão ou padrão no lugar de gravado inválido)", async () => {
  const { effectiveByKey, effectiveText, formatParameterValue } = await import("@/app/painel/configuracoes/antifraudEffective.js");
  const dias = FINANCEIRO_FIELDS.find((f) => f.key === "antifraude.duplicidade_janela_dias");
  const valor = FINANCEIRO_FIELDS.find((f) => f.key === "antifraude.fornecedor_novo_valor_minimo");
  assert.equal(effectiveText(dias, { effectiveValue: 120, source: "STORED" }), "Em vigor: 120 (valor gravado).");
  assert.equal(effectiveText(dias, { effectiveValue: 90, source: "DEFAULT" }), "Em vigor: 90 (padrão da decisão DEC-007).");
  assert.match(effectiveText(dias, { effectiveValue: 90, storedValue: "", source: "INVALID_STORED" }), /^Em vigor: 90, o padrão da decisão DEC-007: o valor gravado está fora da faixa e não é usado/);
  assert.equal(formatParameterValue(valor, 20000).replace(/\s/g, " "), "R$ 20.000,00");
  assert.equal(effectiveText(dias, undefined), "", "sem a linha da API a aba não inventa valor");
  assert.deepEqual(Object.keys(effectiveByKey([{ key: "a", effectiveValue: 1 }, null])), ["a"]);
  const tab = read("app/painel/configuracoes/FinanceiroTab.js");
  assert.match(tab, /import \{ getAntifraudParameters \} from "@\/lib\/api\/financeAntifraud"/);
  assert.match(tab, /effectiveText\(field, effective\[field\.key\]\)/);
  assert.match(tab, /invalidateAsyncCache\(EFFECTIVE_CACHE_KEY\)/, "depois de salvar, o valor em vigor é relido");
  assert.match(read("lib/api/financeAntifraud.js"), /apiFetch\("\/finance\/antifraud\/parameters"\)/);
});

test("DEC-007 rodada 2: a recusa 422 da API (valor fora da faixa) aparece na aba com o rótulo do campo, sem virar 'Sem permissão'", async () => {
  const { isSettingForbidden, isMfaSettingError, labelSettingError } = await import("@/lib/settings/errorLabel.js");
  const err = { status: 422, code: "SETTING_INVALID_VALUE", message: '"Pagamento duplicado: janela de dias" deve ser um número inteiro de 1 a 365. O valor enviado (0) foi recusado e nada foi gravado.' };
  assert.equal(isSettingForbidden(err), false);
  assert.equal(isMfaSettingError(err), false);
  assert.equal(labelSettingError(err, {}, "x"), err.message);
  const tab = read("app/painel/configuracoes/FinanceiroTab.js");
  assert.match(tab, /labelSettingError\(err, LABELS, "Não foi possível salvar as configurações do Financeiro\."\)/);
  assert.match(tab, /<Alert tone="danger" title="Erro">\{error\}<\/Alert>/);
});
