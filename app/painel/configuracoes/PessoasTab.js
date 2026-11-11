"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toNumber } from "@/lib/format";
import { isSettingForbidden } from "@/lib/settings/errorLabel";
import { changedFields, integerFieldError, integerRangeText, invalidChangedFields, loadedValue, settingsByKey } from "./settingsFormat";
import styles from "./page.module.css";

// Pessoas do grupo (DI-M9I-5): limite de tentativas de vínculo que não conferem. Padrões de Maturacao/demandas/parametros.csv; a API valida a faixa.
// A proteção contra descobrir CPF/CNPJ de outra empresa não tem parâmetro: o vínculo sempre exige o nome que confere e a permissão people:link.
export const PESSOAS_VINCULO_FIELDS = [
  {
    key: "people.vinculo.tentativas_max",
    label: "Tentativas sem conferência por pessoa usuária (vínculo de pessoa do grupo)",
    type: "integer",
    defaultValue: 10,
    min: 1,
    max: 1000,
    helper: "Conta os vínculos em que o CPF/CNPJ e o nome não conferiram e os cadastros recusados porque o CPF/CNPJ já existe em outra empresa do grupo. Passado o limite, a pessoa usuária espera a janela para tentar de novo.",
  },
  {
    key: "people.vinculo.janela_minutos",
    label: "Janela da contagem de tentativas (minutos)",
    type: "integer",
    defaultValue: 60,
    min: 1,
    max: 1440,
    helper: "Período em que as tentativas sem conferência são somadas.",
  },
];

const inicial = () => Object.fromEntries(PESSOAS_VINCULO_FIELDS.map((f) => [f.key, f.defaultValue]));

export default function PessoasTab() {
  const [values, setValues] = useState(inicial);
  const [original, setOriginal] = useState(null);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const formRef = useRef({ values: null, original: null });

  const query = useAsyncState(() => listSettings("people.").then((data) => settingsByKey(data)), { key: "configuracoes:people.", isEmpty: () => false });
  useEffect(() => {
    const byKey = query.data;
    if (!byKey || !canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = Object.fromEntries(PESSOAS_VINCULO_FIELDS.map((f) => [f.key, loadedValue(f, byKey[f.key])]));
    setValues(next);
    setOriginal(next);
  }, [query.data]);
  formRef.current = { values, original };

  const blocked = invalidChangedFields(PESSOAS_VINCULO_FIELDS, values, original).length > 0;

  async function handleSave() {
    if (!original || blocked) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      for (const field of changedFields(PESSOAS_VINCULO_FIELDS, values, original)) {
        await updateSetting(field.key, toNumber(values[field.key]));
      }
      setOriginal(values);
      setSuccess("Configurações de Pessoas salvas.");
    } catch (err) {
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações de Pessoas.");
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

  return (
    <Card
      title="Pessoas do grupo"
      subtitle="Quem tem a permissão de vincular pessoas traz para esta empresa um cadastro que outra empresa do grupo já fez, informando o CPF/CNPJ e o nome. Estes números limitam as tentativas que não conferem."
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
          {PESSOAS_VINCULO_FIELDS.map((field) => {
            const id = `pessoas-${field.key.replace(/\./g, "-")}`;
            const erro = touched[field.key] ? integerFieldError(field, values[field.key]) : null;
            return (
              <FormField key={field.key} label={field.label} htmlFor={id} helper={`${field.helper} ${integerRangeText(field)}`} error={erro || undefined}>
                <Input
                  id={id}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step="1"
                  value={values[field.key]}
                  error={Boolean(erro)}
                  onChange={(e) => { setValues((prev) => ({ ...prev, [field.key]: e.target.value })); setSuccess(""); }}
                  onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
                />
              </FormField>
            );
          })}
        </div>
      </AsyncState>
    </Card>
  );
}
