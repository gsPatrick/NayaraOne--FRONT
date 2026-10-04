"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { listRequisitions, createRequisition, decideRequisition, issueRequisition, listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { listProjects } from "@/lib/api/construction";
import { formatDateTime, toNumber } from "@/lib/format";

const STATUS_LABELS = { REQUESTED: "Solicitada", APPROVED: "Aprovada", REJECTED: "Rejeitada", ISSUED: "Entregue" };
const STATUS_TONE = { REQUESTED: "neutral", APPROVED: "info", REJECTED: "danger", ISSUED: "success" };

export default function RequisicoesPage() {
  const [requisitions, setRequisitions] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ warehouseLocationId: "", projectLocationId: "", projectId: "", lines: [{ inventoryItemId: "", quantity: "" }] });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listRequisitions(), listInventoryItems(), listInventoryLocations(), listProjects().catch(() => [])])
      .then(([r, i, l, p]) => {
        setRequisitions(r || []);
        setItems(i || []);
        setLocations(l || []);
        setProjects(p || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as requisições."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function updateLine(idx, field, value) {
    setForm((p) => {
      const lines = [...p.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...p, lines };
    });
  }

  const isValid = form.warehouseLocationId && (!form.projectLocationId || form.projectId) && form.lines.every((l) => l.inventoryItemId && !Number.isNaN(toNumber(l.quantity)) && toNumber(l.quantity) > 0);

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await createRequisition({
        warehouseLocationId: form.warehouseLocationId,
        projectLocationId: form.projectLocationId || undefined,
        projectId: form.projectId || undefined,
        items: form.lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: toNumber(l.quantity) })),
      });
      setModalOpen(false);
      setForm({ warehouseLocationId: "", projectLocationId: "", projectId: "", lines: [{ inventoryItemId: "", quantity: "" }] });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a requisição.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, decision) {
    setBusyId(id);
    setActionError("");
    try {
      await decideRequisition(id, decision);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir a requisição.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleIssue(id) {
    setBusyId(id);
    setActionError("");
    try {
      await issueRequisition(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível entregar a requisição.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  const columns = [
    { key: "warehouse", label: "Almoxarifado", width: "18%", render: (row) => locationName(row.warehouseLocationId) },
    { key: "project", label: "Canteiro", width: "18%", render: (row) => (row.projectLocationId ? locationName(row.projectLocationId) : "—") },
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criada em", width: "18%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "32%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8 }}>
          {row.status === "REQUESTED" ? (
            <>
              <Button size="sm" onClick={() => handleDecide(row.id, "APPROVED")} loading={busyId === row.id}>Aprovar</Button>
              <Button size="sm" variant="danger" onClick={() => handleDecide(row.id, "REJECTED")} loading={busyId === row.id}>Rejeitar</Button>
            </>
          ) : null}
          {row.status === "APPROVED" ? (
            <Button size="sm" onClick={() => handleIssue(row.id)} loading={busyId === row.id}>Entregar (baixa)</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Requisições de material" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as requisições">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Requisições" subtitle="Solicitação → aprovação → baixa (OUT) por obra">
        <Table columns={columns} rows={loading ? [] : requisitions} loading={loading} emptyMessage="Nenhuma requisição registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Nova requisição
        </Button>
      </StickyActionBar>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova requisição de material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar</Button>
          </>
        }
      >
        <FormField label="Almoxarifado (origem)" required>
          <Select value={form.warehouseLocationId} onChange={(e) => setForm((p) => ({ ...p, warehouseLocationId: e.target.value }))}>
            <option value="">Selecione...</option>
            {locations.filter((l) => l.locationType === "WAREHOUSE").map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Canteiro (destino)" helper="Opcional — se informado, exige selecionar a obra abaixo (EST-004).">
          <Select value={form.projectLocationId} onChange={(e) => setForm((p) => ({ ...p, projectLocationId: e.target.value }))}>
            <option value="">Nenhum</option>
            {locations.filter((l) => l.locationType === "PROJECT_SITE").map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        {form.projectLocationId ? (
          <FormField label="Obra" required>
            <Select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}>
              <option value="">Selecione...</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>{pr.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Select value={line.inventoryItemId} onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)} style={{ flex: 2 }}>
              <option value="">Item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput placeholder="Qtd" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} style={{ flex: 1 }} />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setForm((p) => ({ ...p, lines: [...p.lines, { inventoryItemId: "", quantity: "" }] }))}>+ Adicionar item</Button>
      </Modal>
    </AppShell>
  );
}
