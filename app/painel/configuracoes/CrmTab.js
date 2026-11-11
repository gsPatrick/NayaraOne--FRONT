"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { isMfaSettingError, isSettingForbidden, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { settingsByKey } from "./settingsFormat";
import { CRM_FIELDS, CRM_GROUPS } from "./crmGroups";
import styles from "./page.module.css";

const defaults = () => Object.fromEntries(CRM_FIELDS.map((field) => [field.key, field.defaultValue]));

// Aba CRM de Configurações (Marco 3 §18, CRM-TS-012): política de equipe da carteira do corretor.
export default function CrmTab() {
  const [values, setValues] = useState(defaults);
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const formRef = useRef({ values: null, original: null });

  const settingsQuery = useAsyncState(() => listSettings("crm.").then((data) => settingsByKey(data)), { key: "configuracoes:crm.", isEmpty: () => false });
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
      for (const field of CRM_FIELDS.filter((f) => values[f.key] !== original[f.key])) await updateSetting(field.key, values[field.key]);
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
      <Card title="CRM">
        <Alert tone="warning" title="Sem permissão">Você não tem permissão para visualizar ou alterar as configurações do CRM.</Alert>
      </Card>
    );
  }

  return (
    <Card
      title="CRM"
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
              {group.fields.map((field) => (
                <FormField key={field.key} label={field.label} htmlFor={`crm-${field.key}`} helper={field.helper}>
                  <Select id={`crm-${field.key}`} value={values[field.key]} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </FormField>
              ))}
            </div>
          ))}
        </div>
      </AsyncState>
    </Card>
  );
}
