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
import { listSettings, updateSetting } from "@/lib/api/settings";
import styles from "./page.module.css";

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
    signatureProvider: "sandbox",
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
          signatureProvider: byKey[INTEGRACOES_KEYS.signatureProvider] || "sandbox",
          clicksignApiToken: "",
          clicksignWebhookSecret: "",
          zapsignApiToken: "",
          zapsignWebhookSecret: "",
          igpmMode: byKey[INTEGRACOES_KEYS.igpmMode] || "manual",
          fgvApiToken: "",
        };
        setValues(next);
        setOriginal(next);
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
      setSuccess("Configurações de integrações salvas.");
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

  const isClicksign = values.signatureProvider === "clicksign";
  const isZapsign = values.signatureProvider === "zapsign";
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
              Clicksign, ZapSign e o índice automático de IGPM (via API da FGV) não estão incluídos no
              plano do NayaraOne — são serviços de terceiros contratados diretamente pela cliente, com
              custo próprio. O modo Sandbox e o modo Manual do IGPM não têm custo adicional.
            </Alert>
          </div>

          <FormField className="formGridFull" label="Provedor de assinatura eletrônica" htmlFor="integracoes-signature-provider">
            <Select
              id="integracoes-signature-provider"
              value={values.signatureProvider}
              onChange={(e) => handleChange("signatureProvider", e.target.value)}
            >
              <option value="sandbox">Sandbox</option>
              <option value="clicksign">Clicksign</option>
              <option value="zapsign">ZapSign</option>
            </Select>
          </FormField>

          {isClicksign ? (
            <>
              <FormField label="Token da API Clicksign" htmlFor="integracoes-clicksign-token">
                <Input
                  id="integracoes-clicksign-token"
                  type="password"
                  placeholder={configuredFlags.clicksignApiToken ? "•••••• (configurado — deixe em branco para manter)" : "Token de acesso da Clicksign"}
                  value={values.clicksignApiToken}
                  onChange={(e) => handleChange("clicksignApiToken", e.target.value)}
                />
              </FormField>

              <FormField label="Webhook secret da Clicksign" htmlFor="integracoes-clicksign-webhook">
                <Input
                  id="integracoes-clicksign-webhook"
                  type="password"
                  placeholder={configuredFlags.clicksignWebhookSecret ? "•••••• (configurado — deixe em branco para manter)" : "Segredo usado para validar webhooks da Clicksign"}
                  value={values.clicksignWebhookSecret}
                  onChange={(e) => handleChange("clicksignWebhookSecret", e.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {isZapsign ? (
            <>
              <FormField label="Token da API ZapSign" htmlFor="integracoes-zapsign-token">
                <Input
                  id="integracoes-zapsign-token"
                  type="password"
                  placeholder={configuredFlags.zapsignApiToken ? "•••••• (configurado — deixe em branco para manter)" : "Token de acesso do ZapSign"}
                  value={values.zapsignApiToken}
                  onChange={(e) => handleChange("zapsignApiToken", e.target.value)}
                />
              </FormField>

              <FormField label="Webhook secret do ZapSign" htmlFor="integracoes-zapsign-webhook">
                <Input
                  id="integracoes-zapsign-webhook"
                  type="password"
                  placeholder={configuredFlags.zapsignWebhookSecret ? "•••••• (configurado — deixe em branco para manter)" : "Segredo usado para validar webhooks do ZapSign"}
                  value={values.zapsignWebhookSecret}
                  onChange={(e) => handleChange("zapsignWebhookSecret", e.target.value)}
                />
              </FormField>
            </>
          ) : null}

          <FormField className="formGridFull" label="Modo do índice IGPM" htmlFor="integracoes-igpm-mode">
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
            <FormField label="Token da API FGV" htmlFor="integracoes-fgv-token">
              <Input
                id="integracoes-fgv-token"
                type="password"
                placeholder={configuredFlags.fgvApiToken ? "•••••• (configurado — deixe em branco para manter)" : "Token de acesso da API de dados da FGV"}
                value={values.fgvApiToken}
                onChange={(e) => handleChange("fgvApiToken", e.target.value)}
              />
            </FormField>
          ) : null}
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
