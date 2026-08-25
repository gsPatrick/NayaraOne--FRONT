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
import { MAINTENANCE_CASES, PROJECTS } from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import styles from "./page.module.css";

export default function NovoChamadoPosObraPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    projectId: "",
    description: "",
    responsibleUserId: "",
    warrantyDeadlineAt: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const isValid = form.propertyId && form.description.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newCase = {
        id: `maint-${Date.now()}`,
        groupId: "group-1",
        companyId: "company-1",
        propertyId: form.propertyId,
        projectId: form.projectId || null,
        openedByPersonId: null,
        responsibleUserId: form.responsibleUserId || null,
        description: form.description.trim(),
        status: "OPEN",
        warrantyDeadlineAt: form.warrantyDeadlineAt || null,
        createdAt: new Date().toISOString(),
      };
      MAINTENANCE_CASES.push(newCase);
      router.push(`/painel/obras/pos-obra/${newCase.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar chamado.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Novo chamado de pós-obra" backHref="/painel/obras/pos-obra">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title="Dados do chamado">
          <div className={styles.formGrid}>
            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Selecione...</option>
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Obra de origem" htmlFor="f-project" helper="Opcional">
              <Select id="f-project" value={form.projectId} onChange={update("projectId")}>
                <option value="">Nenhuma</option>
                {PROJECTS.map((p) => (
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

            <FormField label="Prazo de garantia" htmlFor="f-warranty" helper="Opcional">
              <Input id="f-warranty" type="date" value={form.warrantyDeadlineAt} onChange={update("warrantyDeadlineAt")} />
            </FormField>

            <div className={styles.span2}>
              <FormField label="Descrição" htmlFor="f-description" required>
                <textarea
                  id="f-description"
                  className={styles.textarea}
                  rows={4}
                  value={form.description}
                  onChange={update("description")}
                  placeholder="Descreva o problema relatado..."
                />
              </FormField>
            </div>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/pos-obra")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar chamado</Button>
        </div>
      </div>
    </AppShell>
  );
}
