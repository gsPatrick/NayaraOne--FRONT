"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
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
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE } from "@/lib/mock/construction";
import {
  getMaintenanceCase,
  updateMaintenanceCase,
  removeMaintenanceCase,
  listMaintenanceCases,
  getProject,
} from "@/lib/api/construction";
import { getProperty } from "@/lib/api/properties";
import { getPerson } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_STEPS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const NEXT_STATUS_OPTIONS = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const CONTACT_TYPE_LABELS = { PHONE: "Telefone", WHATSAPP: "WhatsApp", EMAIL: "E-mail" };
const CONTACT_TYPE_ICON = { PHONE: "phone", WHATSAPP: "phone", EMAIL: "mail" };

function buildContactHref(contact) {
  if (contact.type === "WHATSAPP") return `https://wa.me/${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "PHONE") return `tel:${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "EMAIL") return `mailto:${contact.value}`;
  return null;
}

function warrantyInfo(deadline) {
  if (!deadline) return null;
  const diffDays = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { tone: "danger", label: "Garantia vencida" };
  if (diffDays <= 30) return { tone: "warning", label: `Garantia vence em ${diffDays} dia${diffDays === 1 ? "" : "s"}` };
  return { tone: "success", label: `Garantia válida até ${formatDate(deadline)}` };
}

export default function PosObraDetalhePage({ params }) {
  const router = useRouter();
  const [maintenanceCase, setMaintenanceCase] = useState(null);
  const [property, setProperty] = useState(null);
  const [project, setProject] = useState(null);
  const [openedByPerson, setOpenedByPerson] = useState(null);
  const [users, setUsers] = useState([]);
  const [relatedCases, setRelatedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ description: "", responsibleUserId: "", warrantyDeadlineAt: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getMaintenanceCase(params.id)
      .catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      })
      .then((c) => {
        if (cancelled || !c) return;
        setMaintenanceCase(c);
        return Promise.all([
          apiFetch("/users"),
          c.propertyId ? getProperty(c.propertyId).catch(() => null) : Promise.resolve(null),
          c.projectId ? getProject(c.projectId).catch(() => null) : Promise.resolve(null),
          c.openedByPersonId ? getPerson(c.openedByPersonId).catch(() => null) : Promise.resolve(null),
          c.propertyId ? listMaintenanceCases({ propertyId: c.propertyId }).catch(() => []) : Promise.resolve([]),
        ]).then(([u, prop, proj, person, related]) => {
          if (cancelled) return;
          setUsers(u || []);
          setProperty(prop);
          setProject(proj);
          setOpenedByPerson(person);
          setRelatedCases((related || []).filter((r) => r.id !== c.id));
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o chamado.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Chamado" backHref="/painel/obras/pos-obra">
        <SkeletonDetail sections={3} />
      </AppShell>
    );
  }

  if (loadError && !maintenanceCase) {
    return (
      <AppShell title="Chamado" backHref="/painel/obras/pos-obra">
        <Alert tone="danger" title="Não foi possível carregar o chamado">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!maintenanceCase) {
    return (
      <AppShell title="Chamado" backHref="/painel/obras/pos-obra">
        <Alert tone="danger" title="Chamado não encontrado">Não existe nenhum chamado com este identificador.</Alert>
      </AppShell>
    );
  }

  const responsible = maintenanceCase.responsibleUserId ? users.find((u) => u.id === maintenanceCase.responsibleUserId) : null;
  const nextOptions = NEXT_STATUS_OPTIONS[maintenanceCase.status] || [];
  const currentStepIndex = STATUS_STEPS.indexOf(maintenanceCase.status);
  const warranty = warrantyInfo(maintenanceCase.warrantyDeadlineAt);

  async function handleStatusChange(e) {
    const value = e.target.value;
    if (!value) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await updateMaintenanceCase(maintenanceCase.id, { status: value });
      setMaintenanceCase(updated);
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o status do chamado.");
    } finally {
      setBusy(false);
    }
  }

  function openEditModal() {
    setEditForm({
      description: maintenanceCase.description,
      responsibleUserId: maintenanceCase.responsibleUserId || "",
      warrantyDeadlineAt: maintenanceCase.warrantyDeadlineAt ? maintenanceCase.warrantyDeadlineAt.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm.description.trim()) return;
    setSavingEdit(true);
    setActionError("");
    try {
      const updated = await updateMaintenanceCase(maintenanceCase.id, {
        description: editForm.description.trim(),
        responsibleUserId: editForm.responsibleUserId || null,
        warrantyDeadlineAt: editForm.warrantyDeadlineAt ? new Date(editForm.warrantyDeadlineAt).toISOString() : null,
      });
      setMaintenanceCase(updated);
      setEditOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError("");
    try {
      await removeMaintenanceCase(maintenanceCase.id);
      router.push("/painel/obras/pos-obra");
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o chamado.");
      setBusy(false);
    }
  }

  return (
    <AppShell title="Chamado de pós-obra" backHref="/painel/obras/pos-obra">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={MAINTENANCE_STATUS_TONE[maintenanceCase.status]}>{MAINTENANCE_STATUS_LABELS[maintenanceCase.status]}</Badge>
            {warranty ? <Badge tone={warranty.tone}>{warranty.label}</Badge> : null}
          </div>
          <div className={styles.actions}>
            {nextOptions.length > 0 ? (
              <div className={styles.statusUpdate}>
                <Select value="" onChange={handleStatusChange} aria-label="Atualizar status" disabled={busy}>
                  <option value="">Atualizar status...</option>
                  {nextOptions.map((s) => (
                    <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </div>
            ) : null}
            <Button variant="secondary" onClick={openEditModal}>
              <Icon name="pencil" size={16} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
        </div>

        <Card title="Progresso do chamado">
          <div className={styles.stepper}>
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className={styles.stepperItem}>
                <span
                  className={[
                    styles.stepperDot,
                    i < currentStepIndex ? styles.stepperDotDone : "",
                    i === currentStepIndex ? styles.stepperDotCurrent : "",
                  ].filter(Boolean).join(" ")}
                >
                  {i < currentStepIndex ? <Icon name="check" size={12} /> : i + 1}
                </span>
                <span className={[styles.stepperLabel, i === currentStepIndex ? styles.stepperLabelCurrent : ""].filter(Boolean).join(" ")}>
                  {MAINTENANCE_STATUS_LABELS[step]}
                </span>
                {i < STATUS_STEPS.length - 1 ? (
                  <span className={[styles.stepperLine, i < currentStepIndex ? styles.stepperLineDone : ""].filter(Boolean).join(" ")} />
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Descrição">
          <p className={styles.description}>{maintenanceCase.description}</p>
        </Card>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
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
                  <p className={styles.infoValue}>{formatDateTime(maintenanceCase.createdAt || maintenanceCase.created_at)}</p>
                </div>
              </div>
            </Card>

            <Card title="Outros chamados neste imóvel" subtitle={property ? property.name : undefined}>
              {relatedCases.length === 0 ? (
                <EmptyState icon="key" title="Sem outros chamados" description="Nenhum outro chamado de pós-obra registrado para este imóvel." />
              ) : (
                <div className={styles.relatedList}>
                  {relatedCases.map((c) => (
                    <a key={c.id} href={`/painel/obras/pos-obra/${c.id}`} className={styles.relatedRow}>
                      <div className={styles.relatedInfo}>
                        <span className={styles.relatedTitle}>{c.description}</span>
                        <span className={styles.relatedSubtitle}>Aberto em {formatDate(c.createdAt || c.created_at)}</span>
                      </div>
                      <Badge tone={MAINTENANCE_STATUS_TONE[c.status]}>{MAINTENANCE_STATUS_LABELS[c.status]}</Badge>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Contato de quem abriu">
              {!openedByPerson ? (
                <EmptyState icon="users" title="Aberto pela equipe interna" description="Este chamado foi registrado internamente, sem um contato de cliente vinculado." />
              ) : openedByPerson.contacts?.length ? (
                <div className={styles.contactList}>
                  {openedByPerson.contacts.map((contact) => {
                    const href = buildContactHref(contact);
                    const row = (
                      <>
                        <span className={styles.contactLeft}>
                          <Icon name={CONTACT_TYPE_ICON[contact.type] || "phone"} size={14} />
                          <span>{CONTACT_TYPE_LABELS[contact.type] || contact.type}: {contact.value}</span>
                        </span>
                        {contact.primary ? <span className={styles.contactPrimary}>Principal</span> : null}
                      </>
                    );
                    return href ? (
                      <a key={`${contact.type}-${contact.value}`} href={href} target={contact.type === "WHATSAPP" ? "_blank" : undefined} rel="noopener noreferrer" className={[styles.contactRow, styles.contactRowLink].join(" ")}>
                        {row}
                      </a>
                    ) : (
                      <div key={`${contact.type}-${contact.value}`} className={styles.contactRow}>
                        {row}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon="phone" title="Sem contato cadastrado" description="Este contato ainda não tem telefone ou e-mail cadastrado." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar chamado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} loading={savingEdit} disabled={!editForm.description.trim()}>Salvar alterações</Button>
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
              {users.map((u) => (
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
            <Button variant="danger" onClick={handleDelete} loading={busy}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
