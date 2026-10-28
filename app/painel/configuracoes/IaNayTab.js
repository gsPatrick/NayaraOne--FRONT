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

// Parâmetros da NAY (Marco 9, bloco A) que o administrador controla. A API valida (SETTINGS_SCHEMA); o padrão mostrado é
// o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Cada demanda do bloco acrescenta
// as suas entradas em IA_GROUPS.
const IA_GROUPS = [
  {
    title: "Chave geral da NAY",
    subtitle: "Liga ou desliga a NAY inteira nesta empresa. Desligada, toda função da NAY responde que está desativada. Só quem administra a NAY altera.",
    fields: [
      {
        key: "ia.habilitada",
        label: "NAY habilitada nesta empresa",
        type: "boolean",
        defaultValue: false,
        helper: "Desligada por padrão: a NAY está em fase de laboratório e só roda onde o administrador a liga.",
      },
      {
        key: "ai.agents.enabled",
        label: "Agentes habilitados",
        type: "text",
        defaultValue: "*",
        helper: "Use * para todos os agentes ou liste os códigos separados por vírgula. Agente fora da lista responde que está desativado.",
      },
    ],
  },
  {
    title: "Memória da NAY",
    subtitle: "A NAY guarda só fatos estruturados. Guardar a conversa inteira é exceção e segue regras fixas.",
    fields: [
      {
        key: "ia.memoria.guardar_conversa_inteira",
        label: "Permitir guardar a conversa inteira como memória",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão. Ligado, só vale para decisão ou resultado de recomendação, por administrador de IA, com validade curta, sem dado restrito.",
      },
    ],
  },
];

const ALL_FIELDS = IA_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.defaultValue;
  });
  return values;
}

export default function IaNayTab() {
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
    Promise.all([listSettings("ia."), listSettings("ai.")])
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
        else setError(err?.message || "Não foi possível carregar as configurações da NAY.");
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
      setSuccess("Configurações da NAY salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações da NAY.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="IA NAY">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações da NAY.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="IA NAY"
      subtitle="Regras de segurança e de uso da inteligência da NAY nesta empresa."
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

          {IA_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    {field.type === "text" ? (
                      <FormField label={field.label} htmlFor={`ia-nay-${field.key}`} helper={field.helper}>
                        <Input
                          id={`ia-nay-${field.key}`}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </FormField>
                    ) : (
                      <>
                        <Checkbox
                          id={`ia-nay-${field.key}`}
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
