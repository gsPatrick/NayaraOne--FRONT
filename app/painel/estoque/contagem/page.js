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
import { listCounts, openCount, getCount, addCountItem, completeCount, applyCountAdjustment, listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { formatDateTime, formatQuantity, toNumber } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Em contagem", COMPLETED: "Fechado" };
const STATUS_TONE = { OPEN: "warning", COMPLETED: "success" };

export default function ContagemPage() {
  const [counts, setCounts] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [newLocationId, setNewLocationId] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [lineForm, setLineForm] = useState({ inventoryItemId: "", countedQuantity: "" });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listCounts(), listInventoryItems(), listInventoryLocations()])
      .then(([c, i, l]) => {
        setCounts(c || []);
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os inventários."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleOpenCount() {
    if (!newLocationId) return;
    setSaving(true);
    setActionError("");
    try {
      await openCount({ locationId: newLocationId });
      setOpenModalOpen(false);
      setNewLocationId("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o inventário.");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row) {
    try {
      const full = await getCount(row.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o inventário.");
    }
  }

  async function handleAddLine() {
    if (!lineForm.inventoryItemId || lineForm.countedQuantity === "") return;
    setSaving(true);
    try {
      await addCountItem(detail.id, { inventoryItemId: lineForm.inventoryItemId, countedQuantity: toNumber(lineForm.countedQuantity) });
      setLineForm({ inventoryItemId: "", countedQuantity: "" });
      const full = await getCount(detail.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível adicionar a contagem.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setBusyId(detail.id);
    try {
      const full = await completeCount(detail.id);
      setDetail(full);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar o inventário.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdjust(countItemId) {
    setBusyId(countItemId);
    try {
      await applyCountAdjustment(countItemId);
      const full = await getCount(detail.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível aplicar o ajuste.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }
  function itemName(id) {
    return items.find((i) => i.id === id)?.name || "—";
  }

  const columns = [
    { key: "location", label: "Local", width: "30%", render: (row) => locationName(row.locationId) },
    { key: "status", label: "Status", width: "20%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Aberto em", width: "26%", render: (row) => formatDateTime(row.created_at) },
    { key: "actions", label: "", width: "24%", render: (row) => <Button size="sm" variant="secondary" onClick={() => openDetail(row)}>Abrir</Button> },
  ];

  return (
    <AppShell title="Inventário físico" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os inventários">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Contagens" subtitle="Fechamento nunca altera saldo direto — ajuste é um ato separado e aprovado (EST-TS-09)">
        <Table columns={columns} rows={loading ? [] : counts} loading={loading} emptyMessage="Nenhum inventário aberto." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setOpenModalOpen(true)}>
          <Icon name="plus" size={18} /> Abrir inventário
        </Button>
      </StickyActionBar>

      <Modal
        open={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Abrir inventário físico"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleOpenCount} loading={saving} disabled={!newLocationId}>Abrir</Button>
          </>
        }
      >
        <FormField label="Local" required>
          <Select value={newLocationId} onChange={(e) => setNewLocationId(e.target.value)}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Inventário — ${detail ? locationName(detail.locationId) : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>Fechar</Button>
            {detail?.status === "OPEN" ? (
              <Button onClick={handleComplete} loading={busyId === detail?.id}>Fechar contagem</Button>
            ) : null}
          </>
        }
      >
        {detail?.status === "OPEN" ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Select value={lineForm.inventoryItemId} onChange={(e) => setLineForm((p) => ({ ...p, inventoryItemId: e.target.value }))} style={{ flex: 2 }}>
              <option value="">Item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput placeholder="Contado" value={lineForm.countedQuantity} onChange={(e) => setLineForm((p) => ({ ...p, countedQuantity: e.target.value }))} style={{ flex: 1 }} />
            <Button size="sm" onClick={handleAddLine} loading={saving}>Add</Button>
          </div>
        ) : null}
        {(detail?.items || []).map((line) => (
          <div key={line.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>{itemName(line.inventoryItemId)}</span>
            <span>Contado: {formatQuantity(line.countedQuantity)}</span>
            {line.expectedQuantity != null ? (
              <span>
                Esperado: {formatQuantity(line.expectedQuantity)} · Divergência: {formatQuantity(line.divergence)}
                {Number(line.divergence) !== 0 && !line.adjustmentMovementId ? (
                  <Button size="sm" variant="danger" onClick={() => handleAdjust(line.id)} loading={busyId === line.id} style={{ marginLeft: 8 }}>Ajustar</Button>
                ) : line.adjustmentMovementId ? (
                  <Badge tone="success" style={{ marginLeft: 8 }}>Ajustado</Badge>
                ) : null}
              </span>
            ) : null}
          </div>
        ))}
      </Modal>
    </AppShell>
  );
}
