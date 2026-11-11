"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { isMfaSettingError, isSettingForbidden, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { toNumber } from "@/lib/format";
import { integerFieldError, integerInRange, integerRangeError, settingsByKey } from "./settingsFormat";
import { CRM_CARTEIRA_FIELDS as CRM_FIELDS, CRM_CARTEIRA_GROUPS as CRM_GROUPS } from "./crmCarteiraGroups";
import styles from "./page.module.css";

const defaults = () => Object.fromEntries(CRM_FIELDS.map((field) => [field.key, field.defaultValue]));

// Aba "CRM: carteira e exportação" de Configurações (Marco 3 §18, CRM-TS-012, M3-21): política da carteira do corretor e exportação da base.
export default function CrmCarteiraTab() {
  const [values, setValues] = useState(defaults);
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const formRef = useRef({ values: null, original: null });

  const settingsQuery = useAsyncState(() => Promise.all([listSettings("crm."), listSettings("exportacao.crm.")]).then(([crm, exportacao]) => settingsByKey(crm, exportacao)), { key: "configuracoes:crm.carteira", isEmpty: () => false });
  useEffect(() => {
    const byKey = settingsQuery.data;
    if (!byKey) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = { ...defaults(), ...Object.fromEntries(CRM_FIELDS.filter((f) => byKey[f.key] !== undefined).map((f) => [f.key, byKey[f.key]])) };
    setValues(next);
    setOriginal(next);
  }, [settingsQuery.data]);
  formRef.current = { values, original };

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      for (const field of CRM_FIELDS.filter((f) => values[f.key] !== original[f.key])) {
        let value = values[field.key];
        if (field.type === "integer") {
          value = toNumber(value);
          if (!integerInRange(value, field)) throw new Error(integerRangeError(field));
        }
        await updateSetting(field.key, value);
      }
      setOriginal(values);
      setSuccess("Configurações do CRM salvas.");
    } catch (err) {
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : err?.message || "Não foi possível salvar as configurações do CRM.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="CRM: carteira e exportação">
        <Alert tone="warning" title="Sem permissão">Você não tem permissão para visualizar ou alterar as configurações do CRM.</Alert>
      </Card>
    );
  }

  return (
    <Card
      title="CRM: carteira e exportação"
      subtitle="Regras do CRM aplicadas a todos os usuários desta empresa."
      actions={<Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT"}>Salvar</Button>}
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações do CRM...">
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}
          {CRM_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              {group.fields.map((field) => <CrmField key={field.key} field={field} value={values[field.key]} onChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))} />)}
            </div>
          ))}
        </div>
      </AsyncState>
    </Card>
  );
}

/** Um campo da aba CRM: lista (Select), inteiro (DecimalInput sem casas) ou liga/desliga (Checkbox). */
function CrmField({ field, value, onChange }) {
  const id = `crm-${field.key}`;
  if (field.type === "boolean") {
    return (
      <div>
        <Checkbox id={id} label={field.label} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <p>{field.helper}</p>
      </div>
    );
  }
  if (field.type === "integer") {
    const error = integerFieldError(field, value);
    return (
      <FormField label={field.label} htmlFor={id} helper={field.helper} error={error || undefined}>
        <DecimalInput id={id} maxDecimals={0} value={String(value ?? "")} error={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
      </FormField>
    );
  }
  return (
    <FormField label={field.label} htmlFor={id} helper={field.helper}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    </FormField>
  );
}
