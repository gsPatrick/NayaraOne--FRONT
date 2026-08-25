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
import { createMaintenanceCase, listProjects } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import styles from "./page.module.css";

export default function NovoChamadoPosObraPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    propertyId: "",
    projectId: "",
    description: "",
    openedByPersonId: "",
    responsibleUserId: "",
    warrantyDeadlineAt: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), listProjects(), listPeople(), apiFetch("/users")])
      .then(([props, proj, pp, u]) => {
        if (cancelled) return;
        setProperties(props || []);
        setProjects(proj || []);
        setPeople(pp || []);
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

  const isValid = form.propertyId && form.description.trim().length > 0;

  async function handleSubmit() {
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
        warrantyDeadlineAt: form.warrantyDeadlineAt ? new Date(form.warrantyDeadlineAt).toISOString() : undefined,
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
        {loadError ? <Alert tone="danger" title="Não foi possível carregar os dados do formulário">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        {loading ? (
          <SkeletonDetail sections={1} />
        ) : (
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
        )}

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/pos-obra")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid || loading}>Criar chamado</Button>
        </div>
      </div>
    </AppShell>
  );
}
