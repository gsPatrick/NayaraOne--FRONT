"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { canResetForm } from "@/lib/asyncState/formSync";
import { invalidateAsyncCache, useAsyncState } from "@/lib/asyncState/useAsyncState";
import { toNumber } from "@/lib/format";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { getAntifraudParameters } from "@/lib/api/financeAntifraud";
import { buildLabelMap, isMfaSettingError, isSettingForbidden, labelSettingError, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { changedFields, decimalFieldError, decimalInRange, decimalRangeText, integerFieldError, integerInRange, integerRangeError, integerRangeText, loadedValue, settingsByKey } from "./settingsFormat";
import { FINANCEIRO_FIELDS, FINANCEIRO_GROUPS, FINANCEIRO_PREFIXES } from "./financeiroGroups";
import { effectiveByKey, effectiveText } from "./antifraudEffective";
import { orderedFieldsError, saveOrder } from "./financeiroAprovacaoGroups";
import styles from "./page.module.css";

// Aba "Financeiro" de Configurações (Marco 4): mesmo caminho das outras abas (GET /settings?prefix=..., PUT /settings/:key). A API é a fonte da
// validação; a tela só antecipa a faixa para não mandar valor que seria recusado. Cada campo numérico mostra o valor em vigor que o antifraude usa
// (GET /finance/antifraud/parameters, DEC-007): o gravado, o padrão, ou o padrão no lugar de um gravado inválido.
const CACHE_KEY = "configuracoes:financeiro";
const EFFECTIVE_CACHE_KEY = "configuracoes:financeiro:em-vigor";
const LABELS = buildLabelMap(FINANCEIRO_FIELDS);

// Número aparece na tela com vírgula (o DecimalInput aceita vírgula ou ponto); booleano fica booleano; lista fechada fica na opção da lista.
function toFormValue(field, raw) {
  if (field.type === "boolean") return loadedValue(field, raw);
  if (field.type === "select") {
    const value = String(loadedValue(field, raw) ?? "").toUpperCase();
    return field.options.some((o) => o.value === value) ? value : field.defaultValue;
  }
  return String(loadedValue(field, raw) ?? "").replace(".", ",");
}

function formFrom(byKey) {
  return Object.fromEntries(FINANCEIRO_FIELDS.map((field) => [field.key, toFormValue(field, byKey ? byKey[field.key] : undefined)]));
}

function fieldError(field, raw) {
  if (field.type === "integer") return integerFieldError(field, raw);
  if (field.type === "decimal") return decimalFieldError(field, raw);
  return null;
}

/** Valor que vai para a API, já conferido contra a faixa (lança com a frase da faixa quando não passa). */
function toApiValue(field, raw) {
  if (field.type === "boolean") return Boolean(raw);
  if (field.type === "select") return String(raw);
  const value = toNumber(raw);
  if (field.type === "integer") {
    if (!integerInRange(value, field)) throw new Error(integerRangeError(field));
    return value;
  }
  if (!decimalInRange(value, field)) throw new Error(`"${field.label}" deve ser um número. ${decimalRangeText(field)}`);
  return value;
}

export default function FinanceiroTab() {
  const [values, setValues] = useState(() => formFrom(null));
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");
  const [touched, setTouched] = useState({}); // erro de faixa aparece ao sair do campo
  // Dado fresco que chega depois de o usuário digitar não apaga o que foi digitado.
  const formRef = useRef({ values: null, original: null });

  const settingsQuery = useAsyncState(
    () => Promise.all(FINANCEIRO_PREFIXES.map((prefix) => listSettings(prefix))).then((responses) => settingsByKey(...responses)),
    { key: CACHE_KEY, isEmpty: () => false }
  );
  const effectiveQuery = useAsyncState(() => getAntifraudParameters().then(effectiveByKey), { key: EFFECTIVE_CACHE_KEY, isEmpty: () => false });
  const effective = effectiveQuery.data || {};
  useEffect(() => {
    if (!settingsQuery.data) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = formFrom(settingsQuery.data);
    setValues(next);
    setOriginal(next);
  }, [settingsQuery.data]);

  formRef.current = { values, original };
  // Faixas e aprovadores precisam ficar em ordem (a API recusa o limite fora de ordem): o Salvar espera a correção.
  const orderError = original ? orderedFieldsError(FINANCEIRO_FIELDS, values, toNumber) : null;
  const blocked = Boolean(orderError) || changedFields(FINANCEIRO_FIELDS, values, original).some((field) => fieldError(field, values[field.key]));

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const saved = { ...original };
    try {
      for (const field of saveOrder(changedFields(FINANCEIRO_FIELDS, values, original), values, original, toNumber)) { // sem alteração, nenhuma gravação
        if (!["boolean", "select"].includes(field.type) && String(values[field.key]).trim() === "") continue; // campo limpo não é enviado
        await updateSetting(field.key, toApiValue(field, values[field.key]));
        saved[field.key] = values[field.key];
      }
      setOriginal(saved);
      invalidateAsyncCache(CACHE_KEY);
      setSuccess("Configurações do Financeiro salvas.");
    } catch (err) {
      setOriginal(saved); // o que já foi gravado antes da recusa fica como gravado
      // 422 SETTING_INVALID_VALUE (fora da faixa ou da trava entre os múltiplos): a frase da API, com o rótulo do campo, aparece no alerta de erro.
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : labelSettingError(err, LABELS, "Não foi possível salvar as configurações do Financeiro."));
    } finally {
      invalidateAsyncCache(EFFECTIVE_CACHE_KEY); // o valor em vigor muda com o que foi gravado (inclusive antes de uma recusa)
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="Financeiro">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações do Financeiro.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Financeiro"
      subtitle="Regras de conciliação, de antifraude, de aprovação dos pagamentos, do estorno e da reabertura de período desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT" || blocked}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações do Financeiro..." freshOnly>
        <div className={styles.formGrid}>
          {error || success || orderError ? (
            <div className="formGridFull">
              {orderError ? <Alert tone="warning">{orderError}</Alert> : null}
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          {FINANCEIRO_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => {
                  const id = `fin-${field.key}`;
                  if (field.type === "boolean") {
                    return (
                      <div key={field.key}>
                        <Checkbox id={id} label={field.label} checked={Boolean(values[field.key])} onChange={(e) => handleChange(field.key, e.target.checked)} />
                        <p>{field.helper}</p>
                      </div>
                    );
                  }
                  if (field.type === "select") {
                    return (
                      <FormField key={field.key} label={field.label} htmlFor={id} helper={field.helper}>
                        <Select id={id} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)}>
                          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </FormField>
                    );
                  }
                  const message = touched[field.key] ? fieldError(field, values[field.key]) : null;
                  const range = field.type === "integer" ? integerRangeText(field) : decimalRangeText(field);
                  const inForce = effectiveText(field, effective[field.key]);
                  return (
                    <FormField key={field.key} label={field.label} htmlFor={id} helper={inForce ? `${field.helper} ${range} ${inForce}` : `${field.helper} ${range}`} error={message}>
                      <DecimalInput
                        id={id}
                        maxDecimals={field.type === "integer" ? 0 : field.maxDecimals}
                        value={String(values[field.key] ?? "")}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
                        error={Boolean(message)}
                      />
                    </FormField>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </Card>
  );
}
