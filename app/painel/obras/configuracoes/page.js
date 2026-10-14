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
import { getActiveSlaRule, createSlaRule } from "@/lib/api/construction";
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

  function load() {
    setLoading(true);
    setLoadError("");
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
        <SkeletonDetail sections={1} />
      ) : (
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
      )}
    </AppShell>
  );
}
