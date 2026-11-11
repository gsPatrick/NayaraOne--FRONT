"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toSettingValue, settingsByKey } from "./settingsFormat";
import styles from "./page.module.css";
import { isMfaSettingError, isSettingForbidden, mfaSettingMessage } from "@/lib/settings/errorLabel";

const MFA_KEYS = {
  stepUpTtlMinutes: "mfa.step_up_ttl_minutes",
  requiredForSensitiveRoles: "mfa.required_for_sensitive_roles",
};

const MFA_NUMERIC_FIELDS = new Set(["stepUpTtlMinutes"]);

export default function SegurancaTab() {
  const [values, setValues] = useState({
    stepUpTtlMinutes: "",
    requiredForSensitiveRoles: false,
  });
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  // Dado fresco que chega depois de o usuário digitar não apaga o que foi digitado.
  const formRef = useRef({ values: null, original: null });
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");

  // M9-D940: carregando, erro com "tentar de novo", sem acesso (403) e sem conexão vêm do padrão único de estados.
  const settingsQuery = useAsyncState(() => listSettings("mfa.").then((data) => settingsByKey(data)), { key: "configuracoes:mfa.", isEmpty: () => false });
  useEffect(() => {
    const byKey = settingsQuery.data;
    if (!byKey) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = {
      stepUpTtlMinutes: byKey[MFA_KEYS.stepUpTtlMinutes] ?? "",
      requiredForSensitiveRoles: Boolean(byKey[MFA_KEYS.requiredForSensitiveRoles]),
    };
    setValues(next);
    setOriginal(next);
  }, [settingsQuery.data]);

  formRef.current = { values, original };

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = Object.keys(MFA_KEYS).filter((field) => values[field] !== original[field]);
      for (const field of changed) {
        const value = toSettingValue(field, values[field], MFA_NUMERIC_FIELDS);
        if (value === null) continue; // campo limpo/inválido — não manda pra API, evita 400 à toa
        await updateSetting(MFA_KEYS[field], value);
      }
      setOriginal(values);
      setSuccess("Configurações de segurança salvas.");
    } catch (err) {
      if (isSettingForbidden(err)) {
        setForbidden(true);
      } else {
        setError(isMfaSettingError(err) ? mfaSettingMessage(err) : err?.message || "Não foi possível salvar as configurações de segurança.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="Segurança">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações de segurança.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Segurança"
      subtitle="Regras de autenticação em duas etapas (MFA) aplicadas a esta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT"}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações de segurança...">
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          <FormField label="Duração da janela MFA (minutos)" htmlFor="mfa-ttl" helper="Entre 1 e 120 minutos.">
            <Input
              id="mfa-ttl"
              type="number"
              min="1"
              max="120"
              step="1"
              placeholder="Ex.: 15"
              value={values.stepUpTtlMinutes}
              onChange={(e) => handleChange("stepUpTtlMinutes", e.target.value)}
            />
          </FormField>

          <Checkbox
            id="mfa-required-sensitive"
            label="Exigir MFA para financeiro/jurídico/admin"
            checked={values.requiredForSensitiveRoles}
            onChange={(e) => handleChange("requiredForSensitiveRoles", e.target.checked)}
            className="formGridFull"
          />
        </div>
      </AsyncState>
    </Card>
  );
}
