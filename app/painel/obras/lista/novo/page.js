"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { createProject } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import styles from "./page.module.css";

export default function NovaObraPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    propertyId: "",
    responsibleUserId: "",
    budgetAmount: "",
    startsAt: "",
    endsAtPlanned: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), apiFetch("/users")])
      .then(([props, u]) => {
        if (cancelled) return;
        setProperties(props || []);
        setUsers(u || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os dados do formulário.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const isValid = form.name.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newProject = await createProject({
        propertyId: form.propertyId || undefined,
        name: form.name.trim(),
        responsibleUserId: form.responsibleUserId || undefined,
        budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAtPlanned: form.endsAtPlanned ? new Date(form.endsAtPlanned).toISOString() : undefined,
      });
      router.push(`/painel/obras/lista/${newProject.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar obra.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova obra" backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger" title="Não foi possível carregar os dados do formulário">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        {loading ? (
          <SkeletonDetail sections={1} />
        ) : (
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
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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
        )}

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid || loading}>Criar obra</Button>
        </div>
      </div>
    </AppShell>
  );
}
