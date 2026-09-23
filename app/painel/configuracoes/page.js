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
import { listSettings, updateSetting, getIntegrationsStatus } from "@/lib/api/settings";
import styles from "./page.module.css";

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
    Promise.all([listSettings("legal."), listSettings("billing.")])
      .then(([legalData, billingData]) => {
        if (cancelled) return;
        const list = [
          ...(Array.isArray(legalData) ? legalData : Object.values(legalData || {})),
          ...(Array.isArray(billingData) ? billingData : Object.values(billingData || {})),
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
      subtitle="Provedores externos usados em assinatura eletrônica de contratos e no índice de reajuste IGPM."
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
              Clicksign e o índice automático de IGPM (via API da FGV) não estão incluídos no plano do
              NayaraOne — são serviços de terceiros contratados diretamente pela cliente, com custo
              próprio. O modo Sandbox e o modo Manual do IGPM não têm custo adicional.
            </Alert>
          </div>

          {/* Integrações · Contratos — Clicksign (assinatura eletrônica) */}
          <div className={styles.integrationSection}>
            <h3 className={styles.integrationSectionTitle}>
              <span className={styles.categoryLabel}>Integrações · Contratos</span>
              <span aria-hidden="true">—</span>
              <span className={styles.providerLabel}>
                <ClicksignLogo size={18} />
              </span>
            </h3>

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

          {/* Integrações · Financeiro — FGV (índice de reajuste IGPM) */}
          <div className={styles.integrationSection}>
            <h3 className={styles.integrationSectionTitle}>
              <span className={styles.categoryLabel}>Integrações · Financeiro</span>
              <span aria-hidden="true">—</span>
              <span className={styles.providerLabel}>FGV Dados (IGPM)</span>
            </h3>

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
