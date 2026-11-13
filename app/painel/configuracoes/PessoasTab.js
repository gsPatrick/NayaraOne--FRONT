"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { canResetForm } from "@/lib/asyncState/formSync";
import { invalidateAsyncCache, useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toNumber } from "@/lib/format";
import { buildLabelMap, isMfaSettingError, isSettingForbidden, labelSettingError, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { changedFields, decimalFieldError, decimalInRange, decimalRangeText, integerFieldError, integerInRange, integerRangeError, integerRangeText, loadedValue, settingsByKey } from "./settingsFormat";
import { PESSOAS_FIELDS, PESSOAS_GROUPS, PESSOAS_VINCULO_FIELDS } from "./pessoasGroups";
import styles from "./page.module.css";

// Aba Pessoas de Configurações: vínculo de pessoa do grupo (DI-M9I-5), catálogo de papéis (DI-M3PE-2), deduplicação (DI-M3PE-3/4) e cadastro por
// documento (DI-M3PE-6). Mesmo caminho das outras abas (GET /settings?prefix=people., PUT /settings/:key); a API valida e audita.
export { PESSOAS_VINCULO_FIELDS, PESSOAS_FIELDS };
const CACHE_KEY = "configuracoes:people.";
const LABELS = buildLabelMap(PESSOAS_FIELDS);

const toFormValue = (field, raw) => {
  const value = loadedValue(field, raw);
  if (field.type === "boolean") return value;
  if (field.type === "decimal") return String(value ?? "").replace(".", ",");
  return String(value ?? "");
};
const formFrom = (byKey) => Object.fromEntries(PESSOAS_FIELDS.map((f) => [f.key, toFormValue(f, byKey ? byKey[f.key] : undefined)]));

export function pessoasFieldError(field, raw) {
  if (field.type === "integer") return integerFieldError(field, raw);
  if (field.type === "decimal") return decimalFieldError(field, raw);
  if (field.type === "text" && String(raw ?? "").trim() === "") return "Informe um valor.";
  return null;
}

/** Valor que vai para a API, conferido contra a faixa (lança com a frase da faixa). */
export function pessoasApiValue(field, raw) {
  if (field.type === "boolean") return Boolean(raw);
  if (field.type === "text") return String(raw).trim();
  const value = toNumber(raw);
  if (field.type === "integer") {
    if (!integerInRange(value, field)) throw new Error(integerRangeError(field));
    return value;
  }
  if (!decimalInRange(value, field)) throw new Error(`"${field.label}" deve ser um número. ${decimalRangeText(field)}`);
  return value;
}

export default function PessoasTab() {
  const [values, setValues] = useState(() => formFrom(null));
  const [original, setOriginal] = useState(null);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const formRef = useRef({ values: null, original: null });

  const query = useAsyncState(() => listSettings("people.").then((data) => settingsByKey(data)), { key: CACHE_KEY, isEmpty: () => false });
  useEffect(() => {
    if (!query.data || !canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = formFrom(query.data);
    setValues(next);
    setOriginal(next);
  }, [query.data]);
  formRef.current = { values, original };

  const blocked = changedFields(PESSOAS_FIELDS, values, original).some((field) => pessoasFieldError(field, values[field.key]));

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!original || blocked) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const saved = { ...original };
    try {
      for (const field of changedFields(PESSOAS_FIELDS, values, original)) {
        await updateSetting(field.key, pessoasApiValue(field, values[field.key]));
        saved[field.key] = values[field.key];
      }
      setOriginal(saved);
      invalidateAsyncCache(CACHE_KEY);
      invalidateAsyncCache("pessoas:papeis");
      setSuccess("Configurações de Pessoas salvas.");
    } catch (err) {
      setOriginal(saved);
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : labelSettingError(err, LABELS, "Não foi possível salvar as configurações de Pessoas."));
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || query.status === "PERMISSION_DENIED") {
    return (
      <Card title="Pessoas">
        <Alert tone="warning" title="Sem permissão">Você não tem permissão para visualizar ou alterar as configurações de Pessoas.</Alert>
      </Card>
    );
  }

  function renderField(field) {
    const id = `pessoas-${field.key.replace(/\./g, "-")}`;
    if (field.type === "boolean") {
      return (
        <div key={field.key}>
          <Checkbox id={id} label={field.label} checked={Boolean(values[field.key])} onChange={(e) => handleChange(field.key, e.target.checked)} />
          <p>{field.helper}</p>
        </div>
      );
    }
    const message = touched[field.key] ? pessoasFieldError(field, values[field.key]) : null;
    const range = field.type === "integer" ? ` ${integerRangeText(field)}` : field.type === "decimal" ? ` ${decimalRangeText(field)}` : "";
    const commonProps = {
      id,
      value: String(values[field.key] ?? ""),
      error: Boolean(message),
      onChange: (e) => handleChange(field.key, e.target.value),
      onBlur: () => setTouched((prev) => ({ ...prev, [field.key]: true })),
    };
    return (
      <div key={field.key} className={field.type === "text" ? "formGridFull" : undefined}>
        <FormField label={field.label} htmlFor={id} helper={`${field.helper}${range}`} error={message || undefined}>
          {field.type === "text" ? <Input {...commonProps} /> : <DecimalInput {...commonProps} maxDecimals={field.type === "integer" ? 0 : field.maxDecimals} />}
        </FormField>
      </div>
    );
  }

  return (
    <Card
      title="Pessoas"
      subtitle="Cadastro de pessoas: vínculo entre empresas do grupo, papéis, cadastro repetido e cadastro por documento."
      actions={<Button onClick={handleSave} loading={saving} disabled={query.status !== "CONTENT" || blocked}>Salvar</Button>}
    >
      <AsyncState result={query} loadingLabel="Carregando configurações de Pessoas...">
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}
          {PESSOAS_GROUPS.map((group) => (
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
