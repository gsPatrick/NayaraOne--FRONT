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
import { PROJECTS, DAILY_REPORTS } from "@/lib/mock/construction";
import styles from "./page.module.css";

const WEATHER_OPTIONS = ["Ensolarado", "Nublado", "Chuvoso", "Ventania"];

export default function NovoRdoPage({ params }) {
  const router = useRouter();
  const project = PROJECTS.find((p) => p.id === params.id);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    weather: WEATHER_OPTIONS[0],
    workforceCount: "",
    occurrences: "",
  });

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (!project) {
    return (
      <AppShell title="Novo RDO" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const isValid = form.reportDate && form.weather && form.workforceCount !== "";

  function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const newReport = {
        id: `rdo-${Date.now()}`,
        groupId: project.groupId,
        companyId: project.companyId,
        projectId: project.id,
        reportDate: form.reportDate,
        weather: form.weather,
        workforceCount: Number(form.workforceCount),
        occurrences: form.occurrences.trim() || null,
        reportedByUserId: "user-1",
      };
      DAILY_REPORTS.push(newReport);
      router.push(`/painel/obras/lista/${project.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao registrar RDO.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Novo RDO" backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Card title={`Novo RDO — ${project.name}`}>
          <div className={styles.formGrid}>
            <FormField label="Data" htmlFor="f-date" required>
              <Input id="f-date" type="date" value={form.reportDate} onChange={update("reportDate")} />
            </FormField>
            <FormField label="Clima" htmlFor="f-weather" required>
              <Select id="f-weather" value={form.weather} onChange={update("weather")}>
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Efetivo (nº de trabalhadores)" htmlFor="f-workforce" required>
              <Input id="f-workforce" type="number" min="0" value={form.workforceCount} onChange={update("workforceCount")} />
            </FormField>
            <div className={styles.span2}>
              <FormField label="Ocorrências" htmlFor="f-occurrences" helper="Opcional">
                <textarea
                  id="f-occurrences"
                  className={styles.textarea}
                  rows={3}
                  value={form.occurrences}
                  onChange={update("occurrences")}
                />
              </FormField>
            </div>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push(`/painel/obras/lista/${project.id}`)}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Registrar RDO</Button>
        </div>
      </div>
    </AppShell>
  );
}
