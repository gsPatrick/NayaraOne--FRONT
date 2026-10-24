"use client";

import { useEffect, useState } from "react";
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
import styles from "./page.module.css";

const PROVIDER_LABELS = { sandbox: "Sandbox (simulação)", manual: "Manual (sem banco real integrado)" };
const PURPOSE_LABELS = { RESIDENCIAL: "Residencial", COMERCIAL: "Comercial" };

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

export default function ParametrosCorrespondentePage() {
  const [params, setParams] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [commission, setCommission] = useState(null);
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [commissionReason, setCommissionReason] = useState("");
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrate(data) {
    setParams(data);
    const e = data.eligibility.action;
    setEligibility({
      allowedProviders: e.allowedProviders || [],
      allowedPurposes: e.allowedPurposes || [],
      allowedProducts: e.allowedProducts || [],
      maxAmountByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((e.maxAmountByProvider || {})[p])])),
    });
    const c = data.commission.action;
    setCommission({
      percentageByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((c.percentageByProvider || {})[p] ?? c.defaultPercentage)])),
      defaultPercentage: numberText(c.defaultPercentage),
      brokerSharePctByProvider: Object.fromEntries(data.options.providers.map((p) => [p, numberText((c.brokerSharePctByProvider || {})[p] ?? c.defaultBrokerSharePct)])),
      defaultBrokerSharePct: numberText(c.defaultBrokerSharePct),
      allowedTriggerEvents: c.allowedTriggerEvents || [],
      defaultTriggerEvent: c.defaultTriggerEvent || "",
    });
  }

  function load() {
    setLoadError("");
    getCorrespondentParameters()
      .then(hydrate)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os parâmetros."));
  }

  useEffect(() => { load(); }, []);

  async function saveEligibility() {
    setSaving("eligibility");
    setError("");
    setMessage("");
    try {
      await updateEligibilityParameters(
        {
          allowedProviders: eligibility.allowedProviders,
          allowedPurposes: eligibility.allowedPurposes,
          allowedProducts: eligibility.allowedProducts,
          maxAmountByProvider: Object.fromEntries(Object.entries(eligibility.maxAmountByProvider).map(([p, v]) => [p, parseOrNull(v)])),
        },
        eligibilityReason
      );
      setMessage("Elegibilidade atualizada. A versão anterior continua no histórico.");
      setEligibilityReason("");
      load();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a elegibilidade.");
    } finally {
      setSaving("");
    }
  }

  async function saveCommission() {
    setSaving("commission");
    setError("");
    setMessage("");
    try {
      await updateCommissionParameters(
        {
          percentageByProvider: Object.fromEntries(Object.entries(commission.percentageByProvider).map(([p, v]) => [p, parseOrNull(v)])),
          defaultPercentage: parseOrNull(commission.defaultPercentage),
          brokerSharePctByProvider: Object.fromEntries(Object.entries(commission.brokerSharePctByProvider).map(([p, v]) => [p, parseOrNull(v)])),
          defaultBrokerSharePct: parseOrNull(commission.defaultBrokerSharePct),
          allowedTriggerEvents: commission.allowedTriggerEvents,
          defaultTriggerEvent: commission.defaultTriggerEvent,
        },
        commissionReason
      );
      setMessage("Comissão atualizada. Comissões já registradas continuam com a regra da época.");
      setCommissionReason("");
      load();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a comissão.");
    } finally {
      setSaving("");
    }
  }

  const historyColumns = (kind) => [
    { key: "versionNumber", label: "Versão", width: "90px" },
    { key: "effectiveFrom", label: "Vigente desde", render: (row) => formatDateTime(row.effectiveFrom) },
    { key: "effectiveUntil", label: "Até", render: (row) => (row.effectiveUntil ? formatDateTime(row.effectiveUntil) : "Vigente agora") },
    {
      key: "summary",
      label: "Resumo",
      render: (row) =>
        kind === "eligibility"
          ? `${(row.action.allowedProviders || []).length} provider(s), ${(row.action.allowedPurposes || []).length} finalidade(s)${row.action.allowedProducts ? `, ${row.action.allowedProducts.length} produto(s)` : ""}`
          : `Padrão ${row.action.defaultPercentage}% — corretor ${row.action.defaultBrokerSharePct ?? 100}%`,
    },
  ];

  if (!params || !eligibility || !commission) {
    return (
      <AppShell title="Parâmetros do correspondente" backHref="/painel/correspondente">
        <div className={styles.wrap}>
          {loadError ? <Alert tone="danger">{loadError}</Alert> : <p>Carregando parâmetros…</p>}
        </div>
      </AppShell>
    );
  }

  const providers = params.options.providers;

  return (
    <AppShell title="Parâmetros do correspondente" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Alert tone="info" title="Como funciona">
          Estes valores ficam no Motor de Regras. Cada alteração cria uma versão nova, com motivo e auditoria;
          a versão anterior não é apagada e comissões já registradas continuam usando a regra da época.
        </Alert>

        <Tabs
          items={[
            {
              label: "Elegibilidade",
              content: (
                <Card title="Quem pode receber um caso" subtitle="Providers, produtos, finalidades e teto de valor aceitos antes de simular ou enviar.">
                  <div className={styles.grid}>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Providers habilitados</span>
                      {providers.map((p) => (
                        <Checkbox
                          key={p}
                          id={`el-provider-${p}`}
                          label={PROVIDER_LABELS[p] || p}
                          checked={eligibility.allowedProviders.includes(p)}
                          onChange={() => setEligibility((s) => ({ ...s, allowedProviders: toggle(s.allowedProviders, p) }))}
                        />
                      ))}
                    </div>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Produtos habilitados</span>
                      {params.options.products.map((p) => (
                        <Checkbox
                          key={p.value}
                          id={`el-product-${p.value}`}
                          label={p.label}
                          checked={eligibility.allowedProducts.includes(p.value)}
                          onChange={() => setEligibility((s) => ({ ...s, allowedProducts: toggle(s.allowedProducts, p.value) }))}
                        />
                      ))}
                    </div>
                    <div className={styles.group}>
                      <span className={styles.groupTitle}>Finalidades habilitadas</span>
                      {params.options.purposes.map((p) => (
                        <Checkbox
                          key={p}
                          id={`el-purpose-${p}`}
                          label={PURPOSE_LABELS[p] || p}
                          checked={eligibility.allowedPurposes.includes(p)}
                          onChange={() => setEligibility((s) => ({ ...s, allowedPurposes: toggle(s.allowedPurposes, p) }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {providers.map((p) => (
                      <FormField key={p} label={`Teto de valor — ${PROVIDER_LABELS[p] || p} (R$)`} htmlFor={`el-max-${p}`} helper="Deixe vazio para não ter teto.">
                        <DecimalInput
                          id={`el-max-${p}`}
                          value={eligibility.maxAmountByProvider[p]}
                          onChange={(e) => setEligibility((s) => ({ ...s, maxAmountByProvider: { ...s.maxAmountByProvider, [p]: e.target.value } }))}
                          placeholder="Sem teto"
                        />
                      </FormField>
                    ))}
                  </div>
                  <FormField label="Motivo da alteração" htmlFor="el-reason" helper="Obrigatório. Fica registrado na auditoria.">
                    <Input id="el-reason" value={eligibilityReason} onChange={(e) => setEligibilityReason(e.target.value)} />
                  </FormField>
                  <div className={styles.actions}>
                    <Button onClick={saveEligibility} loading={saving === "eligibility"} disabled={eligibilityReason.trim().length < 3}>
                      Salvar elegibilidade
                    </Button>
                  </div>
                  <div className={styles.history}>
                    <Table columns={historyColumns("eligibility")} rows={params.eligibility.history} emptyMessage="Nenhuma versão publicada ainda." />
                  </div>
                </Card>
              ),
            },
            {
              label: "Comissão",
              content: (
                <Card title="Percentual e divisão da comissão" subtitle="Percentual sobre a base, parte do corretor e do gerente, e fatos geradores aceitos.">
                  <div className={styles.grid}>
                    {providers.map((p) => (
                      <FormField key={`pct-${p}`} label={`Comissão — ${PROVIDER_LABELS[p] || p} (%)`} htmlFor={`co-pct-${p}`}>
                        <DecimalInput
                          id={`co-pct-${p}`}
                          value={commission.percentageByProvider[p]}
                          onChange={(e) => setCommission((s) => ({ ...s, percentageByProvider: { ...s.percentageByProvider, [p]: e.target.value } }))}
                        />
                      </FormField>
                    ))}
                    <FormField label="Comissão padrão (%)" htmlFor="co-pct-default" helper="Vale para providers sem percentual próprio.">
                      <DecimalInput id="co-pct-default" value={commission.defaultPercentage} onChange={(e) => setCommission((s) => ({ ...s, defaultPercentage: e.target.value }))} />
                    </FormField>
                  </div>
                  <div className={styles.grid} style={{ marginTop: 16 }}>
                    {providers.map((p) => (
                      <FormField
                        key={`broker-${p}`}
                        label={`Parte do corretor — ${PROVIDER_LABELS[p] || p} (%)`}
                        htmlFor={`co-broker-${p}`}
                        helper={`Gerente fica com ${Math.max(0, 100 - (parseOrNull(commission.brokerSharePctByProvider[p]) ?? 0)).toLocaleString("pt-BR")}%.`}
                      >
                        <DecimalInput
                          id={`co-broker-${p}`}
                          value={commission.brokerSharePctByProvider[p]}
                          onChange={(e) => setCommission((s) => ({ ...s, brokerSharePctByProvider: { ...s.brokerSharePctByProvider, [p]: e.target.value } }))}
                        />
                      </FormField>
                    ))}
                    <FormField label="Parte do corretor padrão (%)" htmlFor="co-broker-default">
                      <DecimalInput id="co-broker-default" value={commission.defaultBrokerSharePct} onChange={(e) => setCommission((s) => ({ ...s, defaultBrokerSharePct: e.target.value }))} />
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
                          onChange={() => setCommission((s) => ({ ...s, allowedTriggerEvents: toggle(s.allowedTriggerEvents, t.value) }))}
                        />
                      ))}
                    </div>
                    <FormField label="Fato gerador padrão" htmlFor="co-trigger-default">
                      <Select id="co-trigger-default" value={commission.defaultTriggerEvent} onChange={(e) => setCommission((s) => ({ ...s, defaultTriggerEvent: e.target.value }))}>
                        {params.options.triggerEvents
                          .filter((t) => commission.allowedTriggerEvents.includes(t.value))
                          .map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="Motivo da alteração" htmlFor="co-reason" helper="Obrigatório. Fica registrado na auditoria.">
                    <Input id="co-reason" value={commissionReason} onChange={(e) => setCommissionReason(e.target.value)} />
                  </FormField>
                  <div className={styles.actions}>
                    <Button onClick={saveCommission} loading={saving === "commission"} disabled={commissionReason.trim().length < 3}>
                      Salvar comissão
                    </Button>
                  </div>
                  <div className={styles.history}>
                    <Table columns={historyColumns("commission")} rows={params.commission.history} emptyMessage="Nenhuma versão publicada ainda." />
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
