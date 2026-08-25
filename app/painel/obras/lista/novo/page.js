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
import { PROJECTS } from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import styles from "./page.module.css";

export default function NovaObraPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({
    name: "",
    propertyId: "",
    responsibleUserId: "",
    budgetAmount: "",
    startsAt: "",
    endsAtPlanned: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const isValid = form.name.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newProject = {
        id: `project-${Date.now()}`,
        groupId: "group-1",
        companyId: "company-1",
        propertyId: form.propertyId || null,
        name: form.name.trim(),
        responsibleUserId: form.responsibleUserId || null,
        budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : null,
        startsAt: form.startsAt || null,
        endsAtPlanned: form.endsAtPlanned || null,
        status: "PLANNED",
        lockVersion: 0,
        createdAt: new Date().toISOString(),
      };
      PROJECTS.push(newProject);
      router.push(`/painel/obras/lista/${newProject.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar obra.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova obra" backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title="Dados da obra">
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <FormField label="Nome da obra" htmlFor="f-name" required>
                <Input id="f-name" value={form.name} onChange={update("name")} placeholder="Ex: Edifício Aurora — Reforma estrutural" />
              </FormField>
            </div>

            <FormField label="Imóvel vinculado" htmlFor="f-property" helper="Opcional">
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Nenhum</option>
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Responsável" htmlFor="f-responsible" helper="Opcional">
              <Select id="f-responsible" value={form.responsibleUserId} onChange={update("responsibleUserId")}>
                <option value="">Nenhum</option>
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Orçamento (R$)" htmlFor="f-budget" helper="Opcional">
              <Input id="f-budget" type="number" min="0" step="0.01" value={form.budgetAmount} onChange={update("budgetAmount")} placeholder="0,00" />
            </FormField>

            <FormField label="Data de início" htmlFor="f-starts" helper="Opcional">
              <Input id="f-starts" type="date" value={form.startsAt} onChange={update("startsAt")} />
            </FormField>

            <FormField label="Previsão de término" htmlFor="f-ends" helper="Opcional">
              <Input id="f-ends" type="date" value={form.endsAtPlanned} onChange={update("endsAtPlanned")} />
            </FormField>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar obra</Button>
        </div>
      </div>
    </AppShell>
  );
}
