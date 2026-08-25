"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { PROJECTS, BUDGET_LINES } from "@/lib/mock/construction";
import styles from "./page.module.css";

export default function NovaLinhaOrcamentoPage({ params }) {
  const router = useRouter();
  const project = PROJECTS.find((p) => p.id === params.id);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "",
    description: "",
    plannedAmount: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (!project) {
    return (
      <AppShell title="Nova linha de orçamento" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const isValid = form.category.trim().length > 0 && form.plannedAmount !== "" && Number(form.plannedAmount) >= 0;

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newLine = {
        id: `budget-${Date.now()}`,
        groupId: project.groupId,
        companyId: project.companyId,
        projectId: project.id,
        costCenterId: null,
        category: form.category.trim(),
        description: form.description.trim() || null,
        plannedAmount: Number(form.plannedAmount),
        actualAmount: null,
      };
      BUDGET_LINES.push(newLine);
      router.push(`/painel/obras/lista/${project.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar linha de orçamento.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova linha de orçamento" backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title={`Nova linha de orçamento — ${project.name}`}>
          <div className={styles.formGrid}>
            <FormField label="Categoria" htmlFor="f-category" required>
              <Input id="f-category" value={form.category} onChange={update("category")} placeholder="Ex: Fundação e estrutura" />
            </FormField>
            <FormField label="Valor planejado (R$)" htmlFor="f-planned" required>
              <Input id="f-planned" type="number" min="0" step="0.01" value={form.plannedAmount} onChange={update("plannedAmount")} placeholder="0,00" />
            </FormField>
            <div className={styles.span2}>
              <FormField label="Descrição" htmlFor="f-description" helper="Opcional">
                <Input id="f-description" value={form.description} onChange={update("description")} placeholder="Detalhes da linha de orçamento" />
              </FormField>
            </div>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push(`/painel/obras/lista/${project.id}`)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar linha de orçamento</Button>
        </div>
      </div>
    </AppShell>
  );
}
