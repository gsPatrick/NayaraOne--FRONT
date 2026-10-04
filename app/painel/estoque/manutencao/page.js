"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { listMaintenanceOrders, closeMaintenanceOrder, listAssets } from "@/lib/api/inventory";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Aberta", CLOSED: "Fechada" };
const STATUS_TONE = { OPEN: "warning", CLOSED: "success" };

export default function ManutencaoPage() {
  const [orders, setOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listMaintenanceOrders(), listAssets()])
      .then(([o, a]) => {
        setOrders(o || []);
        setAssets(a || []);
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

  function assetName(id) {
    return assets.find((a) => a.id === id)?.name || "—";
  }

  const columns = [
    { key: "asset", label: "Patrimônio", width: "28%", render: (row) => assetName(row.assetId) },
    { key: "description", label: "Descrição", width: "30%", render: (row) => row.description || "—" },
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "opened", label: "Aberta em", width: "16%", render: (row) => formatDateTime(row.openedAt || row.opened_at) },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (row.status === "OPEN" ? (
        <Button size="sm" onClick={() => handleClose(row.id)} loading={busyId === row.id}>Fechar OS</Button>
      ) : null),
    },
  ];

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

      <Card title="Ordens de manutenção" subtitle="Abertas automaticamente na devolução de ferramenta danificada">
        <Table columns={columns} rows={loading ? [] : orders} loading={loading} emptyMessage="Nenhuma ordem de manutenção registrada." />
      </Card>
    </AppShell>
  );
}
