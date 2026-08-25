"use client";

import { useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import { MAINTENANCE_CASES, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE, PROJECTS } from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { PEOPLE } from "@/lib/mock/people";
import { USERS } from "@/lib/mock/users";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const NEXT_STATUS_OPTIONS = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export default function PosObraDetalhePage({ params }) {
  const [, forceUpdate] = useState(0);
  const maintenanceCase = MAINTENANCE_CASES.find((c) => c.id === params.id);

  if (!maintenanceCase) {
    return (
      <AppShell title="Chamado" backHref="/painel/obras/pos-obra">
        <Alert tone="danger" title="Chamado não encontrado">Não existe nenhum chamado com este identificador.</Alert>
      </AppShell>
    );
  }

  const property = PROPERTIES.find((p) => p.id === maintenanceCase.propertyId) || null;
  const project = maintenanceCase.projectId ? PROJECTS.find((p) => p.id === maintenanceCase.projectId) : null;
  const openedByPerson = maintenanceCase.openedByPersonId ? PEOPLE.find((p) => p.id === maintenanceCase.openedByPersonId) : null;
  const responsible = maintenanceCase.responsibleUserId ? USERS.find((u) => u.id === maintenanceCase.responsibleUserId) : null;

  const nextOptions = NEXT_STATUS_OPTIONS[maintenanceCase.status] || [];

  function rerender() {
    forceUpdate((n) => n + 1);
  }

  function handleStatusChange(e) {
    const value = e.target.value;
    if (!value) return;
    maintenanceCase.status = value;
    rerender();
  }

  return (
    <AppShell title="Chamado de pós-obra" backHref="/painel/obras/pos-obra">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <Badge tone={MAINTENANCE_STATUS_TONE[maintenanceCase.status]}>{MAINTENANCE_STATUS_LABELS[maintenanceCase.status]}</Badge>
          {nextOptions.length > 0 ? (
            <div className={styles.statusUpdate}>
              <Select value="" onChange={handleStatusChange} aria-label="Atualizar status">
                <option value="">Atualizar status...</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        <Card title="Descrição">
          <p className={styles.description}>{maintenanceCase.description}</p>
        </Card>

        <Card title="Informações">
          <div className={styles.infoGrid}>
            <div>
              <p className={styles.infoLabel}>Imóvel</p>
              <p className={styles.infoValue}>
                {property ? <a href={`/painel/imoveis/${property.id}`} className={styles.infoLink}>{property.name}</a> : "—"}
              </p>
            </div>
            <div>
              <p className={styles.infoLabel}>Obra de origem</p>
              <p className={styles.infoValue}>
                {project ? <a href={`/painel/obras/lista/${project.id}`} className={styles.infoLink}>{project.name}</a> : "—"}
              </p>
            </div>
            <div>
              <p className={styles.infoLabel}>Aberto por</p>
              <p className={styles.infoValue}>{openedByPerson?.legalName || "Equipe interna"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Responsável</p>
              <p className={styles.infoValue}>{responsible?.name || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Prazo de garantia</p>
              <p className={styles.infoValue}>{formatDate(maintenanceCase.warrantyDeadlineAt)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Aberto em</p>
              <p className={styles.infoValue}>{formatDate(maintenanceCase.createdAt)}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
