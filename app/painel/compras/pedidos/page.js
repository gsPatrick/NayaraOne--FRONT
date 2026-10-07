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
import { listPurchaseOrders, getPurchaseOrder, confirmGoodsReceipt, listGoodsReceipts, listDiscrepancies, resolveDiscrepancy, evaluateSupplier, listSupplierEvaluations } from "@/lib/api/procurement";
import { listInventoryLocations } from "@/lib/api/inventory";
import { formatBRL, formatDateTime, formatQuantity, toNumber } from "@/lib/format";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";

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
  const [receipts, setReceipts] = useState([]);
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [invoiceFingerprint, setInvoiceFingerprint] = useState("");
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyDiscId, setBusyDiscId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 32, 2026-10-05): a API já expõe
  // listSupplierEvaluations (R17) com nota média, mas nenhuma tela do front lia/exibia isso —
  // nem havia como o usuário avaliar um fornecedor pela UI. Agora a nota média aparece na
  // listagem de pedidos e há um botão pra avaliar o fornecedor de um pedido já recebido.
  const [supplierScores, setSupplierScores] = useState({}); // { [supplierPersonId]: averageScore }
  const [evalTarget, setEvalTarget] = useState(null); // order
  const [evalForm, setEvalForm] = useState({ score: "5", notes: "" });

  async function loadSupplierScores(ordersList) {
    const uniqueSuppliers = [...new Set((ordersList || []).map((o) => o.supplierPersonId).filter(Boolean))];
    const results = await Promise.all(
      uniqueSuppliers.map((id) => listSupplierEvaluations(id).catch(() => null))
    );
    const map = {};
    uniqueSuppliers.forEach((id, idx) => {
      map[id] = results[idx]?.averageScore ?? null;
    });
    setSupplierScores(map);
  }

  async function handleEvaluateSupplier() {
    if (!evalTarget) return;
    setSaving(true);
    setActionError("");
    try {
      await evaluateSupplier({
        supplierPersonId: evalTarget.supplierPersonId,
        purchaseOrderId: evalTarget.id,
        score: toNumber(evalForm.score),
        notes: evalForm.notes || undefined,
      });
      setEvalTarget(null);
      setEvalForm({ score: "5", notes: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a avaliação do fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listPurchaseOrders(), listDiscrepancies(), listInventoryLocations()])
      .then(([o, d, l]) => {
        setOrders(o || []);
        setDiscrepancies(d || []);
        setLocations(l || []);
        loadSupplierScores(o);
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
      loadReceipts(row.id);
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o pedido.");
    }
  }

  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 27, 2026-10-05): não havia como o
  // front mostrar o payable (contas a pagar) gerado/corrigido pelo recebimento (R25/R26) —
  // listGoodsReceipts agora expõe esse histórico por PO.
  async function loadReceipts(purchaseOrderId) {
    try {
      const data = await listGoodsReceipts(purchaseOrderId);
      setReceipts(data || []);
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar os recebimentos deste pedido.");
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
        invoiceTotalAmount: invoiceTotalAmount ? toNumber(invoiceTotalAmount) : undefined,
        items: receiveModal.items.map((it) => ({ purchaseOrderItemId: it.id, receivedQuantity: toNumber(receivedQuantities[it.id] || "0") })),
      });
      setInvoiceTotalAmount("");
      setReceiveModal(null);
      setDestinationLocationId("");
      setInvoiceFingerprint("");
      setReceipts([]);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível confirmar o recebimento.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "supplier",
      label: "Fornecedor",
      width: "16%",
      // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 62, 2026-10-06): mostrava o UUID
      // cru — backend agora resolve supplierPersonName (mesmo fix já aplicado em compareOffers).
      render: (row) => row.supplierPersonName || row.supplierPersonId,
    },
    {
      key: "score",
      label: "Nota do fornecedor",
      width: "14%",
      render: (row) => (supplierScores[row.supplierPersonId] != null ? `${supplierScores[row.supplierPersonId]} / 5` : "—"),
    },
    { key: "amount", label: "Custo comprometido", width: "16%", render: (row) => formatBRL(row.committedAmount) },
    { key: "status", label: "Status", width: "12%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criado em", width: "16%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "26%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.status === "OPEN" ? <Button size="sm" onClick={() => openReceive(row)}>Receber material</Button> : null}
          {row.status === "RECEIVED" ? (
            <Button size="sm" variant="secondary" onClick={() => setEvalTarget(row)}>Avaliar fornecedor</Button>
          ) : null}
        </div>
      ),
    },
  ];

  async function handleResolveDiscrepancy(row, resolution) {
    const ok = await confirm({
      title: resolution === "ACCEPTED" ? "Aceitar divergência" : "Rejeitar divergência",
      message: `Confirma que quer marcar esta divergência (${row.discrepancyType}) como ${resolution === "ACCEPTED" ? "aceita" : "rejeitada"}?`,
      tone: resolution === "ACCEPTED" ? "default" : "danger",
    });
    if (!ok) return;
    setBusyDiscId(row.id);
    setActionError("");
    try {
      await resolveDiscrepancy(row.id, { resolution });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível resolver a divergência.");
    } finally {
      setBusyDiscId(null);
    }
  }

  const discColumns = [
    { key: "type", label: "Tipo", width: "18%", render: (row) => row.discrepancyType },
    { key: "expected", label: "Esperado", width: "16%", render: (row) => (row.expectedValue != null ? formatQuantity(row.expectedValue) : "—") },
    { key: "received", label: "Recebido", width: "16%", render: (row) => (row.receivedValue != null ? formatQuantity(row.receivedValue) : "—") },
    { key: "status", label: "Status", width: "18%", render: (row) => <Badge tone={row.status === "OPEN" ? "warning" : row.status === "REJECTED" ? "danger" : "success"}>{row.status === "OPEN" ? "Em aberto" : row.status === "REJECTED" ? "Rejeitada" : "Aceita"}</Badge> },
    {
      key: "actions",
      label: "",
      width: "32%",
      render: (row) => (row.status === "OPEN" ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" onClick={() => handleResolveDiscrepancy(row, "ACCEPTED")} loading={busyDiscId === row.id}>Aceitar</Button>
          <Button size="sm" variant="secondary" onClick={() => handleResolveDiscrepancy(row, "REJECTED")} loading={busyDiscId === row.id}>Rejeitar</Button>
        </div>
      ) : null),
    },
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
        onClose={() => { setReceiveModal(null); setReceipts([]); }}
        title="Confirmar recebimento de material"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReceiveModal(null); setReceipts([]); }}>Cancelar</Button>
            <Button onClick={handleConfirmReceipt} loading={saving} disabled={!destinationLocationId}>Confirmar</Button>
          </>
        }
      >
        {receipts.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <strong>Recebimentos anteriores</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {receipts.map((r) => (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <span>
                    {formatDateTime(r.created_at)}
                    {r.invoiceTotalAmount != null ? ` — NF: ${formatBRL(r.invoiceTotalAmount)}` : ""}
                  </span>
                  <Badge tone={r.financialEntryId ? "success" : "neutral"}>
                    {r.financialEntryId ? "Contas a pagar gerado" : "Sem lançamento"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
        <FormField label="Valor total da NF (opcional — confere three-way match e gera o contas a pagar)">
          <DecimalInput value={invoiceTotalAmount} onChange={(e) => setInvoiceTotalAmount(e.target.value)} />
        </FormField>
        {(receiveModal?.items || []).map((it) => (
          <FormField key={it.id} label={`${it.description} (pedido: ${formatQuantity(it.quantity)}, já recebido: ${formatQuantity(it.receivedQuantity)})`}>
            <DecimalInput value={receivedQuantities[it.id] || ""} onChange={(e) => setReceivedQuantities((p) => ({ ...p, [it.id]: e.target.value }))} />
          </FormField>
        ))}
      </Modal>

      <Modal
        open={Boolean(evalTarget)}
        onClose={() => setEvalTarget(null)}
        title="Avaliar fornecedor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEvalTarget(null)}>Cancelar</Button>
            <Button onClick={handleEvaluateSupplier} loading={saving}>Salvar avaliação</Button>
          </>
        }
      >
        <FormField label="Nota (1 a 5)" required>
          <Select value={evalForm.score} onChange={(e) => setEvalForm((p) => ({ ...p, score: e.target.value }))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Observações (opcional)">
          <Input value={evalForm.notes} onChange={(e) => setEvalForm((p) => ({ ...p, notes: e.target.value }))} />
        </FormField>
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
