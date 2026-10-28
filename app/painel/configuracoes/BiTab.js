"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import styles from "./page.module.css";

// Parâmetros do BI e Centro de Comando (Marco 9, bloco D) que o administrador controla. A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Cada demanda do bloco
// acrescenta as suas entradas em BI_GROUPS.
const BI_GROUPS = [
  {
    title: "Painéis somente leitura",
    subtitle: "Os painéis do BI só mostram números: nenhum campo permite editar o valor de um indicador. Para mudar um número, corrija o lançamento na origem (por exemplo, no Financeiro).",
    fields: [
      {
        key: "analytics.leitura.role_somente_leitura",
        label: "Consultar o BI com o perfil de banco sem permissão de escrita",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão: além da transação somente leitura (que não pode ser desligada), as consultas do BI usam um perfil de banco que nem tem permissão de gravar. Só tem efeito se o ambiente tiver esse perfil criado.",
      },
    ],
  },
];

const ALL_FIELDS = BI_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.defaultValue;
  });
  return values;
}

export default function BiTab() {
  const [values, setValues] = useState(initialValues);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setForbidden(false);
    Promise.all([listSettings("analytics.")])
      .then((results) => {
        if (cancelled) return;
        const list = results.flatMap((data) => (Array.isArray(data) ? data : Object.values(data || {})));
        const next = initialValues();
        list.forEach((item) => {
          if (!item || !item.key || !Object.prototype.hasOwnProperty.call(next, item.key)) return;
          next[item.key] = item.value;
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações do BI.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = ALL_FIELDS.filter((field) => values[field.key] !== original[field.key]);
      for (const field of changed) {
        await updateSetting(field.key, values[field.key]);
      }
      setOriginal(values);
      setSuccess("Configurações do BI salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações do BI.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="BI e Centro de Comando">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações do BI.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="BI e Centro de Comando"
      subtitle="Regras de segurança e de uso dos painéis e indicadores desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Salvar
        </Button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          {BI_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    {field.type === "text" ? (
                      <FormField label={field.label} htmlFor={`bi-${field.key}`} helper={field.helper}>
                        <Input
                          id={`bi-${field.key}`}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </FormField>
                    ) : (
                      <>
                        <Checkbox
                          id={`bi-${field.key}`}
                          label={field.label}
                          checked={Boolean(values[field.key])}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                        />
                        {field.helper ? <p>{field.helper}</p> : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
