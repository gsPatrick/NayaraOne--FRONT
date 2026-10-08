"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { useRouter } from "next/navigation";
import { listPurchaseOrders, getPurchaseOrder, confirmGoodsReceipt, listGoodsReceipts, listDiscrepancies, resolveDiscrepancy, evaluateSupplier, listSupplierEvaluations, cancelPurchaseOrder } from "@/lib/api/procurement";
import { listInventoryLocations } from "@/lib/api/inventory";
import { formatBRL, formatDateTime, formatQuantity, toNumber } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";

const STATUS_LABELS = { OPEN: "Aberto", RECEIVED: "Recebido", CANCELED: "Cancelado" };
const STATUS_TONE = { OPEN: "info", RECEIVED: "success", CANCELED: "neutral" };
// Mesmo conjunto de CANCELABLE_STATUSES de procurement.service.js (cancelPurchaseOrder).
const CANCELABLE_STATUSES = ["OPEN", "RECEIVED"];
const DISCREPANCY_TYPE_LABELS = {
  OVER_RECEIPT: "Recebido a mais",
  UNDER_RECEIPT: "Saldo não recebido (cancelamento)",
  PRICE_MISMATCH: "Divergência de preço (NF)",
};

export default function PedidosDeCompraPage() {
  const router = useRouter();
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

  // Auditoria contratual Marco 7 (2026-10-07) — "Cancel/return = compensação": o backend
  // (cancelPurchaseOrder) já existia e era testado, mas nenhuma tela permitia cancelar uma PO.
  // A permissão é lida no cliente (localStorage da sessão) só depois do mount, pra não divergir
  // do HTML do SSR; a API continua sendo quem de fato recusa (403) sem procurement:approve.
  const [canApprove, setCanApprove] = useState(false);
  useEffect(() => { setCanApprove(hasPermission("procurement:approve")); }, []);
  const [busyCancelId, setBusyCancelId] = useState(null);
  const [cancelResult, setCancelResult] = useState(null); // { order, items, discrepancies }
  const cancelReasonRef = useRef("");

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

  async function handleCancelOrder(row) {
    setActionError("");
    let full;
    try {
      full = await getPurchaseOrder(row.id);
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar o pedido para cancelar.");
      return;
    }
    const pendingItems = (full.items || []).filter((it) => toNumber(it.receivedQuantity) < toNumber(it.quantity));
    cancelReasonRef.current = "";
    const ok = await confirm({
      title: "Cancelar pedido de compra?",
      tone: "danger",
      confirmLabel: "Cancelar pedido",
      cancelLabel: "Voltar",
      message: (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0 }}>
            O pedido de <strong>{row.supplierPersonName || "fornecedor"}</strong> ({formatBRL(row.committedAmount)} comprometidos) será
            marcado como <strong>Cancelado</strong> e não poderá mais receber material. Esta ação não pode ser desfeita.
          </p>
          {pendingItems.length > 0 ? (
            <Alert tone="warning" title="Saldo que não vai mais chegar">
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {pendingItems.map((it) => (
                  <li key={it.id}>
                    {it.description}: pedido {formatQuantity(it.quantity)}, recebido {formatQuantity(it.receivedQuantity)} — falta{" "}
                    {formatQuantity(toNumber(it.quantity) - toNumber(it.receivedQuantity))}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 6 }}>
                Para itens que já tiveram recebimento parcial, uma divergência <strong>Saldo não recebido</strong> é aberta
                automaticamente como registro da compensação. O que já foi recebido/lançado no Financeiro não é estornado aqui.
              </div>
            </Alert>
          ) : (
            <Alert tone="info">Todos os itens já foram recebidos — nenhum saldo pendente será registrado.</Alert>
          )}
          <FormField label="Motivo do cancelamento (opcional — fica registrado na auditoria)">
            <Input defaultValue="" maxLength={500} onChange={(e) => { cancelReasonRef.current = e.target.value; }} placeholder="Ex.: fornecedor não vai entregar o restante" />
          </FormField>
        </div>
      ),
    });
    if (!ok) return;
    setBusyCancelId(row.id);
    try {
      const result = await cancelPurchaseOrder(row.id, cancelReasonRef.current.trim());
      setCancelResult({ order: { ...row, ...(result?.order || {}) }, items: pendingItems, discrepancies: result?.discrepancies || [] });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cancelar o pedido de compra.");
    } finally {
      setBusyCancelId(null);
    }
  }

  const columns = [
    {
      key: "supplier",
      label: "Fornecedor",
      width: "16%",
      // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 62, 2026-10-06): mostrava o UUID
      // cru — backend agora resolve supplierPersonName (mesmo fix já aplicado em compareOffers).
      // Link para a ficha do fornecedor (qualificação/due diligence/contas bancárias).
      render: (row) => (row.supplierPersonId ? (
        <Link href={`/painel/compras/fornecedores/${row.supplierPersonId}`}>{row.supplierPersonName || row.supplierPersonId}</Link>
      ) : "—"),
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
          {canApprove && CANCELABLE_STATUSES.includes(row.status) ? (
            <Button size="sm" variant="danger" onClick={() => handleCancelOrder(row)} loading={busyCancelId === row.id}>Cancelar pedido</Button>
          ) : null}
        </div>
      ),
    },
  ];

  async function handleResolveDiscrepancy(row, resolution) {
    const ok = await confirm({
      title: resolution === "ACCEPTED" ? "Aceitar divergência" : "Rejeitar divergência",
      message: `Confirma que quer marcar esta divergência (${DISCREPANCY_TYPE_LABELS[row.discrepancyType] || row.discrepancyType}) como ${resolution === "ACCEPTED" ? "aceita" : "rejeitada"}?`,
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
    { key: "type", label: "Tipo", width: "18%", render: (row) => DISCREPANCY_TYPE_LABELS[row.discrepancyType] || row.discrepancyType },
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
        size="lg"
        open={Boolean(receiveModal)}
        onClose={() => { setReceiveModal(null); setReceipts([]); }}
        title="Confirmar recebimento de material"
        footer={
          locations.length === 0 ? (
            <Button variant="secondary" onClick={() => { setReceiveModal(null); setReceipts([]); }}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setReceiveModal(null); setReceipts([]); }}>Cancelar</Button>
              <Button onClick={handleConfirmReceipt} loading={saving} disabled={!destinationLocationId}>Confirmar</Button>
            </>
          )
        }
      >
        {locations.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="mapPin" title="Nenhum local de estoque cadastrado" description="Você precisa cadastrar pelo menos um local de destino antes de confirmar um recebimento." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar local agora</Button>
          </div>
        ) : (
          <>
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
          </>
        )}
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

      <Modal
        open={Boolean(cancelResult)}
        onClose={() => setCancelResult(null)}
        title="Pedido de compra cancelado"
        footer={<Button onClick={() => setCancelResult(null)}>Entendi</Button>}
      >
        {cancelResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <p style={{ margin: 0 }}>
              Pedido de <strong>{cancelResult.order.supplierPersonName || "fornecedor"}</strong> ({formatBRL(cancelResult.order.committedAmount)}) agora está{" "}
              <Badge tone={STATUS_TONE.CANCELED}>{STATUS_LABELS.CANCELED}</Badge>.
            </p>
            {cancelResult.discrepancies.length > 0 ? (
              <Alert tone="warning" title={`${cancelResult.discrepancies.length} divergência(s) de compensação aberta(s)`}>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {cancelResult.discrepancies.map((d) => {
                    const item = cancelResult.items.find(
                      (it) => toNumber(it.quantity) === toNumber(d.expectedValue) && toNumber(it.receivedQuantity) === toNumber(d.receivedValue)
                    );
                    return (
                      <li key={d.id}>
                        {DISCREPANCY_TYPE_LABELS[d.discrepancyType] || d.discrepancyType}
                        {item ? ` — ${item.description}` : ""}: esperado {formatQuantity(d.expectedValue)}, recebido {formatQuantity(d.receivedValue)}
                      </li>
                    );
                  })}
                </ul>
                <div style={{ marginTop: 6 }}>Elas aparecem em &quot;Divergências de recebimento&quot; abaixo para aceite ou rejeição.</div>
              </Alert>
            ) : cancelResult.items.length > 0 ? (
              <Alert tone="info">
                Nenhum item deste pedido chegou a ter recebimento — não há divergência a abrir. O cancelamento fica registrado no
                status do pedido e na trilha de auditoria.
              </Alert>
            ) : (
              <Alert tone="info">Todos os itens já tinham sido recebidos — nenhum saldo pendente a compensar.</Alert>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
