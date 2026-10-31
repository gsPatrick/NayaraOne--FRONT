"use client";

// REG-FIN-002 — publicação da regra de comissão (Caderno §14). A API já publicava versões
// (POST /finance/commission-rule, finance:approve + MFA recente), mas não havia tela: o
// percentual só podia ser mudado via chamada direta.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useFormSync } from "@/lib/asyncState/useFormSync";
import { useAsyncState, invalidateAsyncCache } from "@/lib/asyncState/useAsyncState";
import ReloadAlert from "@/components/molecules/ReloadAlert/ReloadAlert";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getCommissionRule, publishCommissionRule, listCommissionRuleVersions } from "@/lib/api/finance";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import { formatDateTime, formatPercent } from "@/lib/format";
import styles from "./page.module.css";

// O que mudou em relação à versão anterior (a lista vem da mais nova para a mais antiga).
function describeChange(version, olderVersion) {
  if (!olderVersion) return "Primeira versão publicada.";
  const changes = [];
  for (const { key, label } of COMPONENTS) {
    const before = olderVersion.components?.[key];
    const after = version.components?.[key];
    if (before === after) continue;
    const name = label.replace(" (%)", "");
    if (before == null) changes.push(`${name}: passou a valer ${formatPercent(after)}`);
    else if (after == null) changes.push(`${name}: deixou de ter percentual (era ${formatPercent(before)})`);
    else changes.push(`${name}: de ${formatPercent(before)} para ${formatPercent(after)}`);
  }
  return changes.length ? changes.join("; ") : "Nenhum percentual mudou.";
}

const COMPONENTS = [
  { key: "BROKER", label: "Corretor (%)" },
  { key: "MANAGER", label: "Gerente (%)" },
  { key: "CORRESPONDENT", label: "Correspondente (%)" },
];

export default function CommissionRulePage() {
  // M9-D940: a regra vigente e o histórico vêm do padrão único de estados. "Nenhuma regra publicada" é só o 404 da API;
  // sem acesso, sem conexão e erro de servidor aparecem com o estado certo (nunca como "sem regra").
  const ruleQuery = useAsyncState(
    () => getCommissionRule().then((current) => ({ current })).catch((err) => {
      if (err?.status === 404) return { current: null };
      throw err;
    }),
    { key: "regra-comissao", isEmpty: () => false }
  );
  const rule = ruleQuery.data?.current || null;
  const ruleMessage = ruleQuery.data ? "Nenhuma regra de comissão publicada ainda." : "";
  const versionsQuery = useAsyncState(() => listCommissionRuleVersions().then((list) => (Array.isArray(list) ? list : [])), { key: "regra-comissao:versoes", isEmpty: () => false });
  const versions = versionsQuery.data || [];
  const [values, setValues] = useState({ BROKER: "", MANAGER: "", CORRESPONDENT: "" });
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dado fresco que chega depois de o usuário digitar não apaga o que foi digitado (depois de publicar, a carga vale de novo).
  const formSync = useFormSync({
    data: ruleQuery.data,
    form: values,
    apply: setValues,
    build: (data) => {
      const next = { BROKER: "", MANAGER: "", CORRESPONDENT: "" };
      Object.entries(data?.current?.components || {}).forEach(([k, v]) => {
        next[k] = String(v);
      });
      return next;
    },
  });

  async function load() {
    formSync.forceNext();
    await Promise.all([ruleQuery.reload(), versionsQuery.reload()]);
  }

  function buildPayload() {
    const payload = {};
    for (const { key, label } of COMPONENTS) {
      const raw = String(values[key] || "").trim().replace(",", ".");
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || n > 100) {
        throw new Error(`${label}: informe um percentual maior que 0 e até 100.`);
      }
      payload[key] = n;
    }
    if (Object.keys(payload).length === 0) throw new Error("Informe o percentual de pelo menos um componente.");
    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    try {
      buildPayload();
    } catch (err) {
      setFormError(err.message);
      return;
    }
    setMfaOpen(true);
  }

  async function runPublish() {
    setSaving(true);
    try {
      await publishCommissionRule(buildPayload());
      // A revisita não pode subir a regra pré-publicação do cache, mesmo se a recarga abaixo falhar.
      invalidateAsyncCache("regra-comissao");
      invalidateAsyncCache("regra-comissao:versoes");
      setSuccess("Nova versão da regra publicada. Comissões já calculadas continuam com a versão que usaram.");
      await load();
    } catch (err) {
      setFormError(err?.message || "Falha ao publicar a regra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Regra de comissão" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Versão vigente</h2>
          {rule ? (
            <p className={styles.helper}>
              Versão {rule.versionNumber ?? "vigente"}{rule.effectiveFrom ? ` (publicada em ${formatDateTime(rule.effectiveFrom)})` : ""} · base: valor do recebimento ·{" "}
              {COMPONENTS.map(({ key, label }) => `${label.replace(" (%)", "")}: ${rule.components?.[key] != null ? formatPercent(rule.components[key]) : "não se aplica"}`).join(" · ")}
            </p>
          ) : ruleQuery.data ? (
            <p className={styles.helper}>{ruleMessage}</p>
          ) : (
            <AsyncState result={ruleQuery} loadingLabel="Carregando regra vigente..." />
          )}
        </Card>

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Histórico de versões</h2>
          <p className={styles.helper}>Todas as versões publicadas, da mais nova para a mais antiga. Comissões já calculadas guardam a versão que usaram.</p>
          {versionsQuery.status !== "LOADING" && !versionsQuery.data ? <AsyncState result={versionsQuery} /> : null}
          <Table
            loading={versionsQuery.status === "LOADING" && !versionsQuery.data}
            rows={versions}
            emptyMessage="Nenhuma versão publicada ainda."
            columns={[
              { key: "versionNumber", label: "Versão", render: (v) => (
                <span>Versão {v.versionNumber} {v.current ? <Badge tone="success">Vigente</Badge> : null}</span>
              ) },
              ...COMPONENTS.map(({ key, label }) => ({
                key,
                label: label.replace(" (%)", ""),
                render: (v) => (v.components?.[key] != null ? formatPercent(v.components[key]) : "Não se aplica"),
              })),
              { key: "vigencia", label: "Vigência", render: (v) => (
                v.effectiveUntil
                  ? `De ${formatDateTime(v.effectiveFrom)} até ${formatDateTime(v.effectiveUntil)}`
                  : `Desde ${formatDateTime(v.effectiveFrom)} (em vigor)`
              ) },
              { key: "mudou", label: "O que mudou", render: (v) => describeChange(v, versions[versions.indexOf(v) + 1]) },
              { key: "publishedByName", label: "Publicada por", render: (v) => v.publishedByName },
              { key: "publishedAt", label: "Publicada em", render: (v) => formatDateTime(v.publishedAt) },
            ]}
          />
        </Card>

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Publicar nova versão</h2>
          <ReloadAlert result={ruleQuery} />
          <p className={styles.helper}>
            Publicar encerra a vigência da versão atual. Exige permissão de aprovação no Financeiro e confirmação com MFA.
          </p>
          <form onSubmit={handleSubmit} className={styles.form}>
            {COMPONENTS.map(({ key, label }) => (
              <FormField key={key} label={label} htmlFor={`pct-${key}`}>
                <Input
                  id={`pct-${key}`}
                  inputMode="decimal"
                  value={values[key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </FormField>
            ))}
            {formError ? <Alert tone="danger">{formError}</Alert> : null}
            {success ? <Alert tone="success">{success}</Alert> : null}
            <Button requires="finance:approve" type="submit" disabled={saving || !ruleQuery.fresh}>
              {saving ? "Publicando..." : "Publicar regra"}
            </Button>
          </form>
        </Card>
      </div>

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="publicar a nova regra de comissão"
        onVerified={async () => {
          setMfaOpen(false);
          await runPublish();
        }}
      />

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
