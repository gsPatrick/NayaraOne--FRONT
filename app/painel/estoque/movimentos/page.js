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
import { listInventoryItems, listInventoryLocations, recordInventoryMovement, getItemBalances } from "@/lib/api/inventory";
import { formatQuantity, formatDateTime } from "@/lib/format";
import styles from "../../obras/lista/page.module.css";

const MOVEMENT_TYPE_LABELS = { IN: "Entrada", OUT: "Saída", RETURN: "Devolução", TRANSFER: "Transferência", ADJUSTMENT: "Ajuste", LOSS: "Perda", DISPOSAL: "Descarte" };
const MOVEMENT_TYPE_TONE = { IN: "success", OUT: "info", RETURN: "neutral", TRANSFER: "info", ADJUSTMENT: "warning", LOSS: "danger", DISPOSAL: "danger" };
const SOURCE_REQUIRED = { OUT: "source", LOSS: "source", DISPOSAL: "source", IN: "destination", RETURN: "destination", TRANSFER: "both", ADJUSTMENT: "either" };

export default function MovimentosPage() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    inventoryItemId: "", movementType: "IN", quantity: "", sourceLocationId: "", destinationLocationId: "",
    responsiblePersonId: "", reason: "",
  });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInventoryItems(), listInventoryLocations()])
      .then(([i, l]) => {
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!form.inventoryItemId) {
      setBalances([]);
      return;
    }
    getItemBalances(form.inventoryItemId).then(setBalances).catch(() => setBalances([]));
  }, [form.inventoryItemId]);

  const requirement = SOURCE_REQUIRED[form.movementType];
  const needsReason = ["ADJUSTMENT", "LOSS", "DISPOSAL"].includes(form.movementType);
  const item = items.find((i) => i.id === form.inventoryItemId);
  const needsResponsible = item && ["TOOL", "ASSET"].includes(item.itemType) && ["OUT", "TRANSFER"].includes(form.movementType);

  const isValid =
    form.inventoryItemId &&
    form.quantity &&
    Number(form.quantity) > 0 &&
    (requirement !== "source" || form.sourceLocationId) &&
    (requirement !== "destination" || form.destinationLocationId) &&
    (requirement !== "both" || (form.sourceLocationId && form.destinationLocationId)) &&
    (requirement !== "either" || form.sourceLocationId || form.destinationLocationId) &&
    (!needsReason || form.reason.trim()) &&
    (!needsResponsible || form.responsiblePersonId.trim());

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await recordInventoryMovement({
        inventoryItemId: form.inventoryItemId,
        movementType: form.movementType,
        quantity: Number(form.quantity),
        sourceLocationId: form.sourceLocationId || undefined,
        destinationLocationId: form.destinationLocationId || undefined,
        responsiblePersonId: form.responsiblePersonId || undefined,
        reason: form.reason || undefined,
      });
      setModalOpen(false);
      setForm({ inventoryItemId: "", movementType: "IN", quantity: "", sourceLocationId: "", destinationLocationId: "", responsiblePersonId: "", reason: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o movimento.");
    } finally {
      setSaving(false);
    }
  }

  const balanceColumns = [
    { key: "location", label: "Local", width: "60%", render: (row) => row.location?.name || row.locationId },
    { key: "qty", label: "Saldo", width: "40%", render: (row) => formatQuantity(row.quantityOnHand) },
  ];

  return (
    <AppShell title="Movimentos de estoque" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os dados">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Consultar saldo por item" subtitle="Selecione um item para ver o saldo por local">
        <div className={styles.toolbar}>
          <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
            <option value="">Selecione um item...</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </div>
        {form.inventoryItemId ? (
          <Table columns={balanceColumns} rows={balances} loading={loading} emptyMessage="Sem saldo registrado para este item." />
        ) : null}
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Registrar movimento
        </Button>
      </StickyActionBar>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar movimento de estoque"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!isValid}>Registrar</Button>
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
        <FormField label="Tipo de movimento" required>
          <Select value={form.movementType} onChange={(e) => setForm((p) => ({ ...p, movementType: e.target.value }))}>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Quantidade" required>
          <Input type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
        </FormField>
        {(requirement === "source" || requirement === "both" || requirement === "either") ? (
          <FormField label="Local de origem" required={requirement !== "either"}>
            <Select value={form.sourceLocationId} onChange={(e) => setForm((p) => ({ ...p, sourceLocationId: e.target.value }))}>
              <option value="">Selecione...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {(requirement === "destination" || requirement === "both" || requirement === "either") ? (
          <FormField label="Local de destino" required={requirement !== "either"}>
            <Select value={form.destinationLocationId} onChange={(e) => setForm((p) => ({ ...p, destinationLocationId: e.target.value }))}>
              <option value="">Selecione...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {needsResponsible ? (
          <FormField label="Responsável (ID do usuário)" required helper="Item é ferramenta/patrimônio — exige responsável na saída.">
            <Input value={form.responsiblePersonId} onChange={(e) => setForm((p) => ({ ...p, responsiblePersonId: e.target.value }))} />
          </FormField>
        ) : null}
        {needsReason ? (
          <FormField label="Motivo" required helper="Ajuste, perda e descarte exigem motivo (EST-008).">
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          </FormField>
        ) : null}
      </Modal>
    </AppShell>
  );
}
