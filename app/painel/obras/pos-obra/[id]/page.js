"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
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
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ description: "", responsibleUserId: "", warrantyDeadlineAt: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  function openEditModal() {
    setEditForm({
      description: maintenanceCase.description,
      responsibleUserId: maintenanceCase.responsibleUserId || "",
      warrantyDeadlineAt: maintenanceCase.warrantyDeadlineAt ? maintenanceCase.warrantyDeadlineAt.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  function handleSaveEdit() {
    if (!editForm.description.trim()) return;
    maintenanceCase.description = editForm.description.trim();
    maintenanceCase.responsibleUserId = editForm.responsibleUserId || null;
    maintenanceCase.warrantyDeadlineAt = editForm.warrantyDeadlineAt || null;
    setEditOpen(false);
    rerender();
  }

  function handleDelete() {
    const idx = MAINTENANCE_CASES.findIndex((c) => c.id === maintenanceCase.id);
    if (idx >= 0) MAINTENANCE_CASES.splice(idx, 1);
    router.push("/painel/obras/pos-obra");
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
          <div className={styles.actions}>
            <Button variant="secondary" onClick={openEditModal}>
              <Icon name="pencil" size={16} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
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

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar chamado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.description.trim()}>Salvar alterações</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="e-description" required>
              <textarea
                id="e-description"
                className={styles.textarea}
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Responsável" htmlFor="e-responsible" helper="Opcional">
            <Select id="e-responsible" value={editForm.responsibleUserId} onChange={(e) => setEditForm((p) => ({ ...p, responsibleUserId: e.target.value }))}>
              <option value="">Sem responsável</option>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Prazo de garantia" htmlFor="e-warranty" helper="Opcional">
            <Input id="e-warranty" type="date" value={editForm.warrantyDeadlineAt} onChange={(e) => setEditForm((p) => ({ ...p, warrantyDeadlineAt: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir chamado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
