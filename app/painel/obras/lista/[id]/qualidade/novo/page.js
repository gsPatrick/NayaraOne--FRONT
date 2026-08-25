"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { PROJECTS, QUALITY_CHECKLIST_ITEMS, stagesOf } from "@/lib/mock/construction";
import styles from "./page.module.css";

export default function NovoItemQualidadePage({ params }) {
  const router = useRouter();
  const project = PROJECTS.find((p) => p.id === params.id);
  const stages = project ? stagesOf(project.id) : [];
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    item: "",
    projectStageId: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (!project) {
    return (
      <AppShell title="Novo item de checklist" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const isValid = form.item.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newItem = {
        id: `qc-${Date.now()}`,
        groupId: project.groupId,
        companyId: project.companyId,
        projectId: project.id,
        projectStageId: form.projectStageId || null,
        item: form.item.trim(),
        status: "PENDING",
        checkedByUserId: null,
        checkedAt: null,
        notes: null,
      };
      QUALITY_CHECKLIST_ITEMS.push(newItem);
      router.push(`/painel/obras/lista/${project.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar item de checklist.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Novo item de checklist" backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title={`Novo item de checklist — ${project.name}`}>
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <FormField label="Descrição do item" htmlFor="f-item" required>
                <Input id="f-item" value={form.item} onChange={update("item")} placeholder="Ex: Verificar prumo e nível da fundação" />
              </FormField>
            </div>
            <FormField label="Etapa vinculada" htmlFor="f-stage" helper="Opcional">
              <Select id="f-stage" value={form.projectStageId} onChange={update("projectStageId")}>
                <option value="">Obra toda</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>
                ))}
              </Select>
            </FormField>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push(`/painel/obras/lista/${project.id}`)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar item</Button>
        </div>
      </div>
    </AppShell>
  );
}
