"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Icon from "@/components/atoms/Icon/Icon";
import StatTile from "@/components/molecules/StatTile/StatTile";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import CrmNavMenu from "@/components/molecules/CrmNavMenu/CrmNavMenu";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import {
  listFeedbackCases,
  createFeedbackCase,
  resolveFeedbackCase,
  escalateFeedbackCase,
  FEEDBACK_TYPES,
  FEEDBACK_SEVERITIES,
  FEEDBACK_STATUSES,
} from "@/lib/api/crm";
import { formatDateTime, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

const TYPE_LABELS = { COMPLAINT: "Reclamação", COMPLIMENT: "Elogio", CONFLICT: "Conflito" };
const SEVERITY_LABELS = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
const SEVERITY_TONE = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" };
const STATUS_LABELS = { OPEN: "Aberto", IN_PROGRESS: "Em andamento", RESOLVED: "Resolvido", ESCALATED: "Escalonado" };
const STATUS_TONE = { OPEN: "info", IN_PROGRESS: "warning", RESOLVED: "success", ESCALATED: "danger" };
const OPEN_LIKE = ["OPEN", "IN_PROGRESS"];

export default function FeedbackPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [escalatingId, setEscalatingId] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    return listFeedbackCases()
      .then(setCases)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        if (statusFilter && c.status !== statusFilter) return false;
        if (typeFilter && c.type !== typeFilter) return false;
        return true;
      }),
    [cases, statusFilter, typeFilter]
  );

  const overdueCount = cases.filter((c) => OPEN_LIKE.includes(c.status) && isOverdue(c.slaDueAt)).length;

  async function handleCreate(payload) {
    setActionError("");
    try {
      const created = await createFeedbackCase(payload);
      setCases((prev) => [created, ...prev]);
      setCreateOpen(false);
      return true;
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o caso.");
      return false;
    }
  }

  async function handleResolve(id, resolutionNotes) {
    setActionError("");
    try {
      const updated = await resolveFeedbackCase(id, { resolutionNotes });
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setResolveTarget(null);
      return true;
    } catch (err) {
      setActionError(err?.message || "Não foi possível resolver o caso.");
      return false;
    }
  }

  async function handleEscalate(id) {
    setActionError("");
    setEscalatingId(id);
    try {
      const updated = await escalateFeedbackCase(id);
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setActionError(err?.message || "Não foi possível escalonar o caso.");
    } finally {
      setEscalatingId(null);
    }
  }

  return (
    <AppShell title="Feedback & Reclamações">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Casos no total" value={cases.length} tone="neutral" icon="mail" />
        <StatTile label="Abertos" value={cases.filter((c) => OPEN_LIKE.includes(c.status)).length} tone="info" icon="clock" />
        <StatTile label="SLA vencido" value={overdueCount} tone="danger" icon="ban" />
        <StatTile label="Escalonados" value={cases.filter((c) => c.status === "ESCALATED").length} tone="warning" icon="bell" />
      </div>

      <Card title="Casos de reclamação, elogio e conflito" subtitle="SLA calculado na criação por severidade (alta 24h · média 72h · baixa 7 dias)">
        <div className={styles.toolbar}>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.filter}>
            <option value="">Todos os tipos</option>
            {FEEDBACK_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filter}>
            <option value="">Todos os status</option>
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>

        <Table
          rows={filtered}
          loading={loading}
          emptyMessage="Nenhum caso encontrado."
          columns={[
            { key: "type", label: "Tipo", render: (r) => TYPE_LABELS[r.type] || r.type },
            { key: "description", label: "Descrição", render: (r) => <span className={styles.descCell}>{r.description}</span> },
            { key: "severity", label: "Severidade", render: (r) => <Badge tone={SEVERITY_TONE[r.severity] || "neutral"}>{SEVERITY_LABELS[r.severity] || r.severity}</Badge> },
            { key: "status", label: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] || "neutral"}>{STATUS_LABELS[r.status] || r.status}</Badge> },
            {
              key: "sla",
              label: "SLA",
              render: (r) => (
                <span className={OPEN_LIKE.includes(r.status) && isOverdue(r.slaDueAt) ? styles.overdue : undefined}>
                  {formatDateTime(r.slaDueAt)}
                  {OPEN_LIKE.includes(r.status) && isOverdue(r.slaDueAt) ? " · vencido" : ""}
                </span>
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                OPEN_LIKE.includes(r.status) ? (
                  <div className={styles.rowActions}>
                    <Button size="sm" variant="secondary" onClick={() => setResolveTarget(r)}>Resolver</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEscalate(r.id)} loading={escalatingId === r.id}>
                      Escalonar
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
      </Card>

      <StickyActionBar>
        <CrmNavMenu />
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Novo caso
        </Button>
      </StickyActionBar>

      <CreateFeedbackModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <ResolveModal feedbackCase={resolveTarget} onClose={() => setResolveTarget(null)} onConfirm={handleResolve} />
    </AppShell>
  );
}

function CreateFeedbackModal({ open, onClose, onCreate }) {
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [type, setType] = useState("COMPLAINT");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPersonName("");
      setPersonId(null);
      setType("COMPLAINT");
      setSeverity("MEDIUM");
      setDescription("");
      setErrors({});
    }
  }, [open]);

  function reset() {
    setPersonName("");
    setPersonId(null);
    setType("COMPLAINT");
    setSeverity("MEDIUM");
    setDescription("");
    setErrors({});
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const nextErrors = {};
    if (!personId) nextErrors.personName = "Selecione a pessoa envolvida.";
    if (!description.trim()) nextErrors.description = "Descreva o caso.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const ok = await onCreate({ personId, type, severity, description: description.trim() });
    if (ok) reset();
    else setSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo caso"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Registrar caso</Button>
        </>
      }
    >
      <FormField label="Pessoa envolvida" htmlFor="f-person" required error={errors.personName}>
        <PersonPicker
          id="f-person"
          value={personName}
          personId={personId}
          placeholder="Buscar contato pelo nome..."
          onSelect={({ name, personId: pid }) => {
            setPersonName(name);
            setPersonId(pid);
          }}
        />
      </FormField>
      <FormField label="Tipo" htmlFor="f-type">
        <Select id="f-type" value={type} onChange={(e) => setType(e.target.value)}>
          {FEEDBACK_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Severidade" htmlFor="f-severity" helper="Define o prazo de SLA: alta 24h, média 72h, baixa 7 dias.">
        <Select id="f-severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {FEEDBACK_SEVERITIES.map((s) => (
            <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Descrição" htmlFor="f-description" required error={errors.description}>
        <Input id="f-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o ocorrido..." />
      </FormField>
    </Modal>
  );
}

function ResolveModal({ feedbackCase, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNotes("");
    setSubmitting(false);
  }, [feedbackCase]);

  if (!feedbackCase) return null;

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm(feedbackCase.id, notes.trim() || undefined);
    setSubmitting(false);
  }

  return (
    <Modal
      open={Boolean(feedbackCase)}
      onClose={onClose}
      title="Resolver caso"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={submitting}>Confirmar resolução</Button>
        </>
      }
    >
      <p className={styles.descCell}>{feedbackCase.description}</p>
      <FormField label="Notas de resolução (opcional)" htmlFor="f-resolution-notes">
        <Input id="f-resolution-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="O que foi feito para resolver..." />
      </FormField>
    </Modal>
  );
}
