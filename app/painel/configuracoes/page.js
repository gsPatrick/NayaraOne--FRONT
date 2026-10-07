"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Spinner from "@/components/atoms/Spinner/Spinner";
import ClicksignLogo from "@/components/atoms/ClicksignLogo/ClicksignLogo";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import FgvLogo from "@/components/atoms/FgvLogo/FgvLogo";
import PortoSeguroLogo from "@/components/atoms/PortoSeguroLogo/PortoSeguroLogo";
import JuntoSegurosLogo from "@/components/atoms/JuntoSegurosLogo/JuntoSegurosLogo";
import YelumLogo from "@/components/atoms/YelumLogo/YelumLogo";
import { listSettings, updateSetting, getIntegrationsStatus } from "@/lib/api/settings";
import styles from "./page.module.css";

// Cor oficial de marca de cada provedor integrado (mesma fonte que alimenta os componentes de
// logo — ClicksignLogo.module.css usa #F15A29, banks.js usa #EC0000 pro código 033/Santander).
// Repetida aqui porque o cartão temático precisa dela em tempo de render pra montar o
// fundo/borda tingidos — os componentes de logo não expõem a cor como prop.
const CLICKSIGN_BRAND_COLOR = "#F15A29";
const SANTANDER_BRAND_COLOR = "#EC0000";
const FGV_BRAND_COLOR = "#002776";
const PORTO_SEGURO_BRAND_COLOR = "#003DA5";
const JUNTO_SEGUROS_BRAND_COLOR = "#00B2A9";
const YELUM_BRAND_COLOR = "#F7941D";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(value, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Monta as CSS custom properties consumidas por .brandCard (page.module.css) — fundo bem suave
// (6% de opacidade) e borda um pouco mais forte (18%) na cor oficial da marca, pra cada seção
// de integração carregar visualmente a identidade da empresa integrada, sem brigar com o texto.
function brandCardStyle(brandHex) {
  const { r, g, b } = hexToRgb(brandHex);
  return {
    "--brand-tint": `rgba(${r}, ${g}, ${b}, 0.06)`,
    "--brand-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
  };
}

// Badge de status de conexão de uma integração externa. Nunca fica "indefinido": enquanto o
// teste de conexão real está rodando mostra "Testando...", e cai em "Não configurado" (neutro)
// quando não há token salvo pra aquele provider — só tenta "Conectado"/"Não conectado" quando
// de fato há algo configurado pra testar.
function StatusBadge({ status, testing }) {
  if (testing) {
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Testando...</span>;
  }
  if (!status || !status.configured) {
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Não configurado</span>;
  }
  if (status.connected) {
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>● Conectado</span>;
  }
  const reasonLabel =
    status.reason === "timeout" ? "Tempo esgotado" : status.reason ? "Falha de autenticação" : null;
  return (
    <span className={`${styles.badge} ${styles.badgeDanger}`} title={reasonLabel || undefined}>
      ● Não conectado{reasonLabel ? ` — ${reasonLabel}` : ""}
    </span>
  );
}

// Campo de segredo (token/webhook secret): quando já há um valor salvo, mostra um estado
// somente-leitura com um botão "Alterar" — clicar troca pra um input vazio de verdade, pronto
// pra digitar um valor novo (o backend NUNCA devolve o segredo real, então não há nada pra
// "revelar", só pra substituir). "Cancelar" volta ao estado somente-leitura sem perder o valor
// já salvo no backend (só descarta o que foi digitado, ainda não enviado).
function SecretField({ id, label, configured, value, onChange, editing, onStartEdit, onCancelEdit, placeholder }) {
  const showReadOnly = configured && !editing;
  return (
    <FormField
      label={
        <span className={styles.secretLabel}>
          {label} <span title="Valor sensível protegido — nunca exibido em texto claro">🔒</span>
        </span>
      }
      htmlFor={id}
    >
      {showReadOnly ? (
        <div className={styles.secretReadOnlyRow}>
          <Input id={id} type="password" value="••••••••••••" disabled readOnly />
          <Button type="button" variant="secondary" onClick={onStartEdit}>
            Alterar
          </Button>
        </div>
      ) : (
        <div className={styles.secretReadOnlyRow}>
          <Input
            id={id}
            type="password"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={editing}
          />
          {configured ? (
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
      )}
    </FormField>
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
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

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
      )}
    </Card>
  );
}

const INTEGRACOES_KEYS = {
  signatureProvider: "legal.signature_provider",
  clicksignApiToken: "legal.clicksign_api_token",
  clicksignWebhookSecret: "legal.clicksign_webhook_secret",
  zapsignApiToken: "legal.zapsign_api_token",
  zapsignWebhookSecret: "legal.zapsign_webhook_secret",
  igpmMode: "billing.igpm_mode",
  fgvApiToken: "billing.fgv_api_token",
  bankPaymentProvider: "finance.payment_provider",
  santanderEnvironment: "finance.santander_environment",
  santanderWorkspaceId: "finance.santander_workspace_id",
  santanderClientId: "finance.santander_client_id",
  santanderClientSecret: "finance.santander_client_secret",
  santanderCertPem: "finance.santander_cert_pem",
  santanderKeyPem: "finance.santander_key_pem",
  insuranceProvider: "procurement.insurance_provider",
  portoSeguroEnvironment: "procurement.porto_seguro_environment",
  portoSeguroClientId: "procurement.porto_seguro_client_id",
  portoSeguroClientSecret: "procurement.porto_seguro_client_secret",
  yelumEnvironment: "procurement.yelum_environment",
  yelumApiKey: "procurement.yelum_api_key",
};

// Todos os campos desta aba são string no SETTINGS_SCHEMA (enum ou token) — nenhuma
// conversão numérica é necessária aqui, ao contrário da aba Cobrança.
const INTEGRACOES_NUMERIC_FIELDS = new Set();

// Campos marcados `encrypted: true` no SETTINGS_SCHEMA do backend: o GET devolve o valor já
// criptografado (ciphertext, não o segredo em texto claro — nunca há vazamento real), mas não
// faz sentido pré-preencher um campo de senha com esse blob. Esses campos sempre carregam
// vazios; `configuredFlags` indica (via placeholder) que já existe um valor salvo, e só são
// enviados de volta ao salvar se o usuário digitar algo novo.
const INTEGRACOES_SECRET_FIELDS = new Set([
  "clicksignApiToken",
  "clicksignWebhookSecret",
  "zapsignApiToken",
  "zapsignWebhookSecret",
  "fgvApiToken",
  "santanderClientId",
  "santanderClientSecret",
  "santanderCertPem",
  "santanderKeyPem",
  "portoSeguroClientId",
  "portoSeguroClientSecret",
  "yelumApiKey",
]);

function IntegracoesTab() {
  const [values, setValues] = useState({
    // Único provedor exposto na UI é a Clicksign (decisão de produto) — sempre fixo aqui,
    // nunca lido nem sobrescrito por um valor "sandbox"/"zapsign" antigo salvo no tenant.
    signatureProvider: "clicksign",
    clicksignApiToken: "",
    clicksignWebhookSecret: "",
    zapsignApiToken: "",
    zapsignWebhookSecret: "",
    igpmMode: "manual",
    fgvApiToken: "",
    // Provider bancário (PIX/Boleto) — "sandbox" é o default seguro, sem nenhum dado real
    // configurado; "santander" só fica ativo quando as 5 credenciais abaixo estiverem salvas
    // (resolveBankAdapter.js cai pro sandbox se qualquer uma faltar).
    bankPaymentProvider: "sandbox",
    santanderEnvironment: "sandbox",
    santanderWorkspaceId: "",
    santanderClientId: "",
    santanderClientSecret: "",
    santanderCertPem: "",
    santanderKeyPem: "",
    // Insurance Hub (Marco 7) — mesmo default seguro: "sandbox" sem credencial nenhuma.
    insuranceProvider: "sandbox",
    portoSeguroEnvironment: "sandbox",
    portoSeguroClientId: "",
    portoSeguroClientSecret: "",
    yelumEnvironment: "sandbox",
    yelumApiKey: "",
  });
  const [configuredFlags, setConfiguredFlags] = useState({});
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");
  const [integrationsStatus, setIntegrationsStatus] = useState(null);
  const [statusTesting, setStatusTesting] = useState(false);
  // Quais campos de segredo estão no modo "editar novo valor" (input vazio pronto pra digitar).
  const [editingSecrets, setEditingSecrets] = useState({});

  function refreshIntegrationsStatus() {
    setStatusTesting(true);
    getIntegrationsStatus()
      .then((data) => setIntegrationsStatus(data))
      .catch(() => setIntegrationsStatus(null))
      .finally(() => setStatusTesting(false));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setForbidden(false);
    Promise.all([listSettings("legal."), listSettings("billing."), listSettings("finance."), listSettings("procurement.")])
      .then(([legalData, billingData, financeData, procurementData]) => {
        if (cancelled) return;
        const list = [
          ...(Array.isArray(legalData) ? legalData : Object.values(legalData || {})),
          ...(Array.isArray(billingData) ? billingData : Object.values(billingData || {})),
          ...(Array.isArray(financeData) ? financeData : Object.values(financeData || {})),
          ...(Array.isArray(procurementData) ? procurementData : Object.values(procurementData || {})),
        ];
        const byKey = {};
        list.forEach((item) => {
          if (item && item.key) byKey[item.key] = item.value;
        });
        const next = {
          // Sempre "clicksign" na UI, mesmo que o tenant tenha "sandbox"/"zapsign" salvo de
          // antes da decisão de produto — a troca de provider deixou de ser uma opção aqui.
          signatureProvider: "clicksign",
          clicksignApiToken: "",
          clicksignWebhookSecret: "",
          zapsignApiToken: "",
          zapsignWebhookSecret: "",
          igpmMode: byKey[INTEGRACOES_KEYS.igpmMode] || "manual",
          fgvApiToken: "",
          bankPaymentProvider: byKey[INTEGRACOES_KEYS.bankPaymentProvider] || "sandbox",
          santanderEnvironment: byKey[INTEGRACOES_KEYS.santanderEnvironment] || "sandbox",
          santanderWorkspaceId: byKey[INTEGRACOES_KEYS.santanderWorkspaceId] || "",
          santanderClientId: "",
          santanderClientSecret: "",
          santanderCertPem: "",
          santanderKeyPem: "",
          insuranceProvider: byKey[INTEGRACOES_KEYS.insuranceProvider] || "sandbox",
          portoSeguroEnvironment: byKey[INTEGRACOES_KEYS.portoSeguroEnvironment] || "sandbox",
          portoSeguroClientId: "",
          portoSeguroClientSecret: "",
          yelumEnvironment: byKey[INTEGRACOES_KEYS.yelumEnvironment] || "sandbox",
          yelumApiKey: "",
        };
        setValues(next);
        setOriginal(next);
        // Garante que o backend também reflita "clicksign" quando o tenant ainda tinha um
        // valor antigo salvo (ex.: "sandbox"/"zapsign", de antes da decisão de produto) — a UI
        // só mostra Clicksign, então o provider efetivo usado pelo fluxo de assinatura real
        // precisa acompanhar, sem depender de o usuário clicar em "Salvar".
        const storedProvider = byKey[INTEGRACOES_KEYS.signatureProvider];
        if (storedProvider && storedProvider !== "clicksign") {
          updateSetting(INTEGRACOES_KEYS.signatureProvider, "clicksign").catch(() => {});
        }
        setConfiguredFlags({
          clicksignApiToken: Boolean(byKey[INTEGRACOES_KEYS.clicksignApiToken]),
          clicksignWebhookSecret: Boolean(byKey[INTEGRACOES_KEYS.clicksignWebhookSecret]),
          zapsignApiToken: Boolean(byKey[INTEGRACOES_KEYS.zapsignApiToken]),
          zapsignWebhookSecret: Boolean(byKey[INTEGRACOES_KEYS.zapsignWebhookSecret]),
          fgvApiToken: Boolean(byKey[INTEGRACOES_KEYS.fgvApiToken]),
          santanderClientId: Boolean(byKey[INTEGRACOES_KEYS.santanderClientId]),
          santanderClientSecret: Boolean(byKey[INTEGRACOES_KEYS.santanderClientSecret]),
          santanderCertPem: Boolean(byKey[INTEGRACOES_KEYS.santanderCertPem]),
          santanderKeyPem: Boolean(byKey[INTEGRACOES_KEYS.santanderKeyPem]),
          portoSeguroClientId: Boolean(byKey[INTEGRACOES_KEYS.portoSeguroClientId]),
          portoSeguroClientSecret: Boolean(byKey[INTEGRACOES_KEYS.portoSeguroClientSecret]),
          yelumApiKey: Boolean(byKey[INTEGRACOES_KEYS.yelumApiKey]),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) {
          setForbidden(true);
        } else {
          setError(err?.message || "Não foi possível carregar as configurações de integrações.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    refreshIntegrationsStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function startEditSecret(field) {
    setEditingSecrets((prev) => ({ ...prev, [field]: true }));
    setValues((prev) => ({ ...prev, [field]: "" }));
  }

  function cancelEditSecret(field) {
    setEditingSecrets((prev) => ({ ...prev, [field]: false }));
    setValues((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = Object.keys(INTEGRACOES_KEYS).filter((field) => values[field] !== original[field]);
      for (const field of changed) {
        // Campo de segredo deixado em branco: nunca é enviado (o backend exige string não
        // vazia, e um campo vazio aqui só significa "usuário não quis alterar", não "apagar").
        if (INTEGRACOES_SECRET_FIELDS.has(field) && values[field] === "") continue;
        const value = toSettingValue(field, values[field], INTEGRACOES_NUMERIC_FIELDS);
        if (value === null) continue; // campo limpo/inválido — não manda pra API, evita 400 à toa
        await updateSetting(INTEGRACOES_KEYS[field], value);
      }
      setConfiguredFlags((prev) => {
        const next = { ...prev };
        changed.forEach((field) => {
          if (INTEGRACOES_SECRET_FIELDS.has(field) && values[field] !== "") next[field] = true;
        });
        return next;
      });
      setOriginal((prev) => ({
        ...values,
        // Campos de segredo voltam a "vazio" no estado de referência: o valor real (novo ou
        // preexistente) só existe criptografado no backend a partir daqui.
        ...Object.fromEntries(Array.from(INTEGRACOES_SECRET_FIELDS).map((field) => [field, ""])),
      }));
      setValues((prev) => ({
        ...prev,
        ...Object.fromEntries(Array.from(INTEGRACOES_SECRET_FIELDS).map((field) => [field, ""])),
      }));
      setEditingSecrets({});
      setSuccess("Configurações de integrações salvas.");
      refreshIntegrationsStatus();
    } catch (err) {
      if (err?.status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || "Não foi possível salvar as configurações de integrações.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="Integrações">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações de integrações.
        </Alert>
      </Card>
    );
  }

  // Decisão de produto: o único provedor de assinatura eletrônica suportado na UI é a
  // Clicksign — o backend ainda entende "zapsign" no schema (compatibilidade/uso futuro), mas
  // a interface não oferece mais essa opção nem exibe campos de ZapSign.
  const isClicksign = values.signatureProvider === "clicksign";
  const isIgpmAutomatic = values.igpmMode === "automatic";

  return (
    <Card
      title="Integrações"
      subtitle="Provedores externos usados em assinatura eletrônica de contratos, índice de reajuste IGPM, pagamentos bancários (PIX/Boleto) e seguros (seguro-fiança/garantia)."
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

          <div className="formGridFull">
            <Alert tone="warning" title="Custos à parte">
              Clicksign, o índice automático de IGPM (via API da FGV), a integração bancária com o
              Santander e as seguradoras (Porto Seguro/Junto Seguros/Yelum) não estão incluídos no
              plano do NayaraOne — são serviços de terceiros contratados diretamente pela cliente,
              com custo próprio, e exigem aprovação prévia antes de serem ativados (Cláusula
              14.1/14.2 do contrato). O modo Sandbox, o modo Manual do IGPM e o modo Sandbox de
              pagamentos bancários/seguros não têm custo adicional.
            </Alert>
          </div>

          {/* Integrações · Contratos — Clicksign (assinatura eletrônica). Cartão temático: fundo
              e borda tingidos na cor oficial da marca (#F15A29), logo grande no cabeçalho — cada
              integração carrega a cara da empresa integrada, não só uma lista de campos. */}
          <div className={styles.brandCard} style={brandCardStyle(CLICKSIGN_BRAND_COLOR)}>
            <div className={styles.brandCardHeader}>
              <span className={styles.brandCardLogo}>
                <ClicksignLogo size={40} />
              </span>
              <span className={styles.brandCardMeta}>
                <span className={styles.brandCardCategory}>Integrações · Contratos</span>
              </span>
            </div>

            <FormField
              className="formGridFull"
              label={
                <span className={styles.labelWithBadge}>
                  Provedor de assinatura eletrônica
                  <StatusBadge status={integrationsStatus?.clicksign} testing={statusTesting} />
                </span>
              }
              htmlFor="integracoes-signature-provider"
            >
              {/* Único provedor suportado na interface é a Clicksign — fixo, sem seletor. O
                  backend continua entendendo "sandbox"/"zapsign" no schema por compatibilidade,
                  mas a UI não expõe mais essa troca. */}
              <Select id="integracoes-signature-provider" value="clicksign" disabled>
                <option value="clicksign">Clicksign</option>
              </Select>
            </FormField>

            {isClicksign ? (
              <>
                <SecretField
                  id="integracoes-clicksign-token"
                  label="Token da API Clicksign"
                  configured={configuredFlags.clicksignApiToken}
                  editing={Boolean(editingSecrets.clicksignApiToken)}
                  value={values.clicksignApiToken}
                  onChange={(v) => handleChange("clicksignApiToken", v)}
                  onStartEdit={() => startEditSecret("clicksignApiToken")}
                  onCancelEdit={() => cancelEditSecret("clicksignApiToken")}
                  placeholder="Token de acesso da Clicksign"
                />

                <SecretField
                  id="integracoes-clicksign-webhook"
                  label="Webhook secret da Clicksign"
                  configured={configuredFlags.clicksignWebhookSecret}
                  editing={Boolean(editingSecrets.clicksignWebhookSecret)}
                  value={values.clicksignWebhookSecret}
                  onChange={(v) => handleChange("clicksignWebhookSecret", v)}
                  onStartEdit={() => startEditSecret("clicksignWebhookSecret")}
                  onCancelEdit={() => cancelEditSecret("clicksignWebhookSecret")}
                  placeholder="Segredo usado para validar webhooks da Clicksign"
                />
              </>
            ) : null}
            {/* ZapSign removido da interface (decisão de produto: só Clicksign) — o backend
                continua com suporte a "legal.zapsign_*" no schema, só não é mais exposto aqui. */}
          </div>


          {/* Integrações · Financeiro — FGV (índice de reajuste IGPM). Mesmo cartão temático das
              outras duas, tingido na cor institucional da FGV (#002776) — sem asset de logo
              oficial no projeto, por isso usa o fallback em círculo (FgvLogo). */}
          <div className={styles.brandCard} style={brandCardStyle(FGV_BRAND_COLOR)}>
            <div className={styles.brandCardHeader}>
              <span className={styles.brandCardLogo}>
                <FgvLogo size={40} />
              </span>
              <span className={styles.brandCardMeta}>
                <span className={styles.brandCardCategory}>Integrações · Financeiro</span>
                <span className={styles.brandCardName}>FGV Dados (IGPM)</span>
              </span>
            </div>

            <FormField
              className="formGridFull"
              label={
                <span className={styles.labelWithBadge}>
                  Modo do índice IGPM
                  <StatusBadge status={integrationsStatus?.igpm} testing={statusTesting} />
                </span>
              }
              htmlFor="integracoes-igpm-mode"
            >
              <Select
                id="integracoes-igpm-mode"
                value={values.igpmMode}
                onChange={(e) => handleChange("igpmMode", e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automático</option>
              </Select>
            </FormField>

            {isIgpmAutomatic ? (
              <SecretField
                id="integracoes-fgv-token"
                label="Token de acesso da API de dados da FGV"
                configured={configuredFlags.fgvApiToken}
                editing={Boolean(editingSecrets.fgvApiToken)}
                value={values.fgvApiToken}
                onChange={(v) => handleChange("fgvApiToken", v)}
                onStartEdit={() => startEditSecret("fgvApiToken")}
                onCancelEdit={() => cancelEditSecret("fgvApiToken")}
                placeholder="Token de acesso da API de dados da FGV"
              />
            ) : null}
          </div>

          {/* Integrações · Financeiro — Santander (PIX/Boleto, PROVIDER_BANCARIO.md). Mesmo
              cartão temático do Clicksign, tingido na cor oficial do Santander (#EC0000). */}
          <div className={styles.brandCard} style={brandCardStyle(SANTANDER_BRAND_COLOR)}>
            <div className={styles.brandCardHeader}>
              <span className={styles.brandCardLogo}>
                <BankLogo bankCode="033" size={40} />
              </span>
              <span className={styles.brandCardMeta}>
                <span className={styles.brandCardCategory}>Integrações · Financeiro</span>
              </span>
            </div>

            <FormField
              className="formGridFull"
              label={
                <span className={styles.labelWithBadge}>
                  Provedor de pagamento bancário
                  <StatusBadge status={integrationsStatus?.bankPayment} testing={statusTesting} />
                </span>
              }
              htmlFor="integracoes-bank-provider"
            >
              <Select
                id="integracoes-bank-provider"
                value={values.bankPaymentProvider}
                onChange={(e) => handleChange("bankPaymentProvider", e.target.value)}
              >
                <option value="sandbox">Sandbox (sem envio real ao banco)</option>
                <option value="santander">Santander</option>
              </Select>
            </FormField>

            {values.bankPaymentProvider === "santander" ? (
              <>
                <FormField className="formGridFull" label="Ambiente" htmlFor="integracoes-santander-env">
                  <Select
                    id="integracoes-santander-env"
                    value={values.santanderEnvironment}
                    onChange={(e) => handleChange("santanderEnvironment", e.target.value)}
                  >
                    <option value="sandbox">Sandbox (homologação do Santander)</option>
                    <option value="production">Produção</option>
                  </Select>
                </FormField>

                <FormField label="Workspace ID" htmlFor="integracoes-santander-workspace">
                  <Input
                    id="integracoes-santander-workspace"
                    value={values.santanderWorkspaceId}
                    onChange={(e) => handleChange("santanderWorkspaceId", e.target.value)}
                    placeholder="ID do workspace fornecido pelo Santander"
                  />
                </FormField>

                <SecretField
                  id="integracoes-santander-client-id"
                  label="Client ID"
                  configured={configuredFlags.santanderClientId}
                  editing={Boolean(editingSecrets.santanderClientId)}
                  value={values.santanderClientId}
                  onChange={(v) => handleChange("santanderClientId", v)}
                  onStartEdit={() => startEditSecret("santanderClientId")}
                  onCancelEdit={() => cancelEditSecret("santanderClientId")}
                  placeholder="Client ID da aplicação cadastrada no Santander Developers"
                />

                <SecretField
                  id="integracoes-santander-client-secret"
                  label="Client Secret"
                  configured={configuredFlags.santanderClientSecret}
                  editing={Boolean(editingSecrets.santanderClientSecret)}
                  value={values.santanderClientSecret}
                  onChange={(v) => handleChange("santanderClientSecret", v)}
                  onStartEdit={() => startEditSecret("santanderClientSecret")}
                  onCancelEdit={() => cancelEditSecret("santanderClientSecret")}
                  placeholder="Client Secret da aplicação cadastrada no Santander Developers"
                />

                <SecretField
                  id="integracoes-santander-cert"
                  label="Certificado (A1, .pem/.cer)"
                  configured={configuredFlags.santanderCertPem}
                  editing={Boolean(editingSecrets.santanderCertPem)}
                  value={values.santanderCertPem}
                  onChange={(v) => handleChange("santanderCertPem", v)}
                  onStartEdit={() => startEditSecret("santanderCertPem")}
                  onCancelEdit={() => cancelEditSecret("santanderCertPem")}
                  placeholder="Cole aqui o conteúdo do certificado A1 (-----BEGIN CERTIFICATE-----...)"
                />

                <SecretField
                  id="integracoes-santander-key"
                  label="Chave privada do certificado"
                  configured={configuredFlags.santanderKeyPem}
                  editing={Boolean(editingSecrets.santanderKeyPem)}
                  value={values.santanderKeyPem}
                  onChange={(v) => handleChange("santanderKeyPem", v)}
                  onStartEdit={() => startEditSecret("santanderKeyPem")}
                  onCancelEdit={() => cancelEditSecret("santanderKeyPem")}
                  placeholder="Cole aqui a chave privada do certificado (-----BEGIN PRIVATE KEY-----...)"
                />

                <div className="formGridFull">
                  <Alert tone="warning" title="Credenciais emitidas pelo banco">
                    Client ID, Client Secret e o certificado A1 só são emitidos pelo Santander depois
                    que a empresa contrata o produto com o gerente de conta — não é algo que se gera
                    sozinho no portal de desenvolvedores. Enquanto esses dados não estiverem
                    configurados aqui, os pagamentos continuam no modo Sandbox automaticamente.
                  </Alert>
                </div>
              </>
            ) : null}
          </div>

          {/* Integrações · Seguros — Insurance Hub (Marco 7, contrato Anexo I "COMPRAS/PROCUREMENT
              + SEGUROS"). Seguradora escolhida muda a cor/logo do cartão dinamicamente — cada
              provedor carrega sua própria identidade, igual Clicksign/FGV/Santander acima. */}
          <div
            className={styles.brandCard}
            style={brandCardStyle(
              values.insuranceProvider === "porto_seguro"
                ? PORTO_SEGURO_BRAND_COLOR
                : values.insuranceProvider === "junto_seguros"
                ? JUNTO_SEGUROS_BRAND_COLOR
                : values.insuranceProvider === "yelum"
                ? YELUM_BRAND_COLOR
                : FGV_BRAND_COLOR
            )}
          >
            <div className={styles.brandCardHeader}>
              <span className={styles.brandCardLogo}>
                {values.insuranceProvider === "porto_seguro" ? (
                  <PortoSeguroLogo size={40} />
                ) : values.insuranceProvider === "junto_seguros" ? (
                  <JuntoSegurosLogo size={40} />
                ) : values.insuranceProvider === "yelum" ? (
                  <YelumLogo size={40} />
                ) : (
                  <span className={styles.brandCardName} style={{ fontSize: 28 }}>🛡️</span>
                )}
              </span>
              <span className={styles.brandCardMeta}>
                <span className={styles.brandCardCategory}>Integrações · Seguros</span>
                <span className={styles.brandCardName}>
                  {values.insuranceProvider === "porto_seguro"
                    ? "Porto Seguro"
                    : values.insuranceProvider === "junto_seguros"
                    ? "Junto Seguros"
                    : values.insuranceProvider === "yelum"
                    ? "Yelum Seguros"
                    : "Seguro-fiança / garantia locatícia"}
                </span>
              </span>
            </div>

            <FormField
              className="formGridFull"
              label={
                <span className={styles.labelWithBadge}>
                  Provedor de seguro-fiança/garantia
                  <StatusBadge status={integrationsStatus?.insurance} testing={statusTesting} />
                </span>
              }
              htmlFor="integracoes-insurance-provider"
            >
              <Select
                id="integracoes-insurance-provider"
                value={values.insuranceProvider}
                onChange={(e) => handleChange("insuranceProvider", e.target.value)}
              >
                <option value="sandbox">Sandbox (sem envio real à seguradora)</option>
                <option value="porto_seguro">Porto Seguro</option>
                <option value="junto_seguros">Junto Seguros</option>
                <option value="yelum">Yelum Seguros</option>
              </Select>
            </FormField>

            {values.insuranceProvider === "porto_seguro" ? (
              <>
                <FormField className="formGridFull" label="Ambiente" htmlFor="integracoes-porto-env">
                  <Select
                    id="integracoes-porto-env"
                    value={values.portoSeguroEnvironment}
                    onChange={(e) => handleChange("portoSeguroEnvironment", e.target.value)}
                  >
                    <option value="sandbox">Sandbox (homologação da Porto Seguro)</option>
                    <option value="production">Produção</option>
                  </Select>
                </FormField>
                <SecretField
                  id="integracoes-porto-client-id"
                  label="Client ID"
                  configured={configuredFlags.portoSeguroClientId}
                  editing={Boolean(editingSecrets.portoSeguroClientId)}
                  value={values.portoSeguroClientId}
                  onChange={(v) => handleChange("portoSeguroClientId", v)}
                  onStartEdit={() => startEditSecret("portoSeguroClientId")}
                  onCancelEdit={() => cancelEditSecret("portoSeguroClientId")}
                  placeholder="Client ID do app criado no Portal do Desenvolvedor da Porto Seguro"
                />
                <SecretField
                  id="integracoes-porto-client-secret"
                  label="Client Secret"
                  configured={configuredFlags.portoSeguroClientSecret}
                  editing={Boolean(editingSecrets.portoSeguroClientSecret)}
                  value={values.portoSeguroClientSecret}
                  onChange={(v) => handleChange("portoSeguroClientSecret", v)}
                  onStartEdit={() => startEditSecret("portoSeguroClientSecret")}
                  onCancelEdit={() => cancelEditSecret("portoSeguroClientSecret")}
                  placeholder="Client Secret do app criado no Portal do Desenvolvedor da Porto Seguro"
                />
                <div className="formGridFull">
                  <Alert tone="warning" title="Cadastro no portal do desenvolvedor">
                    Client ID e Client Secret só existem depois de criar um app no Portal do
                    Desenvolvedor da Porto Seguro (dev.portoseguro.com.br) — hoje o portal só
                    aceita cadastro de parceiros previamente indicados pelas áreas de produto, não
                    é totalmente self-service. Autenticação é OAuth2 (client_credentials). Até
                    configurar aqui, os seguros continuam no modo Sandbox automaticamente.
                  </Alert>
                </div>
              </>
            ) : null}

            {values.insuranceProvider === "junto_seguros" ? (
              <div className="formGridFull">
                <Alert tone="warning" title="Sem documentação técnica pública ainda">
                  A Junto Seguros não tem nenhum portal de desenvolvedor ou documentação técnica
                  acessível publicamente — ela só libera isso depois que a empresa formaliza uma
                  parceria de corretora. Por isso não há campos de credencial aqui: não existe
                  nada real para configurar ainda. Enquanto essa seleção estiver marcada, o
                  sistema continua operando no modo Sandbox automaticamente, como se nenhum
                  provider estivesse escolhido.
                </Alert>
              </div>
            ) : null}

            {values.insuranceProvider === "yelum" ? (
              <>
                <FormField className="formGridFull" label="Ambiente" htmlFor="integracoes-yelum-env">
                  <Select
                    id="integracoes-yelum-env"
                    value={values.yelumEnvironment}
                    onChange={(e) => handleChange("yelumEnvironment", e.target.value)}
                  >
                    <option value="sandbox">Sandbox (homologação da Yelum)</option>
                    <option value="production">Produção</option>
                  </Select>
                </FormField>
                <SecretField
                  id="integracoes-yelum-api-key"
                  label="API Key"
                  configured={configuredFlags.yelumApiKey}
                  editing={Boolean(editingSecrets.yelumApiKey)}
                  value={values.yelumApiKey}
                  onChange={(v) => handleChange("yelumApiKey", v)}
                  onStartEdit={() => startEditSecret("yelumApiKey")}
                  onCancelEdit={() => cancelEditSecret("yelumApiKey")}
                  placeholder="API Key emitida pela Yelum Seguros"
                />
              </>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações">
      <div className={styles.wrap}>
        <p className={styles.pageIntro}>
          Regras da empresa aplicadas a todos os usuários — apenas administradores enxergam e
          alteram esta área. Preferências pessoais (como aparência do painel) ficam em Meu perfil.
        </p>
        <Tabs
          orientation="vertical"
          items={[
            { label: "Cobrança", content: <CobrancaTab /> },
            { label: "Segurança", content: <SegurancaTab /> },
            { label: "Integrações", content: <IntegracoesTab /> },
          ]}
        />
      </div>
    </AppShell>
  );
}
