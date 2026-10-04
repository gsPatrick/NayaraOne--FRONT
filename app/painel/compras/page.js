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
import {
  listPurchaseRequests, getPurchaseRequest, createPurchaseRequest, decidePurchaseRequest,
  createQuotation, submitSupplierOffer, compareOffers, awardSupplierOffer,
} from "@/lib/api/procurement";
import { listInventoryItems } from "@/lib/api/inventory";
import { formatDateTime, formatBRL, toNumber } from "@/lib/format";

const STATUS_LABELS = { REQUESTED: "Solicitada", APPROVED: "Aprovada", REJECTED: "Rejeitada", AWARDED: "Adjudicada", CLOSED: "Fechada" };
const STATUS_TONE = { REQUESTED: "neutral", APPROVED: "info", REJECTED: "danger", AWARDED: "success", CLOSED: "success" };

export default function ComprasPage() {
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ lines: [{ description: "", inventoryItemId: "", quantity: "" }] });

  const [quoteModal, setQuoteModal] = useState(null); // { request, quotation, offers }
  const [offerForm, setOfferForm] = useState({ supplierPersonId: "", prices: {} });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listPurchaseRequests(), listInventoryItems()])
      .then(([r, i]) => {
        setRequests(r || []);
        setItems(i || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as requisições de compra."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const isValid = form.lines.every((l) => l.description.trim() && !Number.isNaN(toNumber(l.quantity)) && toNumber(l.quantity) > 0);

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      const created = await createPurchaseRequest({
        items: form.lines.map((l) => ({ description: l.description, inventoryItemId: l.inventoryItemId || undefined, quantity: toNumber(l.quantity) })),
      });
      setCreateOpen(false);
      setForm({ lines: [{ description: "", inventoryItemId: "", quantity: "" }] });
      if (created?.stockWarnings?.length) {
        setActionError(
          "Aviso: já há saldo em estoque para " +
            created.stockWarnings.map((w) => `"${w.description}" (disponível: ${w.availableQuantity})`).join(", ") +
            " — confirme se a compra é mesmo necessária antes de prosseguir."
        );
      }
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a requisição de compra.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, decision) {
    setBusyId(id);
    setActionError("");
    try {
      await decidePurchaseRequest(id, decision);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir a requisição.");
    } finally {
      setBusyId(null);
    }
  }

  async function openQuoteFlow(request) {
    setActionError("");
    try {
      // BUG REAL CORRIGIDO (auditoria E2E ciclo 2): a linha vinda da listagem
      // (listPurchaseRequests) é só um resumo, sem o array "items" — usar ela direto aqui
      // quebrava quoteModal.request.items.map() com TypeError assim que o modal tentava
      // renderizar. Precisa buscar o detalhe completo (com items) antes de abrir o modal.
      const [fullRequest, quotation] = await Promise.all([getPurchaseRequest(request.id), createQuotation(request.id)]);
      setQuoteModal({ request: fullRequest, quotation, offers: [] });
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir a cotação.");
    }
  }

  async function handleSubmitOffer() {
    if (!offerForm.supplierPersonId.trim()) return;
    setSaving(true);
    setActionError("");
    try {
      await submitSupplierOffer(quoteModal.quotation.id, {
        supplierPersonId: offerForm.supplierPersonId,
        items: quoteModal.request.items.map((it) => ({ purchaseRequestItemId: it.id, unitPrice: toNumber(offerForm.prices[it.id] || "0") })),
      });
      const offers = await compareOffers(quoteModal.quotation.id);
      setQuoteModal((p) => ({ ...p, offers }));
      setOfferForm({ supplierPersonId: "", prices: {} });
    } catch (err) {
      setActionError(err?.message || "Não foi possível submeter a oferta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAward(offerId) {
    setSaving(true);
    setActionError("");
    try {
      await awardSupplierOffer(offerId);
      setQuoteModal(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível adjudicar a oferta.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criada em", width: "20%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "36%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.status === "REQUESTED" ? (
            <>
              <Button size="sm" onClick={() => handleDecide(row.id, "APPROVED")} loading={busyId === row.id}>Aprovar</Button>
              <Button size="sm" variant="danger" onClick={() => handleDecide(row.id, "REJECTED")} loading={busyId === row.id}>Rejeitar</Button>
            </>
          ) : null}
          {row.status === "APPROVED" ? (
            <Button size="sm" variant="secondary" onClick={() => openQuoteFlow(row)}>Cotar com fornecedores</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Requisições de compra" backHref="/painel">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as requisições de compra">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Requisições de compra" subtitle="REQUEST → APPROVAL → RFQ → COMPARISON → AWARD → PO">
        <Table columns={columns} rows={loading ? [] : requests} loading={loading} emptyMessage="Nenhuma requisição de compra registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Nova requisição de compra
        </Button>
      </StickyActionBar>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova requisição de compra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar</Button>
          </>
        }
      >
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input placeholder="Descrição" value={line.description} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], description: e.target.value }; return { ...p, lines }; })} style={{ flex: 2 }} />
            <Select value={line.inventoryItemId} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], inventoryItemId: e.target.value }; return { ...p, lines }; })} style={{ flex: 2 }}>
              <option value="">Item de estoque (opcional)</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput placeholder="Qtd" value={line.quantity} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], quantity: e.target.value }; return { ...p, lines }; })} style={{ flex: 1 }} />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setForm((p) => ({ ...p, lines: [...p.lines, { description: "", inventoryItemId: "", quantity: "" }] }))}>+ Adicionar item</Button>
      </Modal>

      <Modal
        open={Boolean(quoteModal)}
        onClose={() => setQuoteModal(null)}
        title="Cotação (RFQ)"
        footer={<Button variant="secondary" onClick={() => setQuoteModal(null)}>Fechar</Button>}
      >
        {quoteModal ? (
          <>
            <p style={{ marginBottom: 12 }}><strong>Itens da requisição:</strong> {quoteModal.request.items.map((it) => it.description).join(", ")}</p>
            <FormField label="Fornecedor (ID da pessoa)" required>
              <Input value={offerForm.supplierPersonId} onChange={(e) => setOfferForm((p) => ({ ...p, supplierPersonId: e.target.value }))} />
            </FormField>
            {quoteModal.request.items.map((it) => (
              <FormField key={it.id} label={`Preço unitário — ${it.description}`}>
                <DecimalInput value={offerForm.prices[it.id] || ""} onChange={(e) => setOfferForm((p) => ({ ...p, prices: { ...p.prices, [it.id]: e.target.value } }))} />
              </FormField>
            ))}
            <Button size="sm" onClick={handleSubmitOffer} loading={saving} disabled={!offerForm.supplierPersonId.trim()}>Submeter oferta</Button>

            {quoteModal.offers.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <strong>Comparação (mais barato primeiro):</strong>
                {quoteModal.offers.map((offer) => (
                  <div key={offer.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>{offer.supplierPersonId}</span>
                    <span>{formatBRL(offer.totalAmount)}</span>
                    <Button size="sm" onClick={() => handleAward(offer.id)} loading={saving}>Adjudicar</Button>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
