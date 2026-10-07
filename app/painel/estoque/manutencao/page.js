"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Icon from "@/components/atoms/Icon/Icon";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import { listMaintenanceOrders, closeMaintenanceOrder, openMaintenanceOrder, listAssets } from "@/lib/api/inventory";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Aberta", CLOSED: "Fechada" };
const STATUS_TONE = { OPEN: "warning", CLOSED: "success" };

export default function ManutencaoPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ assetId: "", description: "" });

  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 53, 2026-10-05): a OS fechada só
  // mostrava a mesma data de abertura — closedAt (quando fechou) e quem abriu/fechou
  // (createdBy/updatedBy, já retornados pelo backend) nunca eram exibidos.
  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listMaintenanceOrders(), listAssets(), apiFetch("/users")])
      .then(([o, a, u]) => {
        setOrders(o || []);
        setAssets(a || []);
        setUsers(u || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as ordens de manutenção."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleClose(id) {
    setBusyId(id);
    setActionError("");
    try {
      await closeMaintenanceOrder(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar a ordem de manutenção.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpen() {
    if (!form.assetId) return;
    setSaving(true);
    setActionError("");
    try {
      await openMaintenanceOrder({ assetId: form.assetId, description: form.description || undefined });
      setOpenModal(false);
      setForm({ assetId: "", description: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir a ordem de manutenção.");
    } finally {
      setSaving(false);
    }
  }

  function assetName(id) {
    return assets.find((a) => a.id === id)?.name || "—";
  }

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  const columns = [
    { key: "asset", label: "Patrimônio", width: "20%", render: (row) => assetName(row.assetId) },
    { key: "description", label: "Descrição", width: "20%", render: (row) => row.description || "—" },
    { key: "status", label: "Status", width: "10%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "opened", label: "Aberta em", width: "14%", render: (row) => formatDateTime(row.openedAt || row.opened_at) },
    { key: "openedBy", label: "Aberta por", width: "12%", render: (row) => userName(row.createdBy) },
    {
      key: "closed",
      label: "Fechada em / por",
      width: "16%",
      render: (row) => (row.status === "CLOSED" ? `${formatDateTime(row.closedAt || row.closed_at)} — ${userName(row.updatedBy)}` : "—"),
    },
    {
      key: "actions",
      label: "",
      width: "8%",
      render: (row) => (row.status === "OPEN" ? (
        <Button size="sm" onClick={() => handleClose(row.id)} loading={busyId === row.id}>Fechar OS</Button>
      ) : null),
    },
  ];

  const availableAssets = assets.filter((a) => a.status === "AVAILABLE");

  return (
    <AppShell title="Manutenção de patrimônio" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as ordens de manutenção">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Ordens de manutenção" subtitle="Abertas automaticamente na devolução de ferramenta danificada, ou manualmente abaixo">
        <Table columns={columns} rows={loading ? [] : orders} loading={loading} emptyMessage="Nenhuma ordem de manutenção registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setOpenModal(true)}>
          <Icon name="plus" size={18} /> Abrir OS
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Abrir ordem de manutenção"
        footer={
          availableAssets.length === 0 ? (
            <Button variant="secondary" onClick={() => setOpenModal(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancelar</Button>
              <Button onClick={handleOpen} loading={saving} disabled={!form.assetId}>Abrir</Button>
            </>
          )
        }
      >
        {availableAssets.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="layers" title="Nenhum patrimônio disponível" description="Você precisa cadastrar um item de patrimônio com status Disponível antes de abrir uma ordem de manutenção." />
            <Button onClick={() => router.push("/painel/estoque/patrimonio")}>Cadastrar patrimônio agora</Button>
          </div>
        ) : (
        <>
        <FormField label="Patrimônio" required>
          <Select value={form.assetId} onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}>
            <option value="">Selecione...</option>
            {availableAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.assetTag ? ` (${a.assetTag})` : ""}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Descrição do problema">
          <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex.: Revisão preventiva programada" />
        </FormField>
        </>
        )}
      </Modal>
    </AppShell>
  );
}
