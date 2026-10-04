"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { listLossCases, openLossCase, decideLossCase, listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { formatBRL, formatDateTime } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Em análise", APPROVED: "Aprovada (baixa gerada)", REJECTED: "Rejeitada" };
const STATUS_TONE = { OPEN: "warning", APPROVED: "danger", REJECTED: "neutral" };

export default function PerdasPage() {
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ inventoryItemId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "" });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listLossCases(), listInventoryItems(), listInventoryLocations()])
      .then(([c, i, l]) => {
        setCases(c || []);
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos de perda."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const evidenceIds = form.evidenceFileIds.split(",").map((s) => s.trim()).filter(Boolean);
  const isValid = form.inventoryItemId && Number(form.quantity) > 0 && form.context.trim() && evidenceIds.length > 0;

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await openLossCase({
        inventoryItemId: form.inventoryItemId,
        locationId: form.locationId || undefined,
        quantity: Number(form.quantity),
        context: form.context,
        evidenceFileIds: evidenceIds,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
      });
      setModalOpen(false);
      setForm({ inventoryItemId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o caso de perda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, decision) {
    setBusyId(id);
    setActionError("");
    try {
      await decideLossCase(id, decision);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir o caso de perda.");
    } finally {
      setBusyId(null);
    }
  }

  function itemName(id) {
    return items.find((i) => i.id === id)?.name || "—";
  }

  const columns = [
    { key: "item", label: "Item", width: "20%", render: (row) => (row.inventoryItemId ? itemName(row.inventoryItemId) : "Patrimônio") },
    { key: "qty", label: "Quantidade", width: "12%", render: (row) => row.quantity || "—" },
    { key: "context", label: "Contexto", width: "26%" },
    { key: "estimate", label: "Estimativa", width: "14%", render: (row) => (row.estimatedCost != null ? formatBRL(row.estimatedCost) : "—") },
    { key: "status", label: "Status", width: "16%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (row.status === "OPEN" ? (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="danger" onClick={() => handleDecide(row.id, "APPROVED")} loading={busyId === row.id}>Aprovar baixa</Button>
          <Button size="sm" variant="secondary" onClick={() => handleDecide(row.id, "REJECTED")} loading={busyId === row.id}>Rejeitar</Button>
        </div>
      ) : null),
    },
  ];

  return (
    <AppShell title="Perdas, quebras e extravios" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os casos de perda">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Casos de perda" subtitle="Perda não é baixa comum — exige evidência e decisão separada (EST-010)">
        <Table columns={columns} rows={loading ? [] : cases} loading={loading} emptyMessage="Nenhum caso de perda registrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Registrar perda
        </Button>
      </StickyActionBar>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar perda, quebra ou extravio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Registrar</Button>
          </>
        }
      >
        <FormField label="Item" required>
          <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
            <option value="">Selecione...</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Local">
          <Select value={form.locationId} onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>
            <option value="">Nenhum</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Quantidade perdida" required>
          <Input type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
        </FormField>
        <FormField label="Contexto" required helper="O que aconteceu — obrigatório para auditoria.">
          <Input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} />
        </FormField>
        <FormField label="IDs de evidência (arquivo)" required helper="Pelo menos um arquivo de evidência é obrigatório (EST-TS-10). Separe por vírgula.">
          <Input value={form.evidenceFileIds} onChange={(e) => setForm((p) => ({ ...p, evidenceFileIds: e.target.value }))} />
        </FormField>
        <FormField label="Estimativa de custo (R$)">
          <Input type="number" value={form.estimatedCost} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
