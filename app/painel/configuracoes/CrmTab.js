"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { canResetForm } from "@/lib/asyncState/formSync";
import { invalidateAsyncCache, useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { useActiveUsers } from "@/lib/legal/useActiveUsers";
import { buildLabelMap, isMfaSettingError, isSettingForbidden, labelSettingError, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { changedFields, integerRangeText, loadedValue, settingsByKey } from "./settingsFormat";
import { CRM_FIELDS, CRM_GROUPS, CRM_PREFIXES } from "./crmGroups";
import { crmFieldError, crmApiValue } from "./crmSettingsRules";
import styles from "./page.module.css";

// Aba "CRM" de Configurações (Marco 3, DI-M3CA): motivos de desfecho, SLA da ocorrência, escalonamento e responsável do lead
// automático. Mesmo caminho das outras abas (GET /settings?prefix=crm., PUT /settings/:key); a API valida e audita.
const CACHE_KEY = "configuracoes:crm";
const LABELS = buildLabelMap(CRM_FIELDS);

function formFrom(byKey) {
  return Object.fromEntries(CRM_FIELDS.map((field) => [field.key, String(loadedValue(field, byKey ? byKey[field.key] : undefined) ?? "")]));
}

export default function CrmTab() {
  const [values, setValues] = useState(() => formFrom(null));
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");
  const [touched, setTouched] = useState({});
  const formRef = useRef({ values: null, original: null });
  const { users, error: usersError } = useActiveUsers();

  const settingsQuery = useAsyncState(
    () => Promise.all(CRM_PREFIXES.map((prefix) => listSettings(prefix))).then((responses) => settingsByKey(...responses)),
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
  const blocked = changedFields(CRM_FIELDS, values, original).some((field) => crmFieldError(field, values[field.key]));

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
      for (const field of changedFields(CRM_FIELDS, values, original)) {
        if (String(values[field.key]).trim() === "") continue; // campo limpo não é enviado (vale o padrão)
        await updateSetting(field.key, crmApiValue(field, values[field.key]));
        saved[field.key] = values[field.key];
      }
      setOriginal(saved);
      invalidateAsyncCache(CACHE_KEY);
      setSuccess("Configurações do CRM salvas.");
    } catch (err) {
      setOriginal(saved);
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : labelSettingError(err, LABELS, "Não foi possível salvar as configurações do CRM."));
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="CRM">
        <Alert tone="warning" title="Sem permissão">Você não tem permissão para visualizar ou alterar as configurações do CRM.</Alert>
      </Card>
    );
  }

  function renderField(field) {
    const id = `crm-${field.key}`;
    const message = touched[field.key] ? crmFieldError(field, values[field.key]) : null;
    const blur = () => setTouched((prev) => ({ ...prev, [field.key]: true }));
    if (field.type === "user") {
      return (
        <FormField key={field.key} label={field.label} htmlFor={id} helper={usersError || field.helper}>
          <Select id={id} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)}>
            <option value="">Gestor mais antigo da empresa (padrão)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </FormField>
      );
    }
    if (field.type === "integer") {
      return (
        <FormField key={field.key} label={field.label} htmlFor={id} helper={`${field.helper} ${integerRangeText(field)}`} error={message}>
          <DecimalInput id={id} maxDecimals={0} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)} onBlur={blur} error={Boolean(message)} />
        </FormField>
      );
    }
    return (
      <div key={field.key} className="formGridFull">
        <FormField label={field.label} htmlFor={id} helper={field.helper} error={message}>
          <Input id={id} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)} onBlur={blur} error={Boolean(message)} />
        </FormField>
      </div>
    );
  }

  return (
    <Card
      title="CRM"
      subtitle="Motivos de ganho e perda, prazos de SLA das ocorrências, escalonamento para a gerência e responsável do lead automático."
      actions={<Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT" || blocked}>Salvar</Button>}
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações do CRM..." freshOnly>
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
              <div className={styles.formGrid}>{group.fields.map(renderField)}</div>
            </div>
          ))}
        </div>
      </AsyncState>
    </Card>
  );
}
