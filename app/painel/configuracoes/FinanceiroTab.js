"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { canResetForm } from "@/lib/asyncState/formSync";
import { invalidateAsyncCache, useAsyncState } from "@/lib/asyncState/useAsyncState";
import { toNumber } from "@/lib/format";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { buildLabelMap, labelSettingError } from "@/lib/settings/errorLabel";
import { changedFields, decimalFieldError, decimalInRange, decimalRangeText, integerFieldError, integerInRange, integerRangeError, integerRangeText, loadedValue, settingsByKey } from "./settingsFormat";
import { FINANCEIRO_FIELDS, FINANCEIRO_GROUPS, FINANCEIRO_PREFIXES } from "./financeiroGroups";
import styles from "./page.module.css";

// Aba "Financeiro" de Configurações (Marco 4): mesmo caminho das outras abas (GET /settings?prefix=..., PUT /settings/:key). A API é a fonte da
// validação; a tela só antecipa a faixa para não mandar valor que seria recusado.
const CACHE_KEY = "configuracoes:financeiro";
const LABELS = buildLabelMap(FINANCEIRO_FIELDS);

// Número aparece na tela com vírgula (o DecimalInput aceita vírgula ou ponto); booleano fica booleano.
const toFormValue = (field, raw) => (field.type === "boolean" ? loadedValue(field, raw) : String(loadedValue(field, raw) ?? "").replace(".", ","));

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
  useEffect(() => {
    if (!settingsQuery.data) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = formFrom(settingsQuery.data);
    setValues(next);
    setOriginal(next);
  }, [settingsQuery.data]);

  formRef.current = { values, original };
  const blocked = changedFields(FINANCEIRO_FIELDS, values, original).some((field) => fieldError(field, values[field.key]));

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
      for (const field of changedFields(FINANCEIRO_FIELDS, values, original)) { // sem alteração, nenhuma gravação
        if (field.type !== "boolean" && String(values[field.key]).trim() === "") continue; // campo limpo não é enviado
        await updateSetting(field.key, toApiValue(field, values[field.key]));
        saved[field.key] = values[field.key];
      }
      setOriginal(saved);
      invalidateAsyncCache(CACHE_KEY);
      setSuccess("Configurações do Financeiro salvas.");
    } catch (err) {
      setOriginal(saved); // o que já foi gravado antes da recusa fica como gravado
      if (err?.status === 403) setForbidden(true);
      else setError(labelSettingError(err, LABELS, "Não foi possível salvar as configurações do Financeiro."));
    } finally {
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
      subtitle="Regras de conciliação e de antifraude dos pagamentos desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT" || blocked}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações do Financeiro..." freshOnly>
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
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
                  const message = touched[field.key] ? fieldError(field, values[field.key]) : null;
                  const range = field.type === "integer" ? integerRangeText(field) : decimalRangeText(field);
                  return (
                    <FormField key={field.key} label={field.label} htmlFor={id} helper={`${field.helper} ${range}`} error={message}>
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
