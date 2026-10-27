"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Button from "@/components/atoms/Button/Button";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import {
  getCorrespondentParameters,
  updateEligibilityParameters,
  updateCommissionParameters,
} from "@/lib/api/correspondent";
import { formatDateTime, toNumber } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import { PROVIDER_LABELS, PURPOSE_LABELS, STATUS_LABELS, BLOCKABLE_CASE_STATUSES, TRIGGER_EVENT_LABELS } from "../_labels";
import styles from "./page.module.css";

const DOCUMENT_LABELS = { RG_CPF: "RG/CPF", COMPROVANTE_RENDA: "Comprovante de renda", COMPROVANTE_RESIDENCIA: "Comprovante de residência", MATRICULA_IMOVEL: "Matrícula do imóvel", CERTIDAO_ESTADO_CIVIL: "Certidão de estado civil", IPTU: "IPTU", EXTRATO_BANCARIO: "Extrato bancário", OUTRO: "Outro" };

const FIELD_LABELS = {
  allowedProviders: "Providers habilitados",
  allowedPurposes: "Finalidades habilitadas",
  allowedProducts: "Produtos habilitados",
  maxAmountByProvider: "Teto de valor",
  blockSubmissionOnPendingDuplicate: "Bloquear envio com duplicata pendente",
  requireConsentEvidence: "Exigir evidência do consentimento",
  statusPollingEnabled: "Consulta automática de status",
  blockWhenPropertyRegionUnknown: "Bloquear região do imóvel desconhecida",
  duplicateWindowHours: "Janela de duplicata (h)",
  stalledCaseDays: "Dias para caso parado",
  requiredDocumentTypes: "Checklist mínimo",
  unknownReleaseMinutes: "Espera após envio incerto (min)",
  documentValidityDays: "Validade dos documentos (dias)",
  allowedStatesByProvider: "Regiões atendidas",
  percentageByProvider: "Comissão por provider (%)",
  defaultPercentage: "Comissão padrão (%)",
  brokerSharePctByProvider: "Parte do corretor por provider (%)",
  defaultBrokerSharePct: "Parte do corretor padrão (%)",
  allowedTriggerEvents: "Fatos geradores aceitos",
  defaultTriggerEvent: "Fato gerador padrão",
  invoiceGraceDays: "Prazo da NFS-e (dias)",
  dimobIncludeCommissions: "Comissões no DIMOB",
  blockedCaseStatuses: "Etapas sem comissão",
  blockDuplicateCommissionPerTrigger: "Bloquear comissão repetida",
  confirmRequiresFinancePermission: "Confirmar exige permissão financeira",
  receivableDueDays: "Prazo para o banco pagar (dias)",
  dimobExcludedKeywords: "Palavras fora do aluguel no DIMOB",
  dimobLayoutLabel: "Versão do layout do arquivo da DIMOB",
  dimobFileColumns: "Colunas do arquivo da DIMOB",
  dimobFileDelimiter: "Separador do arquivo da DIMOB",
  dimobFileNotice: "Aviso do arquivo da DIMOB",
};

const DIMOB_COLUMNS = "tipo, contrato, locador_documento, locador_nome, locatario_documento, locatario_nome, imovel, valor_no_ano, situacao, pendencias";
const DIMOB_COLUMN_LIST = DIMOB_COLUMNS.split(", ");

const VALUE_LABELS = { ...PROVIDER_LABELS, ...PURPOSE_LABELS, ...DOCUMENT_LABELS, ...STATUS_LABELS, ...TRIGGER_EVENT_LABELS };

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "sem valor";
  if (value === true) return "Sim";
  if (value === false) return "Não";
  if (Array.isArray(value)) return value.length ? value.map((v) => VALUE_LABELS[v] || String(v)).join(", ") : "nenhum";
  if (typeof value === "object") {
    const parts = Object.entries(value).map(([k, v]) => `${VALUE_LABELS[k] || k}: ${formatValue(v)}`);
    return parts.length ? parts.join("; ") : "nenhum";
  }
  return VALUE_LABELS[value] || String(value);
}

// O que mudou em relação à versão anterior (a lista vem da mais nova para a mais antiga).
function changesText(row, older) {
  if (!older) return "Versão inicial";
  const keys = Array.from(new Set([...Object.keys(row.action || {}), ...Object.keys(older.action || {})]));
  const lines = keys
    .filter((k) => JSON.stringify((row.action || {})[k]) !== JSON.stringify((older.action || {})[k]))
    .map((k) => `${FIELD_LABELS[k] || k}: ${formatValue((older.action || {})[k])} → ${formatValue((row.action || {})[k])}`);
  return lines.length ? lines.join(" | ") : "Sem diferença nos valores";
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function numberText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

function parseOrNull(text) {
  if (text === "" || text === null || text === undefined) return null;
  const n = toNumber(text);
  return Number.isFinite(n) ? n : null;
}

function digitsOnly(text) {
  return String(text ?? "").replace(/\D/g, "");
}

function checkInteger(errors, key, text, label, min, max) {
  if (text === "" || text === null || text === undefined) {
    errors[key] = `Informe ${label}.`;
    return;
  }
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) errors[key] = `${label[0].toUpperCase()}${label.slice(1)} precisa ser um número inteiro entre ${min} e ${max}.`;
}

function checkPercent(errors, key, text, label, { allowZero = false } = {}) {
  const n = parseOrNull(text);
  if (n === null) {
    errors[key] = `Informe ${label}.`;
    return;
  }
  if (n > 100 || n < 0 || (!allowZero && n <= 0)) errors[key] = `${label[0].toUpperCase()}${label.slice(1)} precisa ser ${allowZero ? "de 0 a 100" : "maior que 0 e até 100"}.`;
}

function validateEligibilityForm(e, providers) {
  const errors = {};
  if (!e.allowedProviders.length) errors.allowedProviders = "Selecione ao menos um provider.";
  if (!e.allowedPurposes.length) errors.allowedPurposes = "Selecione ao menos uma finalidade.";
  if (!e.allowedProducts.length) errors.allowedProducts = "Selecione ao menos um produto.";
  providers.forEach((p) => {
    const raw = e.maxAmountByProvider[p];
    if (raw !== "" && !(parseOrNull(raw) > 0)) errors[`max-${p}`] = "Informe um valor maior que zero ou deixe vazio para não ter teto.";
    const ufs = String(e.allowedStatesByProvider[p] || "").split(/[\s,;]+/).map((u) => u.trim()).filter(Boolean);
    if (ufs.some((u) => !/^[A-Za-z]{2}$/.test(u))) errors[`uf-${p}`] = "Use siglas de UF com 2 letras separadas por vírgula (ex.: SP, RJ).";
  });
  checkInteger(errors, "duplicateWindowHours", e.duplicateWindowHours, "a janela de possível duplicata", 1, 720);
  checkInteger(errors, "unknownReleaseMinutes", e.unknownReleaseMinutes, "a espera antes de liberar novo envio", 0, 1440);
  checkInteger(errors, "stalledCaseDays", e.stalledCaseDays, "os dias sem atividade", 1, 365);
  Object.entries(e.documentValidityDays).forEach(([d, v]) => {
    if (v !== "" && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 3650)) errors[`valid-${d}`] = "Use um número inteiro de 1 a 3650 ou deixe vazio.";
  });
  return errors;
}

function validateCommissionForm(c, providers) {
  const errors = {};
  providers.forEach((p) => {
    checkPercent(errors, `pct-${p}`, c.percentageByProvider[p], "a comissão deste provider");
    checkPercent(errors, `broker-${p}`, c.brokerSharePctByProvider[p], "a parte do corretor", { allowZero: true });
  });
  checkPercent(errors, "defaultPercentage", c.defaultPercentage, "a comissão padrão");
  checkPercent(errors, "defaultBrokerSharePct", c.defaultBrokerSharePct, "a parte do corretor padrão", { allowZero: true });
  if (!c.allowedTriggerEvents.length) errors.allowedTriggerEvents = "Selecione ao menos um fato gerador.";
  else if (!c.allowedTriggerEvents.includes(c.defaultTriggerEvent)) errors.defaultTriggerEvent = "O fato gerador padrão precisa estar entre os aceitos.";
  checkInteger(errors, "invoiceGraceDays", c.invoiceGraceDays, "o prazo para emitir a NFS-e", 0, 365);
  checkInteger(errors, "receivableDueDays", c.receivableDueDays, "o prazo para o banco pagar", 0, 365);
  const keywords = String(c.dimobExcludedKeywords || "").split(/[,;]+/).map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 50) errors.dimobExcludedKeywords = "Use no máximo 50 palavras.";
  if (keywords.some((k) => k.length > 60)) errors.dimobExcludedKeywords = "Cada palavra pode ter no máximo 60 caracteres.";
  const label = String(c.dimobLayoutLabel || "").trim();
  if (!label) errors.dimobLayoutLabel = "Informe a versão do layout.";
  else if (label.replace(/\{ano\}/gi, "2026").length > 16) errors.dimobLayoutLabel = "Use no máximo 16 caracteres (o {ano} conta 4).";
  else if (/[;\r\n]/.test(label)) errors.dimobLayoutLabel = "Não use ponto e vírgula.";
  const cols = String(c.dimobFileColumns || "").split(/[,;\s]+/).filter(Boolean);
  if (!cols.length) errors.dimobFileColumns = "Informe ao menos uma coluna.";
  else if (cols.some((x) => !DIMOB_COLUMN_LIST.includes(x))) errors.dimobFileColumns = `Coluna desconhecida: ${cols.filter((x) => !DIMOB_COLUMN_LIST.includes(x)).join(", ")}.`;
  else if (new Set(cols).size !== cols.length) errors.dimobFileColumns = "Não repita a mesma coluna.";
  if (String(c.dimobFileNotice || "").length > 200) errors.dimobFileNotice = "Use no máximo 200 caracteres.";
  return errors;
}

const BARE = { border: 0, padding: 0, margin: 0, minWidth: 0 };

function IntegerInput({ id, value, onChange, error, ...rest }) {
  return <Input id={id} inputMode="numeric" value={value} error={Boolean(error)} onChange={(e) => onChange(digitsOnly(e.target.value))} {...rest} />;
}

export default function ParametrosCorrespondentePage() {
  const [params, setParams] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [commission, setCommission] = useState(null);
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [commissionReason, setCommissionReason] = useState("");
  const [saving, setSaving] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({ eligibility: {}, commission: {} });
  const [canEdit, setCanEdit] = useState(false);
  const feedbackRef = useRef(null);

  useEffect(() => { setCanEdit(hasPermission("correspondent:parameters")); }, []);
  useEffect(() => {
    if (feedback && feedbackRef.current?.scrollIntoView) feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [feedback]);

  function hydrateEligibility(data) {
    const e = data.eligibility.action;
    setEligibility({
      allowedProviders: e.allowedProviders || [],
      allowedPurposes: e.allowedPurposes || [],
      allowedProducts: e.allowedProducts || [],
      maxAmountByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((e.maxAmountByProvider || {})[p])])),
      blockSubmissionOnPendingDuplicate: e.blockSubmissionOnPendingDuplicate === true,
      requireConsentEvidence: e.requireConsentEvidence === true,
      statusPollingEnabled: e.statusPollingEnabled === true,
      blockWhenPropertyRegionUnknown: e.blockWhenPropertyRegionUnknown === true,
      duplicateWindowHours: String(e.duplicateWindowHours ?? 24),
      stalledCaseDays: String(e.stalledCaseDays ?? 7),
      requiredDocumentTypes: e.requiredDocumentTypes || [],
      unknownReleaseMinutes: String(e.unknownReleaseMinutes ?? 2),
      documentValidityDays: Object.fromEntries((data.options.documentTypes || []).map((d) => [d, e.documentValidityDays && e.documentValidityDays[d] ? String(e.documentValidityDays[d]) : ""])),
      allowedStatesByProvider: Object.fromEntries(data.options.providers.map((p) => [p, ((e.allowedStatesByProvider || {})[p] || []).join(", ")])),
    });
  }

  function hydrateCommission(data) {
    const c = data.commission.action;
    setCommission({
      percentageByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((c.percentageByProvider || {})[p] ?? c.defaultPercentage)])),
      defaultPercentage: numberText(c.defaultPercentage),
      brokerSharePctByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((c.brokerSharePctByProvider || {})[p] ?? c.defaultBrokerSharePct)])),
      defaultBrokerSharePct: numberText(c.defaultBrokerSharePct),
      allowedTriggerEvents: c.allowedTriggerEvents || [],
      defaultTriggerEvent: c.defaultTriggerEvent || "",
      invoiceGraceDays: String(c.invoiceGraceDays ?? 5),
      dimobIncludeCommissions: c.dimobIncludeCommissions === true,
      blockedCaseStatuses: c.blockedCaseStatuses || ["CANCELED", "REJECTED"],
      blockDuplicateCommissionPerTrigger: c.blockDuplicateCommissionPerTrigger !== false,
      confirmRequiresFinancePermission: c.confirmRequiresFinancePermission !== false,
      receivableDueDays: String(c.receivableDueDays ?? 30),
      dimobExcludedKeywords: (c.dimobExcludedKeywords || []).join(", "),
      dimobLayoutLabel: c.dimobLayoutLabel || "DIMOB-{ano}-v1",
      dimobFileColumns: (c.dimobFileColumns || DIMOB_COLUMN_LIST).join(", "),
      dimobFileDelimiter: c.dimobFileDelimiter || ";",
      dimobFileNotice: c.dimobFileNotice ?? "",
    });
  }

  // Carrega tudo na primeira vez; depois de salvar, só a aba salva é reidratada (a outra mantém as edições).
  async function load(only) {
    setLoadError("");
    try {
      const data = await getCorrespondentParameters();
      setParams(data);
      if (!only || only === "eligibility") hydrateEligibility(data);
      if (!only || only === "commission") hydrateCommission(data);
      return true;
    } catch (err) {
      setLoadError(err?.message || "Não foi possível carregar os parâmetros.");
      return false;
    }
  }

  useEffect(() => { load(); }, []);

  async function save(kind) {
    const providers = params.options.providers;
    const isEligibility = kind === "eligibility";
    const found = isEligibility ? validateEligibilityForm(eligibility, providers) : validateCommissionForm(commission, providers);
    setErrors((prev) => ({ ...prev, [kind]: found }));
    setFeedback(null);
    if (Object.keys(found).length) {
      setFeedback({ tab: kind, tone: "danger", text: `Corrija ${Object.keys(found).length === 1 ? "o campo marcado" : `os ${Object.keys(found).length} campos marcados`} antes de salvar.` });
      return;
    }
    setSaving(kind);
    try {
      if (isEligibility) {
        await updateEligibilityParameters(
          {
            allowedProviders: eligibility.allowedProviders,
            allowedPurposes: eligibility.allowedPurposes,
            allowedProducts: eligibility.allowedProducts,
            maxAmountByProvider: Object.fromEntries(Object.entries(eligibility.maxAmountByProvider).map(([p, v]) => [p, parseOrNull(v)])),
            blockSubmissionOnPendingDuplicate: eligibility.blockSubmissionOnPendingDuplicate,
            requireConsentEvidence: eligibility.requireConsentEvidence,
            statusPollingEnabled: eligibility.statusPollingEnabled,
            blockWhenPropertyRegionUnknown: eligibility.blockWhenPropertyRegionUnknown,
            duplicateWindowHours: parseOrNull(eligibility.duplicateWindowHours),
            stalledCaseDays: parseOrNull(eligibility.stalledCaseDays),
            requiredDocumentTypes: eligibility.requiredDocumentTypes,
            unknownReleaseMinutes: parseOrNull(eligibility.unknownReleaseMinutes),
            documentValidityDays: Object.fromEntries(Object.entries(eligibility.documentValidityDays).map(([d, v]) => [d, parseOrNull(v)])),
            allowedStatesByProvider: eligibility.allowedStatesByProvider,
          },
          eligibilityReason,
          params.eligibility.ruleVersionId
        );
        setEligibilityReason("");
      } else {
        await updateCommissionParameters(
          {
            percentageByProvider: Object.fromEntries(Object.entries(commission.percentageByProvider).map(([p, v]) => [p, parseOrNull(v)])),
            defaultPercentage: parseOrNull(commission.defaultPercentage),
            brokerSharePctByProvider: Object.fromEntries(Object.entries(commission.brokerSharePctByProvider).map(([p, v]) => [p, parseOrNull(v)])),
            defaultBrokerSharePct: parseOrNull(commission.defaultBrokerSharePct),
            allowedTriggerEvents: commission.allowedTriggerEvents,
            defaultTriggerEvent: commission.defaultTriggerEvent,
            invoiceGraceDays: parseOrNull(commission.invoiceGraceDays),
            dimobIncludeCommissions: commission.dimobIncludeCommissions,
            blockedCaseStatuses: commission.blockedCaseStatuses,
            blockDuplicateCommissionPerTrigger: commission.blockDuplicateCommissionPerTrigger,
            confirmRequiresFinancePermission: commission.confirmRequiresFinancePermission,
            receivableDueDays: parseOrNull(commission.receivableDueDays),
            dimobExcludedKeywords: commission.dimobExcludedKeywords,
            dimobLayoutLabel: commission.dimobLayoutLabel.trim(),
            dimobFileColumns: commission.dimobFileColumns.split(/[,;\s]+/).filter(Boolean),
            dimobFileDelimiter: commission.dimobFileDelimiter,
            dimobFileNotice: commission.dimobFileNotice.trim(),
          },
          commissionReason,
          params.commission.ruleVersionId
        );
        setCommissionReason("");
      }
      const reloaded = await load(kind);
      const base = isEligibility ? "Elegibilidade atualizada. A versão anterior continua no histórico." : "Comissão atualizada. Comissões já registradas continuam com a regra da época.";
      setFeedback(reloaded
        ? { tab: kind, tone: "success", text: base }
        : { tab: kind, tone: "warning", text: `${base} Não foi possível recarregar a tela; atualize a página para ver a versão nova.` });
    } catch (err) {
      setFeedback({ tab: kind, tone: "danger", text: err?.message || `Não foi possível salvar ${isEligibility ? "a elegibilidade" : "a comissão"}.` });
    } finally {
      setSaving("");
    }
  }

  const historyColumns = (rows) => [
    { key: "versionNumber", label: "Versão", width: "90px" },
    { key: "effectiveFrom", label: "Vigente desde", render: (row) => formatDateTime(row.effectiveFrom) },
    { key: "effectiveUntil", label: "Até", render: (row) => (row.effectiveUntil ? formatDateTime(row.effectiveUntil) : "Vigente agora") },
    {
      key: "author",
      label: "Autor e motivo",
      render: (row) => {
        const author = row.authorName ?? row.createdByName ?? row.actorName ?? null;
        const reason = row.reason ?? row.changeReason ?? null;
        if (!author && !reason) return "Registrado na auditoria";
        return `${author || "Autor registrado na auditoria"}${reason ? `: ${reason}` : ""}`;
      },
    },
    {
      key: "summary",
      label: "O que mudou",
      render: (row) => {
        const index = rows.findIndex((r) => r.id === row.id);
        return changesText(row, rows[index + 1]);
      },
    },
  ];

  if (!params || !eligibility || !commission) {
    return (
      <AppShell title="Parâmetros do correspondente" backHref="/painel/correspondente">
        <div className={styles.wrap}>
          {loadError ? (
            <>
              <Alert tone="danger">{loadError}</Alert>
              <div><Button variant="secondary" onClick={() => load()}>Tentar de novo</Button></div>
            </>
          ) : <p>Carregando parâmetros…</p>}
        </div>
      </AppShell>
    );
  }

  const providers = params.options.providers;
  const eErr = errors.eligibility;
  const cErr = errors.commission;
  const tabFeedback = (tab) => (feedback && feedback.tab === tab ? (
    <div ref={feedbackRef} style={{ marginTop: 12 }}><Alert tone={feedback.tone}>{feedback.text}</Alert></div>
  ) : null);
  const groupError = (text) => (text ? <span role="alert" style={{ color: "var(--color-danger, #b42318)", fontSize: "0.8125rem" }}>{text}</span> : null);
  const setE = (patch) => setEligibility((s) => ({ ...s, ...patch }));
  const setC = (patch) => setCommission((s) => ({ ...s, ...patch }));

  function toggleTrigger(value) {
    setCommission((s) => {
      const allowed = toggle(s.allowedTriggerEvents, value);
      // O fato gerador padrão acompanha a lista de aceitos: se saiu dela, vira o primeiro aceito (ou vazio).
      const defaultTriggerEvent = allowed.includes(s.defaultTriggerEvent) ? s.defaultTriggerEvent : (allowed[0] || "");
      return { ...s, allowedTriggerEvents: allowed, defaultTriggerEvent };
    });
  }

  return (
    <AppShell title="Parâmetros do correspondente" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="warning">{loadError}</Alert> : null}
        {!canEdit ? (
          <Alert tone="warning" title="Somente leitura">
            Seu perfil não tem a permissão para alterar estes parâmetros. Você pode consultar os valores e o histórico.
          </Alert>
        ) : null}
        <Alert tone="info" title="Como funciona">
          Estes valores ficam no Motor de Regras. Cada alteração cria uma versão nova, com motivo e auditoria;
          a versão anterior não é apagada e comissões já registradas continuam usando a regra da época.
          Cada aba é salva separadamente: salvar uma não descarta o que você editou na outra.
        </Alert>

        <Tabs
          items={[
            {
              label: "Elegibilidade",
              content: (
                <Card title="Quem pode receber um caso" subtitle="Providers, produtos, finalidades e teto de valor aceitos antes de simular ou enviar.">
                  <fieldset disabled={!canEdit} style={BARE}>
                  <div className={styles.grid}>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Providers habilitados</span>
                      {providers.map((p) => (
                        <Checkbox
                          key={p}
                          id={`el-provider-${p}`}
                          label={PROVIDER_LABELS[p] || p}
                          checked={eligibility.allowedProviders.includes(p)}
                          onChange={() => setE({ allowedProviders: toggle(eligibility.allowedProviders, p) })}
                        />
                      ))}
                      {groupError(eErr.allowedProviders)}
                    </div>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Produtos habilitados</span>
                      {params.options.products.map((p) => (
                        <Checkbox
                          key={p.value}
                          id={`el-product-${p.value}`}
                          label={p.label}
                          checked={eligibility.allowedProducts.includes(p.value)}
                          onChange={() => setE({ allowedProducts: toggle(eligibility.allowedProducts, p.value) })}
                        />
                      ))}
                      {groupError(eErr.allowedProducts)}
                    </div>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Finalidades habilitadas</span>
                      {params.options.purposes.map((p) => (
                        <Checkbox
                          key={p}
                          id={`el-purpose-${p}`}
                          label={PURPOSE_LABELS[p] || p}
                          checked={eligibility.allowedPurposes.includes(p)}
                          onChange={() => setE({ allowedPurposes: toggle(eligibility.allowedPurposes, p) })}
                        />
                      ))}
                      {groupError(eErr.allowedPurposes)}
                    </div>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {providers.map((p) => (
                      <FormField key={p} label={`Teto de valor — ${PROVIDER_LABELS[p] || p} (R$)`} htmlFor={`el-max-${p}`} helper="Deixe vazio para não ter teto." error={eErr[`max-${p}`]}>
                        <DecimalInput
                          id={`el-max-${p}`}
                          maxDecimals={2}
                          value={eligibility.maxAmountByProvider[p]}
                          onChange={(e) => setE({ maxAmountByProvider: { ...eligibility.maxAmountByProvider, [p]: e.target.value } })}
                          placeholder="Sem teto"
                        />
                        {eligibility.maxAmountByProvider[p] && parseOrNull(eligibility.maxAmountByProvider[p]) > 0 ? (
                          <span className={styles.helper}>Será gravado como {parseOrNull(eligibility.maxAmountByProvider[p]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.</span>
                        ) : null}
                      </FormField>
                    ))}
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {providers.map((p) => (
                      <FormField key={`uf-${p}`} label={`Regiões atendidas — ${PROVIDER_LABELS[p] || p} (UFs)`} htmlFor={`el-uf-${p}`} helper="Ex.: SP, RJ. Vazio = sem restrição de região. Com UFs informadas, o caso precisa ter imóvel com UF dentro da lista." error={eErr[`uf-${p}`]}>
                        <Input
                          id={`el-uf-${p}`}
                          value={eligibility.allowedStatesByProvider[p]}
                          onChange={(e) => setE({ allowedStatesByProvider: { ...eligibility.allowedStatesByProvider, [p]: e.target.value } })}
                          placeholder="Todas as regiões"
                        />
                      </FormField>
                    ))}
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Checklist mínimo antes do envio</span>
                    {(params.options.documentTypes || []).map((d) => (
                      <Checkbox
                        key={d}
                        id={`el-doc-${d}`}
                        label={DOCUMENT_LABELS[d] || d}
                        checked={eligibility.requiredDocumentTypes.includes(d)}
                        onChange={() => setE({ requiredDocumentTypes: toggle(eligibility.requiredDocumentTypes, d) })}
                      />
                    ))}
                    <span className={styles.helper}>O caso só é enviado se o checklist tiver (e validar) estes documentos. Nenhum marcado = basta o checklist não estar vazio.</span>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {(params.options.documentTypes || []).map((d) => (
                      <FormField key={`val-${d}`} label={`Validade — ${DOCUMENT_LABELS[d] || d} (dias)`} htmlFor={`el-valid-${d}`} helper="Vazio = o documento não vence. Com prazo, o item reabre sozinho no vencimento." error={eErr[`valid-${d}`]}>
                        <IntegerInput id={`el-valid-${d}`} value={eligibility.documentValidityDays[d]} error={eErr[`valid-${d}`]} onChange={(v) => setE({ documentValidityDays: { ...eligibility.documentValidityDays, [d]: v } })} />
                      </FormField>
                    ))}
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    <FormField label="Janela de possível duplicata (horas)" htmlFor="el-dup-window" helper="Dois casos do mesmo proponente e imóvel dentro deste prazo viram possível duplicata. De 1 a 720." error={eErr.duplicateWindowHours} required>
                      <IntegerInput id="el-dup-window" value={eligibility.duplicateWindowHours} error={eErr.duplicateWindowHours} onChange={(v) => setE({ duplicateWindowHours: v })} />
                    </FormField>
                    <FormField label="Espera antes de liberar novo envio ou nova emissão de nota (minutos)" htmlFor="el-unknown-wait" helper="Depois de um envio com resultado incerto, o sistema espera este tempo antes de permitir um novo envio (dá tempo de uma resposta tardia do provider chegar). De 0 a 1440. Vale também para a NFS-e." error={eErr.unknownReleaseMinutes} required>
                      <IntegerInput id="el-unknown-wait" value={eligibility.unknownReleaseMinutes} error={eErr.unknownReleaseMinutes} onChange={(v) => setE({ unknownReleaseMinutes: v })} />
                    </FormField>
                    <FormField label="Dias sem atividade para sinalizar caso parado" htmlFor="el-stalled" helper="A NAY avisa quando um caso em andamento passa deste prazo sem mudança. De 1 a 365." error={eErr.stalledCaseDays} required>
                      <IntegerInput id="el-stalled" value={eligibility.stalledCaseDays} error={eErr.stalledCaseDays} onChange={(v) => setE({ stalledCaseDays: v })} />
                    </FormField>
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Possível duplicata</span>
                    <Checkbox
                      id="el-block-duplicate"
                      label="Bloquear o envio ao provider enquanto a possível duplicata não for revisada"
                      checked={eligibility.blockSubmissionOnPendingDuplicate}
                      onChange={() => setE({ blockSubmissionOnPendingDuplicate: !eligibility.blockSubmissionOnPendingDuplicate })}
                    />
                    <Checkbox
                      id="el-region-unknown"
                      label="Bloquear quando o provider tem regiões definidas e o caso não tem imóvel com UF"
                      checked={eligibility.blockWhenPropertyRegionUnknown}
                      onChange={() => setE({ blockWhenPropertyRegionUnknown: !eligibility.blockWhenPropertyRegionUnknown })}
                    />
                    <Checkbox
                      id="el-consent-evidence"
                      label="Exigir que o envio informe como o cliente autorizou (assinatura, WhatsApp, e-mail...)"
                      checked={eligibility.requireConsentEvidence}
                      onChange={() => setE({ requireConsentEvidence: !eligibility.requireConsentEvidence })}
                    />
                    <Checkbox
                      id="el-status-polling"
                      label="Consultar automaticamente o status dos casos no provider (para provider sem webhook)"
                      checked={eligibility.statusPollingEnabled}
                      onChange={() => setE({ statusPollingEnabled: !eligibility.statusPollingEnabled })}
                    />
                  </div>
                  {/*NEW_ELIGIBILITY_PARAMS*/}
                  <FormField label="Motivo da alteração" htmlFor="el-reason" helper="Obrigatório (mínimo 3 caracteres). Fica registrado na auditoria.">
                    <Input id="el-reason" value={eligibilityReason} onChange={(e) => setEligibilityReason(e.target.value)} />
                  </FormField>
                  <div className={styles.actions}>
                    <Button onClick={() => save("eligibility")} loading={saving === "eligibility"} disabled={!canEdit || Boolean(saving) || eligibilityReason.trim().length < 3}>
                      Salvar elegibilidade
                    </Button>
                  </div>
                  </fieldset>
                  {tabFeedback("eligibility")}
                  <div className={styles.history}>
                    <Table columns={historyColumns(params.eligibility.history)} rows={params.eligibility.history} emptyMessage="Nenhuma versão publicada ainda. Os valores acima são o padrão do sistema, ainda não salvo." />
                    {params.eligibility.history.length >= 20 ? <span className={styles.helper}>Mostrando as 20 versões mais recentes.</span> : null}
                  </div>
                </Card>
              ),
            },
            {
              label: "Comissão",
              content: (
                <Card title="Percentual e divisão da comissão" subtitle="Percentual sobre a base, parte do corretor e do gerente, e fatos geradores aceitos.">
                  <fieldset disabled={!canEdit} style={BARE}>
                  <div className={styles.grid}>
                    {providers.map((p) => (
                      <FormField key={`pct-${p}`} label={`Comissão — ${PROVIDER_LABELS[p] || p} (%)`} htmlFor={`co-pct-${p}`} helper="Cada provider precisa ter o seu percentual (maior que 0, até 100, com até 2 casas)." error={cErr[`pct-${p}`]}>
                        <DecimalInput
                          id={`co-pct-${p}`}
                          maxDecimals={2}
                          value={commission.percentageByProvider[p]}
                          onChange={(e) => setC({ percentageByProvider: { ...commission.percentageByProvider, [p]: e.target.value } })}
                        />
                      </FormField>
                    ))}
                    <FormField label="Comissão padrão (%)" htmlFor="co-pct-default" helper="Ponto de partida para um provider novo quando ele for habilitado. Mudar este valor não altera os providers listados ao lado." error={cErr.defaultPercentage}>
                      <DecimalInput id="co-pct-default" maxDecimals={2} value={commission.defaultPercentage} onChange={(e) => setC({ defaultPercentage: e.target.value })} />
                    </FormField>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {providers.map((p) => (
                      <FormField
                        key={`broker-${p}`}
                        label={`Parte do corretor — ${PROVIDER_LABELS[p] || p} (%)`}
                        htmlFor={`co-broker-${p}`}
                        helper={`Gerente fica com ${Math.max(0, 100 - (parseOrNull(commission.brokerSharePctByProvider[p]) ?? 0)).toLocaleString("pt-BR")}%. Pode ser 0%.`}
                        error={cErr[`broker-${p}`]}
                      >
                        <DecimalInput
                          id={`co-broker-${p}`}
                          maxDecimals={2}
                          value={commission.brokerSharePctByProvider[p]}
                          onChange={(e) => setC({ brokerSharePctByProvider: { ...commission.brokerSharePctByProvider, [p]: e.target.value } })}
                        />
                      </FormField>
                    ))}
                    <FormField label="Parte do corretor padrão (%)" htmlFor="co-broker-default" error={cErr.defaultBrokerSharePct}>
                      <DecimalInput id="co-broker-default" maxDecimals={2} value={commission.defaultBrokerSharePct} onChange={(e) => setC({ defaultBrokerSharePct: e.target.value })} />
                    </FormField>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Fatos geradores aceitos</span>
                      {params.options.triggerEvents.map((t) => (
                        <Checkbox
                          key={t.value}
                          id={`co-trigger-${t.value}`}
                          label={t.label}
                          checked={commission.allowedTriggerEvents.includes(t.value)}
                          onChange={() => toggleTrigger(t.value)}
                        />
                      ))}
                      {groupError(cErr.allowedTriggerEvents)}
                    </div>
                    <FormField label="Fato gerador padrão" htmlFor="co-trigger-default" error={cErr.defaultTriggerEvent}>
                      <Select id="co-trigger-default" value={commission.defaultTriggerEvent} onChange={(e) => setC({ defaultTriggerEvent: e.target.value })} disabled={commission.allowedTriggerEvents.length === 0}>
                        {commission.allowedTriggerEvents.length === 0 ? <option value="">Marque ao menos um fato gerador</option> : null}
                        {params.options.triggerEvents
                          .filter((t) => commission.allowedTriggerEvents.includes(t.value))
                          .map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                      </Select>
                    </FormField>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    <FormField label="Prazo para emitir a NFS-e da comissão (dias)" htmlFor="co-grace" helper="Depois deste prazo, comissão recebível sem nota aparece como divergência em Fiscal. De 0 a 365; 0 significa que a nota é esperada no mesmo dia." error={cErr.invoiceGraceDays} required>
                      <IntegerInput id="co-grace" value={commission.invoiceGraceDays} error={cErr.invoiceGraceDays} onChange={(v) => setC({ invoiceGraceDays: v })} />
                    </FormField>
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Etapas em que o caso NÃO gera comissão</span>
                    {BLOCKABLE_CASE_STATUSES.map((value) => (
                      <Checkbox
                        key={value}
                        id={`co-blocked-${value}`}
                        label={STATUS_LABELS[value] || value}
                        checked={commission.blockedCaseStatuses.includes(value)}
                        onChange={() => setC({ blockedCaseStatuses: toggle(commission.blockedCaseStatuses, value) })}
                      />
                    ))}
                    <span className={styles.helper}>Caso cancelado ou recusado nunca gera comissão.</span>
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Comissão repetida</span>
                    <Checkbox
                      id="co-block-duplicate"
                      label="Bloquear uma segunda comissão ativa para o mesmo caso e fato gerador"
                      checked={commission.blockDuplicateCommissionPerTrigger}
                      onChange={() => setC({ blockDuplicateCommissionPerTrigger: !commission.blockDuplicateCommissionPerTrigger })}
                    />
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Confirmação da comissão</span>
                    <Checkbox
                      id="co-confirm-finance"
                      label="Exigir também a permissão financeira (liquidar) para confirmar uma comissão"
                      checked={commission.confirmRequiresFinancePermission}
                      onChange={() => setC({ confirmRequiresFinancePermission: !commission.confirmRequiresFinancePermission })}
                    />
                  </div>
                  <FormField label="Prazo para o banco pagar a comissão (dias)" htmlFor="co-due-days" helper="Define o vencimento do recebível criado no Financeiro quando a comissão é confirmada. De 0 a 365." error={cErr.receivableDueDays} required>
                    <IntegerInput id="co-due-days" value={commission.receivableDueDays} error={cErr.receivableDueDays} onChange={(v) => setC({ receivableDueDays: v })} />
                  </FormField>
                  <FormField label="DIMOB: palavras de cobrança que NÃO são aluguel" htmlFor="co-dimob-keywords" helper="Lançamentos do contrato cuja descrição tenha uma destas palavras ficam fora do valor de aluguel da DIMOB (ex.: condomínio, IPTU, multa). Até 50 palavras, separadas por vírgula." error={cErr.dimobExcludedKeywords}>
                    <Input id="co-dimob-keywords" value={commission.dimobExcludedKeywords} onChange={(e) => setC({ dimobExcludedKeywords: e.target.value })} />
                  </FormField>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>DIMOB</span>
                    <Checkbox
                      id="co-dimob-commissions"
                      label="Incluir as comissões de correspondente no batch DIMOB (só se a contabilidade orientar)"
                      checked={commission.dimobIncludeCommissions}
                      onChange={() => setC({ dimobIncludeCommissions: !commission.dimobIncludeCommissions })}
                    />
                  </div>
                  <div className={styles.group} style={{ marginTop: 16 }}>
                    <span className={styles.groupTitle}>Arquivo da DIMOB (layout definido pela empresa e pelo contador)</span>
                    <FormField label="Versão do layout" htmlFor="co-dimob-layout" helper="Aparece no cabeçalho do arquivo e no batch. Use {ano} para o ano-base (ex.: DIMOB-{ano}-v1). Até 16 caracteres." error={cErr.dimobLayoutLabel} required>
                      <Input id="co-dimob-layout" value={commission.dimobLayoutLabel} onChange={(e) => setC({ dimobLayoutLabel: e.target.value })} />
                    </FormField>
                    <FormField label="Colunas do arquivo, na ordem" htmlFor="co-dimob-columns" helper={`Separe por vírgula. Disponíveis: ${DIMOB_COLUMNS}.`} error={cErr.dimobFileColumns} required>
                      <Input id="co-dimob-columns" value={commission.dimobFileColumns} onChange={(e) => setC({ dimobFileColumns: e.target.value })} />
                    </FormField>
                    <FormField label="Separador" htmlFor="co-dimob-delimiter" helper="O Excel em português abre melhor com ponto e vírgula.">
                      <Select id="co-dimob-delimiter" value={commission.dimobFileDelimiter} onChange={(e) => setC({ dimobFileDelimiter: e.target.value })}>
                        <option value=";">Ponto e vírgula ( ; )</option>
                        <option value=",">Vírgula ( , )</option>
                        <option value="|">Barra vertical ( | )</option>
                      </Select>
                    </FormField>
                    <FormField label="Aviso no cabeçalho do arquivo" htmlFor="co-dimob-notice" helper="Texto da primeira linha. Deixe em branco depois que o contador validar o layout oficial." error={cErr.dimobFileNotice}>
                      <Input id="co-dimob-notice" value={commission.dimobFileNotice} onChange={(e) => setC({ dimobFileNotice: e.target.value })} />
                    </FormField>
                  </div>
                  {/*NEW_COMMISSION_PARAMS*/}
                  <FormField label="Motivo da alteração" htmlFor="co-reason" helper="Obrigatório (mínimo 3 caracteres). Fica registrado na auditoria.">
                    <Input id="co-reason" value={commissionReason} onChange={(e) => setCommissionReason(e.target.value)} />
                  </FormField>
                  <div className={styles.actions}>
                    <Button onClick={() => save("commission")} loading={saving === "commission"} disabled={!canEdit || Boolean(saving) || commissionReason.trim().length < 3}>
                      Salvar comissão
                    </Button>
                  </div>
                  </fieldset>
                  {tabFeedback("commission")}
                  <div className={styles.history}>
                    <Table columns={historyColumns(params.commission.history)} rows={params.commission.history} emptyMessage="Nenhuma versão publicada ainda. Os valores acima são o padrão do sistema, ainda não salvo." />
                    {params.commission.history.length >= 20 ? <span className={styles.helper}>Mostrando as 20 versões mais recentes.</span> : null}
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
