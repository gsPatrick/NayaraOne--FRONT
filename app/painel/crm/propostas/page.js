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
import {
  listProposals,
  createProposal,
  updateProposalStatus,
  PROPOSAL_STATUSES,
  PROPOSAL_ALLOWED_TRANSITIONS,
  listOpportunities,
} from "@/lib/api/crm";
import { listProperties } from "@/lib/api/properties";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  UNDER_NEGOTIATION: "Em negociação",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  EXPIRED: "Expirada",
};
const STATUS_TONE = {
  DRAFT: "neutral",
  SENT: "info",
  UNDER_NEGOTIATION: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
};

export default function PropostasPage() {
  const [proposals, setProposals] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    return Promise.all([listProposals(), listOpportunities(), listProperties()])
      .then(([p, o, props]) => {
        setProposals(p);
        setOpportunities(o);
        setProperties(props);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as propostas."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (statusFilter ? proposals.filter((p) => p.status === statusFilter) : proposals),
    [proposals, statusFilter]
  );

  const opportunityLabel = (id) => {
    const opp = opportunities.find((o) => o.id === id);
    return opp ? `#${String(opp.id).slice(0, 8)}` : "—";
  };
  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";

  async function handleCreate(payload) {
    setActionError("");
    try {
      const created = await createProposal(payload);
      setProposals((prev) => [created, ...prev]);
      setCreateOpen(false);
      return true;
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a proposta.");
      return false;
    }
  }

  async function handleStatusChange(id, status, notes) {
    setActionError("");
    try {
      const updated = await updateProposalStatus(id, { status, notes });
      setProposals((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setStatusTarget(null);
      return true;
    } catch (err) {
      setActionError(err?.message || "Não foi possível mudar o status da proposta.");
      return false;
    }
  }

  const totalAccepted = proposals.filter((p) => p.status === "ACCEPTED").reduce((s, p) => s + (p.value || 0), 0);

  return (
    <AppShell title="Propostas">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Total de propostas" value={proposals.length} tone="neutral" icon="signature" />
        <StatTile label="Enviadas" value={proposals.filter((p) => p.status === "SENT").length} tone="info" icon="mail" />
        <StatTile label="Aceitas" value={proposals.filter((p) => p.status === "ACCEPTED").length} tone="success" icon="check" />
        <StatTile label="Valor aceito" value={formatBRL(totalAccepted)} tone="success" icon="money" />
      </div>

      <Card title="Propostas por oportunidade" subtitle="Histórico append-only por versão — o valor de uma proposta nunca é sobrescrito">
        <div className={styles.toolbar}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filter}>
            <option value="">Todos os status</option>
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>

        <Table
          rows={filtered}
          loading={loading}
          emptyMessage="Nenhuma proposta encontrada."
          columns={[
            { key: "opportunity", label: "Oportunidade", render: (r) => opportunityLabel(r.opportunityId) },
            { key: "property", label: "Imóvel", render: (r) => propertyName(r.propertyId) },
            { key: "version", label: "Versão", render: (r) => `v${r.versionNumber}` },
            { key: "value", label: "Valor", render: (r) => formatBRL(r.value) },
            { key: "status", label: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] || "neutral"}>{STATUS_LABELS[r.status] || r.status}</Badge> },
            { key: "validUntil", label: "Válida até", render: (r) => (r.validUntil ? formatDate(r.validUntil) : "—") },
            { key: "createdAt", label: "Criada em", render: (r) => formatDateTime(r.createdAt) },
            {
              key: "actions",
              label: "",
              render: (r) =>
                (PROPOSAL_ALLOWED_TRANSITIONS[r.status] || []).length > 0 ? (
                  <Button size="sm" variant="secondary" onClick={() => setStatusTarget(r)}>
                    Mudar status
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <StickyActionBar>
        <CrmNavMenu />
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Nova proposta
        </Button>
      </StickyActionBar>

      <CreateProposalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        opportunities={opportunities}
        properties={properties}
      />
      <StatusModal
        proposal={statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
      />
    </AppShell>
  );
}

function CreateProposalModal({ open, onClose, onCreate, opportunities, properties }) {
  const [opportunityId, setOpportunityId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [value, setValue] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setOpportunityId(opportunities[0]?.id || "");
      setPropertyId("");
      setValue("");
      setValidUntil("");
      setNotes("");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setOpportunityId("");
    setPropertyId("");
    setValue("");
    setValidUntil("");
    setNotes("");
    setErrors({});
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const nextErrors = {};
    if (!opportunityId) nextErrors.opportunityId = "Selecione a oportunidade.";
    if (!value || Number(value) <= 0) nextErrors.value = "Informe um valor maior que zero.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const ok = await onCreate({
      opportunityId,
      propertyId: propertyId || undefined,
      value: Number(value),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
    if (ok) reset();
    else setSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nova proposta"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Criar proposta</Button>
        </>
      }
    >
      <FormField label="Oportunidade" htmlFor="p-opportunity" required error={errors.opportunityId}>
        <Select id="p-opportunity" value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
          <option value="">Selecionar…</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>{`#${String(o.id).slice(0, 8)} — ${o.stage}`}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Imóvel (opcional)" htmlFor="p-property">
        <Select id="p-property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Usar imóvel da oportunidade</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Valor (R$)" htmlFor="p-value" required error={errors.value}>
        <Input id="p-value" type="number" min="0.01" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
      </FormField>
      <FormField label="Válida até" htmlFor="p-valid-until">
        <Input id="p-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </FormField>
      <FormField label="Observações" htmlFor="p-notes">
        <Input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </Modal>
  );
}

function StatusModal({ proposal, onClose, onConfirm }) {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStatus("");
    setNotes("");
    setError("");
    setSubmitting(false);
  }, [proposal]);

  if (!proposal) return null;
  const options = PROPOSAL_ALLOWED_TRANSITIONS[proposal.status] || [];

  async function handleConfirm() {
    if (!status) {
      setError("Selecione o novo status.");
      return;
    }
    setSubmitting(true);
    const ok = await onConfirm(proposal.id, status, notes.trim() || undefined);
    setSubmitting(false);
    if (!ok) setError("Não foi possível confirmar a mudança de status.");
  }

  return (
    <Modal
      open={Boolean(proposal)}
      onClose={onClose}
      title={`Mudar status — proposta v${proposal.versionNumber}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={submitting}>Confirmar</Button>
        </>
      }
    >
      <FormField label="Novo status" htmlFor="p-status" required error={error}>
        <Select id="p-status" value={status} onChange={(e) => { setStatus(e.target.value); setError(""); }}>
          <option value="">Selecionar…</option>
          {options.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Observações (opcional)" htmlFor="p-status-notes">
        <Input id="p-status-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </Modal>
  );
}
