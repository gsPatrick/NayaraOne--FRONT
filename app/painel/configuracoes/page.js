"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import styles from "./page.module.css";

const THEME_STORAGE_KEY = "nayara-one:theme";

const THEMES = [
  {
    id: "onyx",
    name: "Onyx (padrão)",
    description: "Botões, sidebar e destaques em preto, título em fonte serifada — visual padrão do sistema.",
    preview: { bg: "#F7F5F1", accent: "#0D0D0D", panel: "#0D0D0D" },
  },
  {
    id: "default",
    name: "Clássico",
    description: "Dourado como cor de destaque principal (CTAs, marca) — visual anterior ao padrão atual.",
    preview: { bg: "#F7F5F1", accent: "#BE9130", panel: "#17130F" },
  },
];

function AparenciaTab() {
  const [theme, setTheme] = useState("onyx");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    setTheme(stored === "default" ? "default" : "onyx");
  }, []);

  function applyTheme(id) {
    setTheme(id);
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
    if (id === "onyx") {
      document.documentElement.dataset.theme = "onyx";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }

  return (
    <Card
      title="Aparência"
      subtitle="A cliente enviou referências visuais com mais preto na identidade — escolha aqui qual estilo usar. É possível voltar ao visual atual a qualquer momento."
    >
      <div className={styles.themeGrid}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={[styles.themeCard, theme === t.id ? styles.themeCardActive : ""].filter(Boolean).join(" ")}
            onClick={() => applyTheme(t.id)}
          >
            <span className={styles.themePreview} style={{ background: t.preview.bg }}>
              <span className={styles.themePreviewPanel} style={{ background: t.preview.panel }} />
              <span className={styles.themePreviewAccent} style={{ background: t.preview.accent }} />
            </span>
            <span className={styles.themeInfo}>
              <span className={styles.themeName}>
                {t.name}
                {theme === t.id ? <Icon name="check" size={16} className={styles.themeCheck} /> : null}
              </span>
              <span className={styles.themeDescription}>{t.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

const BILLING_KEYS = {
  lateFeePercentage: "billing.late_fee_percentage",
  interestPercentage: "billing.interest_percentage",
  gracePeriodDays: "billing.grace_period_days",
  defaultIndexCode: "billing.default_index_code",
};

// A API valida por schema (SETTINGS_SCHEMA em settings.service.js) e exige o tipo certo —
// number de verdade para os campos numéricos, não a string que <input type="number"> devolve
// em e.target.value. Sem essa conversão, salvar sempre voltava 400 (SETTING_INVALID_VALUE).
const BILLING_NUMERIC_FIELDS = new Set(["lateFeePercentage", "interestPercentage", "gracePeriodDays"]);

function toSettingValue(field, rawValue, numericFields) {
  if (!numericFields.has(field)) return rawValue;
  if (rawValue === "" || rawValue === null || rawValue === undefined) return null;
  const numeric = Number(rawValue);
  return Number.isNaN(numeric) ? null : numeric;
}

function CobrancaTab() {
  const [values, setValues] = useState({
    lateFeePercentage: "",
    interestPercentage: "",
    gracePeriodDays: "",
    defaultIndexCode: "",
  });
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
    listSettings("billing.")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        const byKey = {};
        list.forEach((item) => {
          if (item && item.key) byKey[item.key] = item.value;
        });
        const next = {
          lateFeePercentage: byKey[BILLING_KEYS.lateFeePercentage] ?? "",
          interestPercentage: byKey[BILLING_KEYS.interestPercentage] ?? "",
          gracePeriodDays: byKey[BILLING_KEYS.gracePeriodDays] ?? "",
          defaultIndexCode: byKey[BILLING_KEYS.defaultIndexCode] ?? "",
        };
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) {
          setForbidden(true);
        } else {
          setError(err?.message || "Não foi possível carregar as configurações de cobrança.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (err?.status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || "Não foi possível salvar as configurações de cobrança.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
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
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Salvar
        </Button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className={styles.formGrid}>
          {error ? (
            <Alert tone="danger" title="Erro">
              {error}
            </Alert>
          ) : null}
          {success ? <Alert tone="success">{success}</Alert> : null}

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
      )}
    </Card>
  );
}

const MFA_KEYS = {
  stepUpTtlMinutes: "mfa.step_up_ttl_minutes",
  requiredForSensitiveRoles: "mfa.required_for_sensitive_roles",
};

const MFA_NUMERIC_FIELDS = new Set(["stepUpTtlMinutes"]);

function SegurancaTab() {
  const [values, setValues] = useState({
    stepUpTtlMinutes: "",
    requiredForSensitiveRoles: false,
  });
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
    listSettings("mfa.")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        const byKey = {};
        list.forEach((item) => {
          if (item && item.key) byKey[item.key] = item.value;
        });
        const next = {
          stepUpTtlMinutes: byKey[MFA_KEYS.stepUpTtlMinutes] ?? "",
          requiredForSensitiveRoles: Boolean(byKey[MFA_KEYS.requiredForSensitiveRoles]),
        };
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) {
          setForbidden(true);
        } else {
          setError(err?.message || "Não foi possível carregar as configurações de segurança.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (err?.status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || "Não foi possível salvar as configurações de segurança.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
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
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Salvar
        </Button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className={styles.formGrid}>
          {error ? (
            <Alert tone="danger" title="Erro">
              {error}
            </Alert>
          ) : null}
          {success ? <Alert tone="success">{success}</Alert> : null}

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
          />
        </div>
      )}
    </Card>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações">
      <div className={styles.wrap}>
        <Tabs
          items={[
            { label: "Aparência", content: <AparenciaTab /> },
            { label: "Cobrança", content: <CobrancaTab /> },
            { label: "Segurança", content: <SegurancaTab /> },
          ]}
        />
      </div>
    </AppShell>
  );
}
