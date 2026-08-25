"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { PROJECTS, PROJECT_STAGES, STAGE_MEASUREMENTS } from "@/lib/mock/construction";
import styles from "./page.module.css";

export default function NovaMedicaoPage({ params }) {
  const router = useRouter();
  const project = PROJECTS.find((p) => p.id === params.id);
  const stage = PROJECT_STAGES.find((s) => s.id === params.stageId);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    measuredPct: "",
    measuredAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (!project || !stage) {
    return (
      <AppShell title="Registrar medição" backHref={project ? `/painel/obras/lista/${project.id}` : "/painel/obras/lista"}>
        <Alert tone="danger" title="Etapa não encontrada">Não existe nenhuma etapa com este identificador.</Alert>
      </AppShell>
    );
  }

  const isValid = form.measuredPct !== "" && Number(form.measuredPct) >= 0 && Number(form.measuredPct) <= 100 && form.measuredAt;

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newMeasurement = {
        id: `meas-${Date.now()}`,
        groupId: project.groupId,
        companyId: project.companyId,
        projectStageId: stage.id,
        measuredPct: Number(form.measuredPct),
        measuredAt: form.measuredAt,
        measuredByUserId: "user-1",
        notes: form.notes.trim() || null,
        status: "PENDING_APPROVAL",
        approvedByUserId: null,
        decidedAt: null,
        rejectionReason: null,
      };
      STAGE_MEASUREMENTS.push(newMeasurement);
      router.push(`/painel/obras/lista/${project.id}/etapas/${stage.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao registrar medição.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Registrar medição" backHref={`/painel/obras/lista/${project.id}/etapas/${stage.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title={`Registrar medição — ${stage.name}`}>
          <div className={styles.formGrid}>
            <FormField label="Percentual medido (%)" htmlFor="f-pct" required>
              <Input id="f-pct" type="number" min="0" max="100" value={form.measuredPct} onChange={update("measuredPct")} />
            </FormField>
            <FormField label="Data da medição" htmlFor="f-date" required>
              <Input id="f-date" type="date" value={form.measuredAt} onChange={update("measuredAt")} />
            </FormField>
            <div className={styles.span2}>
              <FormField label="Observações" htmlFor="f-notes" helper="Opcional">
                <textarea
                  id="f-notes"
                  className={styles.textarea}
                  rows={3}
                  value={form.notes}
                  onChange={update("notes")}
                />
              </FormField>
            </div>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push(`/painel/obras/lista/${project.id}/etapas/${stage.id}`)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Registrar medição</Button>
        </div>
      </div>
    </AppShell>
  );
}
