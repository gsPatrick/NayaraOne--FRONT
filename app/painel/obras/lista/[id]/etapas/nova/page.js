"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { PROJECTS, PROJECT_STAGES, stagesOf } from "@/lib/mock/construction";
import styles from "./page.module.css";

export default function NovaEtapaPage({ params }) {
  const router = useRouter();
  const project = PROJECTS.find((p) => p.id === params.id);
  const existingStages = project ? stagesOf(project.id) : [];
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sequence: String(existingStages.length + 1),
    plannedPct: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (!project) {
    return (
      <AppShell title="Nova etapa" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const isValid = form.name.trim().length > 0 && form.sequence !== "";

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newStage = {
        id: `stage-${Date.now()}`,
        groupId: project.groupId,
        companyId: project.companyId,
        projectId: project.id,
        name: form.name.trim(),
        sequence: Number(form.sequence),
        plannedPct: form.plannedPct ? Number(form.plannedPct) : 0,
        measuredPct: null,
        status: "PENDING",
        startsAt: null,
        endsAt: null,
      };
      PROJECT_STAGES.push(newStage);
      router.push(`/painel/obras/lista/${project.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar etapa.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova etapa" backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title={`Nova etapa — ${project.name}`}>
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <FormField label="Nome da etapa" htmlFor="f-name" required>
                <Input id="f-name" value={form.name} onChange={update("name")} placeholder="Ex: Fundação e estrutura" />
              </FormField>
            </div>
            <FormField label="Sequência" htmlFor="f-sequence" required>
              <Input id="f-sequence" type="number" min="1" value={form.sequence} onChange={update("sequence")} />
            </FormField>
            <FormField label="Percentual planejado (%)" htmlFor="f-planned" helper="Opcional">
              <Input id="f-planned" type="number" min="0" max="100" value={form.plannedPct} onChange={update("plannedPct")} />
            </FormField>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push(`/painel/obras/lista/${project.id}`)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar etapa</Button>
        </div>
      </div>
    </AppShell>
  );
}
