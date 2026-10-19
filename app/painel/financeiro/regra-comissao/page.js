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
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getCommissionRule, publishCommissionRule } from "@/lib/api/finance";
import styles from "./page.module.css";

const COMPONENTS = [
  { key: "BROKER", label: "Corretor (%)" },
  { key: "MANAGER", label: "Gerente (%)" },
  { key: "CORRESPONDENT", label: "Correspondente (%)" },
];

export default function CommissionRulePage() {
  const [rule, setRule] = useState(null);
  const [ruleMessage, setRuleMessage] = useState("");
  const [values, setValues] = useState({ BROKER: "", MANAGER: "", CORRESPONDENT: "" });
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setRuleMessage("");
    try {
      const current = await getCommissionRule();
      setRule(current);
      const next = { BROKER: "", MANAGER: "", CORRESPONDENT: "" };
      Object.entries(current?.components || {}).forEach(([k, v]) => {
        next[k] = String(v);
      });
      setValues(next);
    } catch (err) {
      setRule(null);
      setRuleMessage(err?.message || "Nenhuma regra de comissão publicada ainda.");
    }
  }

  useEffect(() => {
    load();
  }, []);

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
          <h2 className={styles.sectionTitle}>Versão vigente (REG-FIN-002)</h2>
          {rule ? (
            <p className={styles.helper}>
              Versão {rule.ruleVersionId} · base: valor do recebimento ·{" "}
              {COMPONENTS.map(({ key, label }) => `${label.replace(" (%)", "")}: ${rule.components?.[key] ?? "—"}%`).join(" · ")}
            </p>
          ) : (
            <p className={styles.helper}>{ruleMessage || "Carregando..."}</p>
          )}
        </Card>

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Publicar nova versão</h2>
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
            <Button type="submit" disabled={saving}>
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
