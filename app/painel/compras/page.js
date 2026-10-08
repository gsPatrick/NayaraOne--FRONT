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
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import {
  listPurchaseRequests, getPurchaseRequest, createPurchaseRequest, decidePurchaseRequest,
  createQuotation, submitSupplierOffer, compareOffers, awardSupplierOffer,
} from "@/lib/api/procurement";
import { listInventoryItems } from "@/lib/api/inventory";
import { listProjects } from "@/lib/api/construction";
import { formatDateTime, formatBRL, toNumber } from "@/lib/format";

const STATUS_LABELS = { REQUESTED: "Solicitada", APPROVED: "Aprovada", REJECTED: "Rejeitada", AWARDED: "Adjudicada", CLOSED: "Fechada" };
const STATUS_TONE = { REQUESTED: "neutral", APPROVED: "info", REJECTED: "danger", AWARDED: "success", CLOSED: "success" };

export default function ComprasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 50, 2026-10-05): o backend aceita
  // projectId/notes na requisição de compra desde sempre, mas o formulário nunca os enviava —
  // perdendo a rastreabilidade de custo por obra que o fluxo RFQ->PO->recebimento deveria
  // alimentar (igual ao módulo de requisições de Estoque, que já tem esse seletor).
  const [form, setForm] = useState({ projectId: "", notes: "", lines: [{ description: "", inventoryItemId: "", quantity: "" }] });

  const [quoteModal, setQuoteModal] = useState(null); // { request, quotation, offers }
  const [offerForm, setOfferForm] = useState({ supplierPersonId: "", supplierPersonName: "", prices: {} });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listPurchaseRequests(), listInventoryItems(), listProjects()])
      .then(([r, i, p]) => {
        setRequests(r || []);
        setItems(i || []);
        setProjects(p || []);
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
        projectId: form.projectId || undefined,
        notes: form.notes || undefined,
        items: form.lines.map((l) => ({ description: l.description, inventoryItemId: l.inventoryItemId || undefined, quantity: toNumber(l.quantity) })),
      });
      setCreateOpen(false);
      setForm({ projectId: "", notes: "", lines: [{ description: "", inventoryItemId: "", quantity: "" }] });
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
    const isApprove = decision === "APPROVED";
    const ok = await confirm({
      title: isApprove ? "Aprovar requisição de compra?" : "Rejeitar requisição de compra?",
      message: isApprove
        ? "A requisição será aprovada e liberada para cotação com fornecedores."
        : "A requisição será rejeitada e não poderá mais seguir para cotação.",
      confirmLabel: isApprove ? "Aprovar" : "Rejeitar",
      tone: isApprove ? "primary" : "danger",
    });
    if (!ok) return;

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
      // BUG REAL CORRIGIDO (auditoria E2E ciclo 5): createQuotation agora reaproveita a OPEN
      // existente (fix no backend), mas o front também precisa carregar as ofertas já
      // submetidas nela — senão reabrir o modal (reload, nova sessão) mostrava a comparação
      // vazia mesmo com ofertas reais já registradas.
      const offers = await compareOffers(quotation.id).catch(() => []);
      setQuoteModal({ request: fullRequest, quotation, offers });
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
      setOfferForm({ supplierPersonId: "", supplierPersonName: "", prices: {} });
    } catch (err) {
      setActionError(err?.message || "Não foi possível submeter a oferta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAward(offer) {
    const ok = await confirm({
      title: "Adjudicar esta oferta?",
      message: `A oferta de ${offer.supplierPersonName || offer.supplierPersonId} (${formatBRL(offer.totalAmount)}) será adjudicada e a requisição seguirá para pedido de compra. As demais ofertas desta cotação serão descartadas.`,
      confirmLabel: "Adjudicar",
    });
    if (!ok) return;

    setSaving(true);
    setActionError("");
    try {
      await awardSupplierOffer(offer.id);
      setQuoteModal(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível adjudicar a oferta.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "status", label: "Status", width: "18%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criada em", width: "28%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "30%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
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
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

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
        <FormField label="Obra vinculada (opcional)">
          <Select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}>
            <option value="">Nenhuma — compra não vinculada a obra</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Observações (opcional)">
          <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </FormField>
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {/* FIX (auditoria de acessibilidade mobile, Marco 7): estes três campos dependiam só
               do placeholder (some ao digitar e não é lido por leitor de tela). aria-label com o
               índice da linha torna cada campo identificável mesmo sem um <label> visível, já
               que aqui são linhas repetidas sem espaço pra um FormField por campo. */}
            <Input aria-label={`Descrição do item ${idx + 1}`} placeholder="Descrição" value={line.description} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], description: e.target.value }; return { ...p, lines }; })} style={{ flex: 2 }} />
            <Select aria-label={`Item de estoque da linha ${idx + 1} (opcional)`} value={line.inventoryItemId} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], inventoryItemId: e.target.value }; return { ...p, lines }; })} style={{ flex: 2 }}>
              <option value="">Item de estoque (opcional)</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput aria-label={`Quantidade do item ${idx + 1}`} placeholder="Qtd" value={line.quantity} onChange={(e) => setForm((p) => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], quantity: e.target.value }; return { ...p, lines }; })} style={{ flex: 1 }} />
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
            {/* BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 61, 2026-10-06): campo de
                texto livre pra UUID de fornecedor — trocado pelo PersonPicker já padrão em
                CRM/Imóveis/Radar, que resolve nome -> personId de verdade. */}
            <FormField label="Fornecedor" required>
              <PersonPicker
                id="offer-supplier"
                value={offerForm.supplierPersonName}
                personId={offerForm.supplierPersonId}
                placeholder="Buscar fornecedor pelo nome..."
                onSelect={({ name, personId }) => setOfferForm((p) => ({ ...p, supplierPersonName: name, supplierPersonId: personId || "" }))}
              />
            </FormField>
            {quoteModal.request.items.map((it) => (
              <FormField key={it.id} label={`Preço unitário — ${it.description}`}>
                <DecimalInput value={offerForm.prices[it.id] || ""} onChange={(e) => setOfferForm((p) => ({ ...p, prices: { ...p.prices, [it.id]: e.target.value } }))} />
              </FormField>
            ))}
            <Button size="sm" onClick={handleSubmitOffer} loading={saving} disabled={!offerForm.supplierPersonId.trim()}>Submeter oferta</Button>

            {quoteModal.offers.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <strong>Comparação (mais barato primeiro):</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {quoteModal.offers.map((offer) => (
                    <div
                      key={offer.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.supplierPersonName || offer.supplierPersonId}</span>
                        <strong>{formatBRL(offer.totalAmount)}</strong>
                        {/* BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 52, 2026-10-05):
                            compareOffers já inclui offer.items (preço unitário por item da
                            requisição), mas só o total agregado era exibido — impossível
                            comparar "fornecedor A mais barato no item X, mais caro no item Y". */}
                        {Array.isArray(offer.items) && offer.items.length > 0 ? (
                          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "var(--text-body-sm)", color: "var(--color-ink-muted)" }}>
                            {offer.items.map((oi) => {
                              const reqItem = quoteModal.request.items.find((it) => it.id === oi.purchaseRequestItemId);
                              return (
                                <li key={oi.id}>{reqItem?.description || oi.purchaseRequestItemId}: {formatBRL(oi.unitPrice)}</li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </div>
                      <Button size="sm" onClick={() => handleAward(offer)} loading={saving} style={{ flexShrink: 0 }}>
                        Adjudicar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
