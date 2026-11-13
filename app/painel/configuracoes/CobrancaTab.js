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

export const BILLING_KEYS = {
  lateFeePercentage: "billing.late_fee_percentage",
  interestPercentage: "billing.interest_percentage",
  gracePeriodDays: "billing.grace_period_days",
  defaultIndexCode: "billing.default_index_code",
};

// A API valida por schema (SETTINGS_SCHEMA em settings.service.js) e exige o tipo certo —
// number de verdade para os campos numéricos, não a string que <input type="number"> devolve
// em e.target.value. Sem essa conversão, salvar sempre voltava 400 (SETTING_INVALID_VALUE).
const BILLING_NUMERIC_FIELDS = new Set(["lateFeePercentage", "interestPercentage", "gracePeriodDays"]);

export default function CobrancaTab() {
  const [values, setValues] = useState({
    lateFeePercentage: "",
    interestPercentage: "",
    gracePeriodDays: "",
    defaultIndexCode: "",
  });
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  // Dado fresco que chega depois de o usuário digitar não apaga o que foi digitado.
  const formRef = useRef({ values: null, original: null });
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");

  // M9-D940: carregando, erro com "tentar de novo", sem acesso (403) e sem conexão vêm do padrão único de estados.
  const settingsQuery = useAsyncState(() => listSettings("billing.").then((data) => settingsByKey(data)), { key: "configuracoes:billing.", isEmpty: () => false });
  useEffect(() => {
    const byKey = settingsQuery.data;
    if (!byKey) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = {
      lateFeePercentage: byKey[BILLING_KEYS.lateFeePercentage] ?? "",
      interestPercentage: byKey[BILLING_KEYS.interestPercentage] ?? "",
      gracePeriodDays: byKey[BILLING_KEYS.gracePeriodDays] ?? "",
      defaultIndexCode: byKey[BILLING_KEYS.defaultIndexCode] ?? "",
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
      const changed = Object.keys(BILLING_KEYS).filter((field) => values[field] !== original[field]);
      for (const field of changed) {
        const value = toSettingValue(field, values[field], BILLING_NUMERIC_FIELDS);
        if (value === null) continue; // campo limpo/inválido — não manda pra API, evita 400 à toa
        await updateSetting(BILLING_KEYS[field], value);
      }
      setOriginal(values);
      setSuccess("Configurações de cobrança salvas.");
    } catch (err) {
      if (isSettingForbidden(err)) {
        setForbidden(true);
      } else {
        setError(isMfaSettingError(err) ? mfaSettingMessage(err) : err?.message || "Não foi possível salvar as configurações de cobrança.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
    return (
      <Card title="Cobrança">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações de cobrança.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Cobrança"
      subtitle="Regras aplicadas aos boletos e lançamentos financeiros desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT"}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações de cobrança...">
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          <p className="formGridFull">
            Multa, juros e carência valem pelo Motor de Regras: ao salvar, o sistema publica uma nova versão da regra da locação que o valor alimenta
            (multa e juros: REG-LOC-001; carência: REG-LOC-002), e é essa versão que o cálculo da cobrança usa dali em diante.
          </p>

          <FormField label="Multa por atraso (%)" htmlFor="billing-late-fee">
            <Input
              id="billing-late-fee"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ex.: 2"
              value={values.lateFeePercentage}
              onChange={(e) => handleChange("lateFeePercentage", e.target.value)}
            />
          </FormField>

          <FormField label="Juros de mora (%)" htmlFor="billing-interest">
            <Input
              id="billing-interest"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ex.: 1"
              value={values.interestPercentage}
              onChange={(e) => handleChange("interestPercentage", e.target.value)}
            />
          </FormField>

          <FormField label="Dias de carência" htmlFor="billing-grace">
            <Input
              id="billing-grace"
              type="number"
              min="0"
              step="1"
              placeholder="Ex.: 5"
              value={values.gracePeriodDays}
              onChange={(e) => handleChange("gracePeriodDays", e.target.value)}
            />
          </FormField>

          <FormField label="Índice de reajuste padrão" htmlFor="billing-index">
            <Input
              id="billing-index"
              type="text"
              placeholder="Ex.: IGPM"
              value={values.defaultIndexCode}
              onChange={(e) => handleChange("defaultIndexCode", e.target.value)}
            />
          </FormField>
        </div>
      </AsyncState>
    </Card>
  );
}
