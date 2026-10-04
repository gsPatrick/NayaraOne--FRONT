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
import RowActions from "@/components/molecules/RowActions/RowActions";
import { listReceipts, createReceipt, reviewReceipt, confirmReceipt } from "@/lib/api/inventory";
import { listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { formatDateTime } from "@/lib/format";
import styles from "../../obras/lista/page.module.css";

const STATUS_LABELS = { DRAFT: "Rascunho", REVIEWED: "Revisado", COMPLETED: "Confirmado" };
const STATUS_TONE = { DRAFT: "neutral", REVIEWED: "info", COMPLETED: "success" };

export default function RecebimentosPage() {
  const [receipts, setReceipts] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ destinationLocationId: "", invoiceNumber: "", invoiceFingerprint: "", lines: [{ inventoryItemId: "", quantity: "", unitCost: "" }] });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listReceipts(), listInventoryItems(), listInventoryLocations()])
      .then(([r, i, l]) => {
        setReceipts(r || []);
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os recebimentos."))
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
  function addLine() {
    setForm((p) => ({ ...p, lines: [...p.lines, { inventoryItemId: "", quantity: "", unitCost: "" }] }));
  }

  const isValid = form.destinationLocationId && form.lines.every((l) => l.inventoryItemId && Number(l.quantity) > 0);

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await createReceipt({
        destinationLocationId: form.destinationLocationId,
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceFingerprint: form.invoiceFingerprint || undefined,
        items: form.lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: Number(l.quantity), unitCost: l.unitCost ? Number(l.unitCost) : undefined })),
      });
      setModalOpen(false);
      setForm({ destinationLocationId: "", invoiceNumber: "", invoiceFingerprint: "", lines: [{ inventoryItemId: "", quantity: "", unitCost: "" }] });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o recebimento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id) {
    setBusyId(id);
    setActionError("");
    try {
      await reviewReceipt(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível revisar o recebimento.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirm(id) {
    setBusyId(id);
    setActionError("");
    try {
      await confirmReceipt(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível confirmar o recebimento.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  const columns = [
    { key: "invoice", label: "NF", width: "16%", render: (row) => row.invoiceNumber || "—" },
    { key: "dest", label: "Destino", width: "22%", render: (row) => locationName(row.destinationLocationId) },
    { key: "status", label: "Status", width: "16%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criado em", width: "20%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "26%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8 }}>
          {row.status === "DRAFT" ? (
            <Button size="sm" variant="secondary" onClick={() => handleReview(row.id)} loading={busyId === row.id}>Revisar</Button>
          ) : null}
          {row.status === "REVIEWED" ? (
            <Button size="sm" onClick={() => handleConfirm(row.id)} loading={busyId === row.id}>Confirmar entrada</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Recebimentos (NF)" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os recebimentos">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Recebimentos" subtitle="Entrada por NF — Rascunho → Revisado → Confirmado (gera saldo+custo médio)">
        <Table columns={columns} rows={loading ? [] : receipts} loading={loading} emptyMessage="Nenhum recebimento registrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Novo recebimento
        </Button>
      </StickyActionBar>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo recebimento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar rascunho</Button>
          </>
        }
      >
        <FormField label="Local de destino" required>
          <Select value={form.destinationLocationId} onChange={(e) => setForm((p) => ({ ...p, destinationLocationId: e.target.value }))}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Número da NF">
          <Input value={form.invoiceNumber} onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
        </FormField>
        <FormField label="Chave/fingerprint da NF" helper="Usado para detectar NF duplicada.">
          <Input value={form.invoiceFingerprint} onChange={(e) => setForm((p) => ({ ...p, invoiceFingerprint: e.target.value }))} />
        </FormField>
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Select value={line.inventoryItemId} onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)} style={{ flex: 2 }}>
              <option value="">Item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <Input type="number" placeholder="Qtd" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} style={{ flex: 1 }} />
            <Input type="number" placeholder="Custo unit." value={line.unitCost} onChange={(e) => updateLine(idx, "unitCost", e.target.value)} style={{ flex: 1 }} />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={addLine}>+ Adicionar item</Button>
      </Modal>
    </AppShell>
  );
}
