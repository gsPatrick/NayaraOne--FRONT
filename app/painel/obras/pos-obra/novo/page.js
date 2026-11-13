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
import { createMaintenanceCase, listProjects } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { listConstructionMembers } from "@/lib/api/constructionConfig";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import { MAINTENANCE_CATEGORY_LABELS, MAINTENANCE_SEVERITY_LABELS } from "@/lib/mock/construction";
import styles from "./page.module.css";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";

export default function NovoChamadoPosObraPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    projectId: "",
    description: "",
    openedByPersonId: "",
    responsibleUserId: "",
    warrantyDeadlineAt: "",
    category: "",
    severity: "MEDIUM",
  });

  // M9-D850: carregamento, erro, 403 e offline dos dados do formulário vêm do padrão único de estados.
  // Filtra apenas usuários ACTIVE no seletor de responsável.
  const formQuery = useAsyncState(
    async () => {
      const [properties, projects, people, users] = await Promise.all([listProperties(), listProjects(), listPeople(), listConstructionMembers()]);
      return { properties: properties || [], projects: projects || [], people: people || [], users: users || [] };
    },
    { key: "obras-pos-obra-novo", isEmpty: () => false }
  );
  const { properties = [], projects = [], people = [], users = [] } = formQuery.data || {};

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const [warrantyDateInvalid, setWarrantyDateInvalid] = useState(false);
  const isValid = form.propertyId && form.description.trim().length > 0 && !warrantyDateInvalid;

  async function handleSubmit() {
    // BUG REAL CORRIGIDO (auditoria Marco 6, Ciclo 9): duplo-clique nativo disparava o handler
    // 2x antes do React re-renderizar o `disabled` do botão, criando 2 chamados de pós-obra
    // duplicados — createMaintenanceCase é um INSERT simples, sem checagem de duplicidade no
    // backend. Guarda de reentrância explícita (mesmo padrão já aplicado em obras/lista/novo).
    if (submitting) return;
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newCase = await createMaintenanceCase({
        propertyId: form.propertyId,
        projectId: form.projectId || undefined,
        openedByPersonId: form.openedByPersonId || undefined,
        responsibleUserId: form.responsibleUserId || undefined,
        description: form.description.trim(),
        warrantyDeadlineAt: dateOnlyInputToIso(form.warrantyDeadlineAt),
        category: form.category || undefined,
        severity: form.severity || undefined,
      });
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

        <AsyncState result={formQuery}>
          {() => (
        <Card title="Dados do chamado">
          <div className={styles.formGrid}>
            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Selecione...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Obra de origem" htmlFor="f-project" helper="Opcional">
              <Select id="f-project" value={form.projectId} onChange={update("projectId")}>
                <option value="">Nenhuma</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Aberto por" htmlFor="f-opened-by" helper="Opcional">
              <Select id="f-opened-by" value={form.openedByPersonId} onChange={update("openedByPersonId")}>
                <option value="">Equipe interna</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Responsável" htmlFor="f-responsible" helper="Opcional">
              <Select id="f-responsible" value={form.responsibleUserId} onChange={update("responsibleUserId")}>
                <option value="">Nenhum</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Categoria" htmlFor="f-category" helper="Opcional">
              <Select id="f-category" value={form.category} onChange={update("category")}>
                <option value="">Não classificada</option>
                {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Severidade" htmlFor="f-severity" required>
              <Select id="f-severity" value={form.severity} onChange={update("severity")}>
                {Object.entries(MAINTENANCE_SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Prazo de garantia"
              htmlFor="f-warranty"
              helper={warrantyDateInvalid ? undefined : "Opcional"}
              error={warrantyDateInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-warranty"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={warrantyDateInvalid}
                value={form.warrantyDeadlineAt}
                onChange={(e) => {
                  setWarrantyDateInvalid(isDateInputInvalid(e.target.validity));
                  update("warrantyDeadlineAt")(e);
                }}
                onBlur={(e) => setWarrantyDateInvalid(isDateInputInvalid(e.target.validity))}
              />
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
          )}
        </AsyncState>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/pos-obra")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid || !formQuery.data}>Criar chamado</Button>
        </div>
      </div>
    </AppShell>
  );
}
