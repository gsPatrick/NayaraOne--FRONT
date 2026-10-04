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
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { listPurchaseOrders, getPurchaseOrder, confirmGoodsReceipt, listDiscrepancies } from "@/lib/api/procurement";
import { listInventoryLocations } from "@/lib/api/inventory";
import { formatBRL, formatDateTime, formatQuantity, toNumber } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Aberto", RECEIVED: "Recebido", CANCELED: "Cancelado" };
const STATUS_TONE = { OPEN: "info", RECEIVED: "success", CANCELED: "neutral" };

export default function PedidosDeCompraPage() {
  const [orders, setOrders] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [receiveModal, setReceiveModal] = useState(null); // order detail
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [invoiceFingerprint, setInvoiceFingerprint] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listPurchaseOrders(), listDiscrepancies(), listInventoryLocations()])
      .then(([o, d, l]) => {
        setOrders(o || []);
        setDiscrepancies(d || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os pedidos de compra."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function openReceive(row) {
    try {
      const full = await getPurchaseOrder(row.id);
      setReceiveModal(full);
      const defaults = {};
      full.items.forEach((it) => { defaults[it.id] = String(Number(it.quantity) - Number(it.receivedQuantity)); });
      setReceivedQuantities(defaults);
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o pedido.");
    }
  }

  async function handleConfirmReceipt() {
    if (!destinationLocationId) return;
    setSaving(true);
    setActionError("");
    try {
      await confirmGoodsReceipt(receiveModal.id, {
        destinationLocationId,
        invoiceFingerprint: invoiceFingerprint || undefined,
        items: receiveModal.items.map((it) => ({ purchaseOrderItemId: it.id, receivedQuantity: toNumber(receivedQuantities[it.id] || "0") })),
      });
      setReceiveModal(null);
      setDestinationLocationId("");
      setInvoiceFingerprint("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível confirmar o recebimento.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "supplier", label: "Fornecedor", width: "20%", render: (row) => row.supplierPersonId },
    { key: "amount", label: "Custo comprometido", width: "18%", render: (row) => formatBRL(row.committedAmount) },
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criado em", width: "20%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "28%",
      render: (row) => (row.status === "OPEN" ? (
        <Button size="sm" onClick={() => openReceive(row)}>Receber material</Button>
      ) : null),
    },
  ];

  const discColumns = [
    { key: "type", label: "Tipo", width: "20%", render: (row) => row.discrepancyType },
    { key: "expected", label: "Esperado", width: "20%", render: (row) => (row.expectedValue != null ? formatQuantity(row.expectedValue) : "—") },
    { key: "received", label: "Recebido", width: "20%", render: (row) => (row.receivedValue != null ? formatQuantity(row.receivedValue) : "—") },
    { key: "status", label: "Status", width: "20%", render: (row) => <Badge tone={row.status === "OPEN" ? "warning" : "success"}>{row.status === "OPEN" ? "Em aberto" : "Resolvida"}</Badge> },
  ];

  return (
    <AppShell title="Pedidos de compra" backHref="/painel/compras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os pedidos de compra">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Pedidos de compra (PO)" subtitle="Custo comprometido — recebimento delega ao Estoque (saldo + custo médio)">
        <Table columns={columns} rows={loading ? [] : orders} loading={loading} emptyMessage="Nenhum pedido de compra registrado." />
      </Card>

      <Card title="Divergências de recebimento" subtitle="Three-way match PO x recebido">
        <Table columns={discColumns} rows={loading ? [] : discrepancies} loading={loading} emptyMessage="Nenhuma divergência registrada." />
      </Card>

      <Modal
        open={Boolean(receiveModal)}
        onClose={() => setReceiveModal(null)}
        title="Confirmar recebimento de material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiveModal(null)}>Cancelar</Button>
            <Button onClick={handleConfirmReceipt} loading={saving} disabled={!destinationLocationId}>Confirmar</Button>
          </>
        }
      >
        <FormField label="Local de destino" required>
          <Select value={destinationLocationId} onChange={(e) => setDestinationLocationId(e.target.value)}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Chave/fingerprint da NF">
          <Input value={invoiceFingerprint} onChange={(e) => setInvoiceFingerprint(e.target.value)} />
        </FormField>
        {(receiveModal?.items || []).map((it) => (
          <FormField key={it.id} label={`${it.description} (pedido: ${formatQuantity(it.quantity)}, já recebido: ${formatQuantity(it.receivedQuantity)})`}>
            <DecimalInput value={receivedQuantities[it.id] || ""} onChange={(e) => setReceivedQuantities((p) => ({ ...p, [it.id]: e.target.value }))} />
          </FormField>
        ))}
      </Modal>
    </AppShell>
  );
}
