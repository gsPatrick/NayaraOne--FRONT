"use client";

import { useEffect, useState } from "react";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
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
import { listLossCases, openLossCase, decideLossCase, listInventoryItems, listInventoryLocations, listAssets } from "@/lib/api/inventory";
import { formatBRL, formatDateTime, toNumber } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Em análise", APPROVED: "Aprovada (baixa gerada)", REJECTED: "Rejeitada" };
const STATUS_TONE = { OPEN: "warning", APPROVED: "danger", REJECTED: "neutral" };

export default function PerdasPage() {
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 49, 2026-10-05): o back-end já
  // suporta declarar perda de um Asset/patrimônio (assetId), com lógica própria pra marcar
  // LOST/limpar custodiante/fechar empréstimos (R28/R30) — mas esta tela só permitia perda de
  // item de estoque (inventoryItemId). "targetType" alterna o formulário entre os dois modos.
  const [targetType, setTargetType] = useState("ITEM"); // ITEM | ASSET
  const [form, setForm] = useState({ inventoryItemId: "", assetId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "" });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listLossCases(), listInventoryItems(), listInventoryLocations(), listAssets()])
      .then(([c, i, l, a]) => {
        setCases(c || []);
        setItems(i || []);
        setLocations(l || []);
        setAssets(a || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos de perda."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const evidenceIds = form.evidenceFileIds.split(",").map((s) => s.trim()).filter(Boolean);
  const isValid = targetType === "ITEM"
    ? form.inventoryItemId && form.locationId && !Number.isNaN(toNumber(form.quantity)) && toNumber(form.quantity) > 0 && form.context.trim() && evidenceIds.length > 0
    : form.assetId && form.context.trim() && evidenceIds.length > 0;

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await openLossCase({
        inventoryItemId: targetType === "ITEM" ? form.inventoryItemId : undefined,
        assetId: targetType === "ASSET" ? form.assetId : undefined,
        locationId: targetType === "ITEM" ? (form.locationId || undefined) : undefined,
        quantity: targetType === "ITEM" ? toNumber(form.quantity) : undefined,
        context: form.context,
        evidenceFileIds: evidenceIds,
        estimatedCost: form.estimatedCost ? toNumber(form.estimatedCost) : undefined,
      });
      setModalOpen(false);
      setForm({ inventoryItemId: "", assetId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "" });
      setTargetType("ITEM");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o caso de perda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, decision) {
    const isApprove = decision === "APPROVED";
    const ok = await confirm({
      title: isApprove ? "Aprovar esta baixa de perda?" : "Rejeitar este caso de perda?",
      message: isApprove
        ? "O estoque será baixado definitivamente para este item."
        : "O caso será rejeitado e o estoque não será baixado.",
      confirmLabel: isApprove ? "Aprovar baixa" : "Rejeitar",
      tone: isApprove ? "danger" : "primary",
    });
    if (!ok) return;
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

  function assetName(id) {
    const asset = assets.find((a) => a.id === id);
    return asset ? `${asset.name}${asset.assetTag ? ` (${asset.assetTag})` : ""}` : "—";
  }

  const columns = [
    { key: "item", label: "Item", width: "17%", render: (row) => (row.inventoryItemId ? itemName(row.inventoryItemId) : assetName(row.assetId)) },
    { key: "qty", label: "Quantidade", width: "10%", render: (row) => row.quantity || "—" },
    { key: "context", label: "Contexto", width: "21%" },
    { key: "estimate", label: "Estimativa", width: "12%", render: (row) => (row.estimatedCost != null ? formatBRL(row.estimatedCost) : "—") },
    { key: "status", label: "Status", width: "26%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    {
      key: "actions",
      label: "",
      width: "14%",
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
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

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
        <FormField label="Tipo" required>
          <Select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            <option value="ITEM">Item de estoque (consumível)</option>
            <option value="ASSET">Patrimônio (ferramenta/equipamento)</option>
          </Select>
        </FormField>
        {targetType === "ITEM" ? (
          <>
            <FormField label="Item" required>
              <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
                <option value="">Selecione...</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Local" required helper="Obrigatório — necessário para aprovar a baixa depois (gera o movimento LOSS nesse local).">
              <Select value={form.locationId} onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>
                <option value="">Selecione...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantidade perdida" required>
              <DecimalInput value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </FormField>
          </>
        ) : (
          <FormField label="Patrimônio" required helper="Ao aprovar, o ativo é marcado como perdido/extraviado (LOST), o custodiante é limpo e qualquer empréstimo em aberto é fechado.">
            <Select value={form.assetId} onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}>
              <option value="">Selecione...</option>
              {assets.filter((a) => a.status !== "LOST").map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.assetTag ? ` (${a.assetTag})` : ""}</option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Contexto" required helper="O que aconteceu — obrigatório para auditoria.">
          <Input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} />
        </FormField>
        <FormField label="IDs de evidência (arquivo)" required helper="Pelo menos um arquivo de evidência é obrigatório (EST-TS-10). Separe por vírgula.">
          <Input value={form.evidenceFileIds} onChange={(e) => setForm((p) => ({ ...p, evidenceFileIds: e.target.value }))} />
        </FormField>
        <FormField label="Estimativa de custo (R$)">
          <DecimalInput value={form.estimatedCost} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))} />
        </FormField>
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
