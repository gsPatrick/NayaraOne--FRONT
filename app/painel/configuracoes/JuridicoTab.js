"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { canResetForm } from "@/lib/asyncState/formSync";
import { invalidateAsyncCache, useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { buildLabelMap, isMfaSettingError, isSettingForbidden, labelSettingError, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { changedFields, integerRangeText, settingsByKey } from "./settingsFormat";
import { juridicoFieldError, selectOptions, toApiValue, toFormValue } from "./juridicoFormat";
import { JURIDICO_FIELDS, JURIDICO_GROUPS, JURIDICO_PREFIXES } from "./juridicoGroups";
import styles from "./page.module.css";

// Aba "Locação e Jurídico" de Configurações (fechamento do Marco 5): mesmo caminho das outras abas (GET /settings?prefix=..., PUT /settings/:key).
// A API é a fonte da validação; a tela só antecipa a faixa para não mandar valor que seria recusado.
const CACHE_KEY = "configuracoes:juridico";
const LABELS = buildLabelMap(JURIDICO_FIELDS);

function formFrom(byKey) {
  return Object.fromEntries(JURIDICO_FIELDS.map((field) => [field.key, toFormValue(field, byKey ? byKey[field.key] : undefined)]));
}

export default function JuridicoTab() {
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
    () => Promise.all(JURIDICO_PREFIXES.map((prefix) => listSettings(prefix))).then((responses) => settingsByKey(...responses)),
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
  const blocked = changedFields(JURIDICO_FIELDS, values, original).some((field) => juridicoFieldError(field, values[field.key]));

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
      for (const field of changedFields(JURIDICO_FIELDS, values, original)) { // sem alteração, nenhuma gravação
        if (field.type === "integer" && String(values[field.key]).trim() === "") continue; // campo limpo não é enviado
        await updateSetting(field.key, toApiValue(field, values[field.key]));
        saved[field.key] = values[field.key];
      }
      setOriginal(saved);
      invalidateAsyncCache(CACHE_KEY);
      setSuccess("Configurações da Locação e do Jurídico salvas.");
    } catch (err) {
      setOriginal(saved); // o que já foi gravado antes da recusa fica como gravado
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : labelSettingError(err, LABELS, "Não foi possível salvar as configurações da Locação e do Jurídico."));
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="Locação e Jurídico">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações da Locação e do Jurídico.
        </Alert>
      </Card>
    );
  }

  function renderField(field) {
    const id = `jur-${field.key}`;
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
            {selectOptions(field, values[field.key]).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormField>
      );
    }
    const message = touched[field.key] ? juridicoFieldError(field, values[field.key]) : null;
    return (
      <FormField key={field.key} label={field.label} htmlFor={id} helper={`${field.helper} ${integerRangeText(field)}`} error={message}>
        <DecimalInput
          id={id}
          maxDecimals={0}
          value={String(values[field.key] ?? "")}
          onChange={(e) => handleChange(field.key, e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
          error={Boolean(message)}
        />
      </FormField>
    );
  }

  return (
    <Card
      title="Locação e Jurídico"
      subtitle="Fotos da entrega de chaves, prazos jurídicos, recebível do processo e obrigações da locação desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT" || blocked}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações da Locação e do Jurídico..." freshOnly>
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          {JURIDICO_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>{group.fields.map(renderField)}</div>
            </div>
          ))}
        </div>
      </AsyncState>
    </Card>
  );
}
