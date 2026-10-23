"use client";

// GAP REAL CORRIGIDO (re-auditoria 13/10/2026, round 2, M6-R06): "SLA é exibido nos chamados
// de pós-obra, mas não há campo de configuração de SLA no formulário." O backend já suporta
// configuração de SLA por severidade (REG-OBR-002, Motor de Regras, slaRules.service.js) —
// deliberadamente NÃO é um campo por chamado (o Caderno trata isso como regra versionada do
// tenant, não entrada manual caso a caso), mas não existia NENHUMA rota nem tela pra configurar
// essa regra. Esta tela cobre isso.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Radio from "@/components/atoms/Radio/Radio";
import { getActiveSlaRule, createSlaRule, getActiveMarginRule, createMarginRule } from "@/lib/api/construction";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

const SEVERITIES = [
  { key: "CRITICAL", label: "Crítica" },
  { key: "HIGH", label: "Alta" },
  { key: "MEDIUM", label: "Média" },
  { key: "LOW", label: "Baixa" },
];

export default function ObrasConfiguracoesPage() {
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({ CRITICAL: "", HIGH: "", MEDIUM: "", LOW: "" });
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [margin, setMargin] = useState(null);
  const [marginForm, setMarginForm] = useState({ minMarginPct: "", economyPct: "", commissionPct: "", enforcementMode: "ALERT" });
  const [marginLoading, setMarginLoading] = useState(true);
  const [marginSaving, setMarginSaving] = useState(false);
  const [marginError, setMarginError] = useState("");
  const [marginNotice, setMarginNotice] = useState("");

  function pctToField(value) {
    return value === null || value === undefined ? "" : String(Number(value)).replace(".", ",");
  }

  function loadMargin() {
    return getActiveMarginRule()
      .then((rule) => {
        setMargin(rule);
        setMarginForm({
          minMarginPct: pctToField(rule?.minMarginPct),
          economyPct: pctToField(rule?.economyPct),
          commissionPct: pctToField(rule?.commissionPct),
          enforcementMode: rule?.enforcementMode === "BLOCK" ? "BLOCK" : "ALERT",
        });
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar a regra de margem ativa."))
      .finally(() => setMarginLoading(false));
  }

  function load() {
    setLoading(true);
    setLoadError("");
    loadMargin();
    getActiveSlaRule()
      .then((data) => {
        setCurrent(data);
        setForm({
          CRITICAL: String(data.slaDays?.CRITICAL ?? ""),
          HIGH: String(data.slaDays?.HIGH ?? ""),
          MEDIUM: String(data.slaDays?.MEDIUM ?? ""),
          LOW: String(data.slaDays?.LOW ?? ""),
        });
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar a regra de SLA ativa."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const isValid = SEVERITIES.every((s) => form[s.key] !== "" && Number(form[s.key]) > 0 && Number.isInteger(Number(form[s.key])));

  const marginValid =
    marginForm.minMarginPct !== "" &&
    !Number.isNaN(toNumber(marginForm.minMarginPct)) &&
    toNumber(marginForm.minMarginPct) >= 0 &&
    toNumber(marginForm.minMarginPct) <= 100;

  async function handleSaveMargin() {
    if (!marginValid || marginSaving) return;
    setMarginSaving(true);
    setMarginError("");
    setMarginNotice("");
    try {
      await createMarginRule({
        minMarginPct: toNumber(marginForm.minMarginPct),
        economyPct: marginForm.economyPct === "" ? null : toNumber(marginForm.economyPct),
        commissionPct: marginForm.commissionPct === "" ? null : toNumber(marginForm.commissionPct),
        enforcementMode: marginForm.enforcementMode,
      });
      setMarginNotice("Nova versão da margem mínima publicada. Orçamentos já aprovados mantêm a versão com que foram aprovados.");
      await loadMargin();
    } catch (err) {
      setMarginError(err?.message || "Não foi possível publicar a margem mínima.");
    } finally {
      setMarginSaving(false);
    }
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      await createSlaRule({
        slaDays: {
          CRITICAL: Number(form.CRITICAL),
          HIGH: Number(form.HIGH),
          MEDIUM: Number(form.MEDIUM),
          LOW: Number(form.LOW),
        },
        description: description.trim() || undefined,
      });
      setNotice("Nova versão da regra de SLA publicada. Chamados já abertos mantêm o SLA calculado na abertura; só novos chamados usam o valor atualizado.");
      setDescription("");
      load();
    } catch (err) {
      setSaveError(err?.message || "Não foi possível publicar a nova regra de SLA.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Configurações de Obras" backHref="/painel/obras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar">{loadError}</Alert> : null}

      {loading ? (
        <SkeletonDetail sections={2} />
      ) : (
        <>
        <Card
          title="SLA de garantia por severidade"
          subtitle="Prazo padrão de atendimento de pós-obra por severidade"
        >
          <p className={styles.helper}>
            Cada abertura de chamado de garantia calcula o prazo (SLA) a partir da severidade, usando a regra ativa abaixo.
            Não é um campo editável por chamado — é uma regra do Motor de Regras, versionada: publicar uma nova versão
            não altera chamados já abertos, só os próximos.
          </p>

          {current ? (
            <p className={styles.current}>Esta é a regra vigente — já em uso nos chamados abertos a partir de agora.</p>
          ) : null}

          {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
          {saveError ? <Alert tone="danger" className={styles.notice}>{saveError}</Alert> : null}

          <div className={styles.grid}>
            {SEVERITIES.map((s) => (
              <FormField key={s.key} label={`${s.label} (dias)`} htmlFor={`sla-${s.key}`}>
                <Input
                  id={`sla-${s.key}`}
                  type="number"
                  min="1"
                  step="1"
                  value={form[s.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [s.key]: e.target.value }))}
                />
              </FormField>
            ))}
          </div>

          <FormField label="Descrição da alteração" htmlFor="sla-desc" helper="Opcional — fica registrada na versão publicada">
            <Input id="sla-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: ajuste de prazo após revisão trimestral" />
          </FormField>

          <Button onClick={handleSave} loading={saving} disabled={!isValid}>
            <Icon name="check" size={16} /> Publicar nova versão
          </Button>
        </Card>

        <Card
          title="Margem mínima da obra"
          subtitle="Regra da empresa usada na aprovação de orçamento e na Saúde da obra"
        >
          <p className={styles.helper}>
            O percentual é definido por você: o sistema não assume nenhum valor. Enquanto não houver uma margem mínima
            publicada, a aprovação de orçamento fica bloqueada. Publicar cria uma nova versão; a anterior fica no histórico
            e não altera orçamentos já aprovados.
          </p>
          {marginLoading ? null : margin ? (
            <p className={styles.current}>Regra vigente: margem mínima de {pctToField(margin.minMarginPct)}%.</p>
          ) : (
            <Alert tone="warning" className={styles.notice} title="Margem mínima não configurada">
              Defina o percentual abaixo para liberar a aprovação de orçamentos desta empresa.
            </Alert>
          )}
          {marginNotice ? <Alert tone="success" className={styles.notice}>{marginNotice}</Alert> : null}
          {marginError ? <Alert tone="danger" className={styles.notice}>{marginError}</Alert> : null}

          <div className={styles.grid}>
            <FormField label="Margem mínima exigida (%)" htmlFor="margin-min" required>
              <DecimalInput
                id="margin-min"
                value={marginForm.minMarginPct}
                onChange={(e) => setMarginForm((p) => ({ ...p, minMarginPct: e.target.value }))}
                onFocus={(e) => e.target.select()}
                placeholder="Ex: 10,00"
              />
            </FormField>
            <FormField label="Economia (%)" htmlFor="margin-economy" helper="Opcional — referência informativa">
              <DecimalInput
                id="margin-economy"
                value={marginForm.economyPct}
                onChange={(e) => setMarginForm((p) => ({ ...p, economyPct: e.target.value }))}
                onFocus={(e) => e.target.select()}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Comissão (%)" htmlFor="margin-commission" helper="Opcional — considerada no cálculo de margem">
              <DecimalInput
                id="margin-commission"
                value={marginForm.commissionPct}
                onChange={(e) => setMarginForm((p) => ({ ...p, commissionPct: e.target.value }))}
                onFocus={(e) => e.target.select()}
                placeholder="0,00"
              />
            </FormField>
          </div>

          <FormField
            label="Quando a margem projetada ficar abaixo do mínimo"
            htmlFor="margin-enforcement-alert"
            helper="Alertar apenas avisa na Saúde da obra. Bloquear impede a aprovação de orçamento e de change orders."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Radio
                id="margin-enforcement-alert"
                name="marginEnforcement"
                label="Apenas alertar"
                checked={marginForm.enforcementMode === "ALERT"}
                onChange={() => setMarginForm((p) => ({ ...p, enforcementMode: "ALERT" }))}
              />
              <Radio
                id="margin-enforcement-block"
                name="marginEnforcement"
                label="Bloquear aprovação"
                checked={marginForm.enforcementMode === "BLOCK"}
                onChange={() => setMarginForm((p) => ({ ...p, enforcementMode: "BLOCK" }))}
              />
            </div>
          </FormField>

          <Button onClick={handleSaveMargin} loading={marginSaving} disabled={!marginValid}>
            <Icon name="check" size={16} /> Publicar margem mínima
          </Button>
        </Card>
        </>
      )}
    </AppShell>
  );
}
