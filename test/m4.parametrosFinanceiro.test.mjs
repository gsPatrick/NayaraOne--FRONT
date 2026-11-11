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
  "antifraude.duplicidade_janela_dias": { type: "integer", defaultValue: 90, min: 1, max: 365 },
  "antifraude.fornecedor_novo_dias": { type: "integer", defaultValue: 30, min: 1, max: 365 },
  "antifraude.fornecedor_novo_valor_minimo": { type: "decimal", defaultValue: 20000, min: 0.01, max: 999999999.99 },
  "antifraude.conciliacao_manual_usuario_7d": { type: "integer", defaultValue: 5, min: 1, max: 100 },
  "antifraude.conciliacao_manual_percentual_mes": { type: "decimal", defaultValue: 30, min: 1, max: 100 },
  "antifraude.estorno_frequente_usuario_30d": { type: "integer", defaultValue: 3, min: 1, max: 100 },
  "antifraude.estorno_frequente_empresa_30d": { type: "integer", defaultValue: 3, min: 1, max: 1000 },
  // Autorização do pagamento, do estorno e da reabertura (PAYMENT_APPROVAL_SETTINGS_SCHEMA da API; DEC-003, DEC-004).
  "pagamentos.faixa.baixo_ate": { type: "decimal", defaultValue: 5000, min: 0.01, max: 999999999.99 },
  "pagamentos.faixa.medio_ate": { type: "decimal", defaultValue: 50000, min: 0.01, max: 999999999.99 },
  "pagamentos.faixa.alto_ate": { type: "decimal", defaultValue: 200000, min: 0.01, max: 999999999.99 },
  "pagamentos.aprovadores.baixo": { type: "integer", defaultValue: 1, min: 1, max: 5 },
  "pagamentos.aprovadores.medio": { type: "integer", defaultValue: 1, min: 1, max: 5 },
  "pagamentos.aprovadores.alto": { type: "integer", defaultValue: 2, min: 1, max: 5 },
  "pagamentos.aprovadores.critico": { type: "integer", defaultValue: 2, min: 1, max: 5 },
  "pagamentos.mfa.aprovacao_medio": { type: "boolean", defaultValue: false },
  "pagamentos.risco_sem_valor": { type: "select", defaultValue: "CRITICAL" },
  "financeiro.estorno.aprovador_distinto": { type: "boolean", defaultValue: true },
  "fechamento.reabertura_motivo_minimo_caracteres": { type: "integer", defaultValue: 20, min: 5, max: 500 },
  "fechamento.reabertura.aprovadores": { type: "integer", defaultValue: 1, min: 1, max: 5 },
};

test("m4 §17.7 parâmetros: a aba Financeiro lista as chaves (as seis antigas, as oito da DEC-007 e as doze da autorização) com o padrão e a faixa da API", () => {
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
  // Todas as chaves da autorização (pagamento, estorno, reabertura) exigem MFA para alterar, menos o tamanho mínimo do motivo (requiresMfa da API).
  const aprovacao = Object.keys(ESPERADO).filter((k) => /^(pagamentos\.|financeiro\.estorno\.|fechamento\.reabertura\.)/.test(k));
  assert.deepEqual(financeiro, ["finance.antifraud_new_account_threshold", "finance.bank_account_cooldown_hours", "finance.reconciliation.auto_strong", ...aprovacao].sort());
});
