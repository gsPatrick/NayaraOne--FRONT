"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import ClicksignLogo from "@/components/atoms/ClicksignLogo/ClicksignLogo";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import FgvLogo from "@/components/atoms/FgvLogo/FgvLogo";
import PortoSeguroLogo from "@/components/atoms/PortoSeguroLogo/PortoSeguroLogo";
import JuntoSegurosLogo from "@/components/atoms/JuntoSegurosLogo/JuntoSegurosLogo";
import YelumLogo from "@/components/atoms/YelumLogo/YelumLogo";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { canResetForm } from "@/lib/asyncState/formSync";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listSettings, updateSetting, getIntegrationsStatus } from "@/lib/api/settings";
import { reportLookupProblem } from "@/lib/asyncState/lookup";
import { toSettingValue, settingsByKey } from "./settingsFormat";
import {
  CLICKSIGN_BRAND_COLOR, SANTANDER_BRAND_COLOR, FGV_BRAND_COLOR, PORTO_SEGURO_BRAND_COLOR, JUNTO_SEGUROS_BRAND_COLOR, YELUM_BRAND_COLOR,
  brandCardStyle, StatusBadge, SecretField,
} from "./IntegracoesParts";
import styles from "./page.module.css";

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
  financingProvider: "correspondent.financing_provider",
  financingSandboxWebhookSecret: "correspondent.sandbox_webhook_secret",
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
  "financingSandboxWebhookSecret",
]);

export default function IntegracoesTab() {
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
    // Correspondente Bancário/Financiamentos (Marco 8) — mesmo padrão seguro dos demais: default
    // "sandbox" sem nenhum dado real, nenhum banco de verdade integrado ainda nesta fase.
    financingProvider: "sandbox",
    financingSandboxWebhookSecret: "",
  });
  const [configuredFlags, setConfiguredFlags] = useState({});
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  // Dado fresco que chega depois de o usuário digitar não apaga o que foi digitado; a migração do provedor roda uma vez só.
  const formRef = useRef({ values: null, original: null });
  const providerMigratedRef = useRef(false);
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
      .catch((error) => { reportLookupProblem("o status das integrações", error); setIntegrationsStatus(null); })
      .finally(() => setStatusTesting(false));
  }

  // M9-D940: carregando, erro com "tentar de novo", sem acesso (403) e sem conexão vêm do padrão único de estados.
  const settingsQuery = useAsyncState(async () => {
    const [legalData, billingData, financeData, procurementData, correspondentData] = await Promise.all([listSettings("legal."), listSettings("billing."), listSettings("finance."), listSettings("procurement."), listSettings("correspondent.")]);
    return settingsByKey(legalData, billingData, financeData, procurementData, correspondentData);
  }, { key: "configuracoes:integracoes", isEmpty: () => false });
  useEffect(() => {
    const byKey = settingsQuery.data;
    if (!byKey) return;
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
      financingProvider: byKey[INTEGRACOES_KEYS.financingProvider] || "sandbox",
      financingSandboxWebhookSecret: "",
    };
    // Garante que o backend também reflita "clicksign" quando o tenant ainda tinha um
    // valor antigo salvo (ex.: "sandbox"/"zapsign", de antes da decisão de produto) — a UI
    // só mostra Clicksign, então o provider efetivo usado pelo fluxo de assinatura real
    // precisa acompanhar, sem depender de o usuário clicar em "Salvar".
    const storedProvider = byKey[INTEGRACOES_KEYS.signatureProvider];
    if (storedProvider && storedProvider !== "clicksign" && !providerMigratedRef.current) {
      providerMigratedRef.current = true;
      updateSetting(INTEGRACOES_KEYS.signatureProvider, "clicksign").catch((error) => reportLookupProblem("o provedor de assinatura", error));
    }
    const flags = {
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
      financingSandboxWebhookSecret: Boolean(byKey[INTEGRACOES_KEYS.financingSandboxWebhookSecret]),
    };
    setConfiguredFlags(flags);
    if (!canResetForm(formRef.current.values, formRef.current.original)) return;
    setValues(next);
    setOriginal(next);
  }, [settingsQuery.data]);

  formRef.current = { values, original };

  useEffect(() => {
    refreshIntegrationsStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (forbidden || settingsQuery.status === "PERMISSION_DENIED") {
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
        <Button onClick={handleSave} loading={saving} disabled={settingsQuery.status !== "CONTENT"}>
          Salvar
        </Button>
      }
    >
      <AsyncState result={settingsQuery} loadingLabel="Carregando configurações de integrações...">
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
                <option value="manual">Fluxo manual (seguradora sem API)</option>
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

            {values.insuranceProvider === "manual" ? (
              <div className="formGridFull">
                <Alert tone="info" title="Seguradora sem API: o trabalho vira tarefa">
                  Cotar e emitir não chamam a seguradora. O sistema abre uma tarefa para uma pessoa (anexar a
                  cotação recebida por e-mail ou portal, registrar o número da proposta e anexar a apólice) e,
                  ao concluir cada uma, segue o mesmo caminho e gera os mesmos avisos que a integração por API.
                  O prazo das tarefas e os marcos de vencimento ficam em Registro de integrações.
                </Alert>
              </div>
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

          {/* Integrações · Correspondente Bancário — Financiamentos (Marco 8, contrato Anexo I
              "CORRESPONDENTE BANCÁRIO + NC + FINANCIAMENTOS"). Nenhum banco real está integrado
              ainda nesta fase — só o modo Sandbox (simulação determinística, sem envio real a
              nenhum banco) e o modo Manual (workflow conduzido por um corretor/analista humano,
              sem chamada a nenhuma API externa). Quando a Nayara formalizar parceria com um banco,
              um novo adapter entra aqui do mesmo jeito que Porto Seguro/Yelum entraram acima. */}
          <div className={styles.brandCard} style={brandCardStyle(FGV_BRAND_COLOR)}>
            <div className={styles.brandCardHeader}>
              <span className={styles.brandCardLogo}>
                <span className={styles.brandCardName} style={{ fontSize: 28 }}>🏦</span>
              </span>
              <span className={styles.brandCardMeta}>
                <span className={styles.brandCardCategory}>Integrações · Correspondente bancário</span>
                <span className={styles.brandCardName}>Financiamento imobiliário</span>
              </span>
            </div>

            <FormField
              className="formGridFull"
              label="Modo de envio de propostas de financiamento"
              htmlFor="integracoes-financing-provider"
            >
              <Select
                id="integracoes-financing-provider"
                value={values.financingProvider}
                onChange={(e) => handleChange("financingProvider", e.target.value)}
              >
                <option value="sandbox">Sandbox (simulação, sem envio real a nenhum banco)</option>
                <option value="manual">Manual (corretor conduz o caso com o banco por fora do sistema)</option>
              </Select>
            </FormField>

            {values.financingProvider === "sandbox" ? (
              <>
                <div className="formGridFull">
                  <Alert tone="warning" title="Nenhum banco real integrado ainda">
                    Este modo simula a resposta de um banco fictício, de forma determinística, sem
                    nenhuma chamada a um banco de verdade — serve para testar o fluxo completo de
                    financiamento (simulação, envio do caso, acompanhamento de status) antes de
                    qualquer parceria bancária real existir. Quando a Nayara formalizar convênio de
                    correspondente com um banco, a integração real é adicionada aqui.
                  </Alert>
                </div>
                <SecretField
                  id="integracoes-financing-sandbox-secret"
                  label="Segredo do webhook de simulação"
                  configured={configuredFlags.financingSandboxWebhookSecret}
                  editing={Boolean(editingSecrets.financingSandboxWebhookSecret)}
                  value={values.financingSandboxWebhookSecret}
                  onChange={(v) => handleChange("financingSandboxWebhookSecret", v)}
                  onStartEdit={() => startEditSecret("financingSandboxWebhookSecret")}
                  onCancelEdit={() => cancelEditSecret("financingSandboxWebhookSecret")}
                  placeholder="Valor usado para validar as notificações de status simuladas"
                />
              </>
            ) : null}

            {values.financingProvider === "manual" ? (
              <div className="formGridFull">
                <Alert tone="warning" title="Sem integração automática">
                  Neste modo, o corretor ou analista responsável acompanha o caso diretamente com
                  o banco (telefone, e-mail, portal do banco) e atualiza o status manualmente no
                  sistema. Não há nenhuma chamada automática a um banco externo.
                </Alert>
              </div>
            ) : null}
          </div>
        </div>
      </AsyncState>
    </Card>
  );
}
