"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { isMfaSettingError, isSettingForbidden, mfaSettingMessage } from "@/lib/settings/errorLabel";
import { KEYS, DEFAULTS, DOCUMENT_TYPE_OPTIONS, FIELD_OPTIONS, CART_DAYS_RANGE, parseList, serializeList, validate } from "@/lib/settings/imoveisCrm";
import { settingsByKey } from "./settingsFormat";
import styles from "./page.module.css";

// Imóveis e CRM (Marco 3, verificação de 11/11/2026): o que o gate de publicação exige (documentos com arquivo e campos
// obrigatórios, decididos pelo Motor de Regras — REG-IMO-DOCS-001 e REG-IMO-FIELDS-001) e a validade do link do carrinho.
export default function ImoveisCrmTab() {
  const [values, setValues] = useState({ documentTypes: [...DEFAULTS.documentTypes], fields: [...DEFAULTS.fields], cartDays: String(DEFAULTS.cartDays) });
  const [original, setOriginal] = useState(null);
  const formRef = useRef({ values: null, original: null });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const query = useAsyncState(
    () => Promise.all([listSettings("real_estate.publication."), listSettings("crm.cart.")]).then(([a, b]) => settingsByKey(a, b)),
    { key: "configuracoes:imoveis-crm", isEmpty: () => false }
  );
  useEffect(() => {
    const byKey = query.data;
    if (!byKey) return;
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    const next = {
      documentTypes: parseList(byKey[KEYS.documentTypes], DOCUMENT_TYPE_OPTIONS, DEFAULTS.documentTypes),
      fields: parseList(byKey[KEYS.fields], FIELD_OPTIONS, DEFAULTS.fields),
      cartDays: String(byKey[KEYS.cartDays] ?? DEFAULTS.cartDays),
    };
    setValues(next);
    setOriginal(next);
  }, [query.data]);
  formRef.current = { values, original };

  const toggle = (field, value) => setValues((prev) => ({
    ...prev,
    [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
  }));

  async function handleSave() {
    const found = validate(values);
    setErrors(found);
    setError("");
    setSuccess("");
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const before = original || {};
      const docs = serializeList(values.documentTypes, DOCUMENT_TYPE_OPTIONS);
      const fields = serializeList(values.fields, FIELD_OPTIONS);
      if (docs !== serializeList(before.documentTypes || [], DOCUMENT_TYPE_OPTIONS)) await updateSetting(KEYS.documentTypes, docs);
      if (fields !== serializeList(before.fields || [], FIELD_OPTIONS)) await updateSetting(KEYS.fields, fields);
      if (Number(values.cartDays) !== Number(before.cartDays)) await updateSetting(KEYS.cartDays, Number(values.cartDays));
      setOriginal(values);
      setSuccess("Configurações de Imóveis e CRM salvas.");
    } catch (err) {
      if (isSettingForbidden(err)) setForbidden(true);
      else setError(isMfaSettingError(err) ? mfaSettingMessage(err) : err?.message || "Não foi possível salvar as configurações de Imóveis e CRM.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden || query.status === "PERMISSION_DENIED") {
    return (
      <Card title="Imóveis e CRM">
        <Alert tone="warning" title="Sem permissão">Você não tem permissão para visualizar ou alterar estas configurações.</Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Imóveis e CRM"
      subtitle="O que a publicação do imóvel exige (conferido pelo Motor de Regras) e a validade do link do carrinho de imóveis."
      actions={<Button onClick={handleSave} loading={saving} disabled={query.status !== "CONTENT"}>Salvar</Button>}
    >
      <AsyncState result={query} loadingLabel="Carregando configurações de Imóveis e CRM...">
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          <fieldset className="formGridFull">
            <legend>Documentos exigidos para publicar (só contam com o arquivo anexado)</legend>
            {DOCUMENT_TYPE_OPTIONS.map((o) => (
              <Checkbox key={o.value} id={`imo-doc-${o.value}`} label={o.label} checked={values.documentTypes.includes(o.value)} onChange={() => toggle("documentTypes", o.value)} />
            ))}
            {errors.documentTypes ? <p role="alert">{errors.documentTypes}</p> : null}
          </fieldset>

          <fieldset className="formGridFull">
            <legend>Campos obrigatórios para publicar</legend>
            {FIELD_OPTIONS.map((o) => (
              <Checkbox key={o.value} id={`imo-field-${o.value}`} label={o.label} checked={values.fields.includes(o.value)} onChange={() => toggle("fields", o.value)} />
            ))}
            {errors.fields ? <p role="alert">{errors.fields}</p> : null}
          </fieldset>

          <FormField
            label="Validade do link do carrinho (dias)"
            htmlFor="imo-cart-days"
            helper={`Entre ${CART_DAYS_RANGE.min} e ${CART_DAYS_RANGE.max}. Vale para o carrinho criado sem data própria.`}
            error={errors.cartDays}
          >
            <Input id="imo-cart-days" inputMode="numeric" value={values.cartDays} onChange={(e) => setValues((prev) => ({ ...prev, cartDays: e.target.value.replace(/\D/g, "") }))} />
          </FormField>
        </div>
      </AsyncState>
    </Card>
  );
}
