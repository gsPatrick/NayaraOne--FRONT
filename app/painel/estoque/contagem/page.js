"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { listCounts, openCount, listInventoryLocations } from "@/lib/api/inventory";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Em contagem", COMPLETED: "Fechado" };
const STATUS_TONE = { OPEN: "warning", COMPLETED: "success" };

export default function ContagemPage() {
  const router = useRouter();
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [newLocationId, setNewLocationId] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listCounts(), listInventoryLocations()])
      .then(([c, l]) => {
        setCounts(c || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os inventários."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const newLocation = locations.find((l) => l.id === newLocationId);
  const newLocationNeedsProject = newLocation?.locationType === "PROJECT_SITE";

  async function handleOpenCount() {
    if (!newLocationId || (newLocationNeedsProject && !newLocation?.project)) return;
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

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "Sem local definido";
  }
  const columns = [
    { key: "location", label: "Local", width: "30%", render: (row) => locationName(row.locationId) },
    { key: "status", label: "Status", width: "20%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Aberto em", width: "26%", render: (row) => formatDateTime(row.created_at) },
    { key: "actions", label: "", width: "24%", render: (row) => <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/estoque/contagem/${row.id}`)}>Abrir</Button> },
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

      <Card title="Contagens" subtitle="Local em contagem aberta fica congelado para movimentações. Fechamento nunca altera saldo direto — ajuste é um ato separado e aprovado">
        <Table columns={columns} rows={loading ? [] : counts} loading={loading} emptyMessage="Nenhum inventário aberto." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setOpenModalOpen(true)}>
          <Icon name="plus" size={18} /> Abrir inventário
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Abrir inventário físico"
        footer={
          locations.length === 0 ? (
            <Button variant="secondary" onClick={() => setOpenModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpenModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleOpenCount} loading={saving} disabled={!newLocationId || (newLocationNeedsProject && !newLocation?.project)}>Abrir</Button>
            </>
          )
        }
      >
        {locations.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="mapPin" title="Nenhum local de estoque cadastrado" description="Você precisa cadastrar pelo menos um local antes de abrir um inventário físico." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar local agora</Button>
          </div>
        ) : (
        <>
        {/* Caderno §10 — freeze lógico: enquanto a contagem estiver OPEN, a API bloqueia qualquer
            movimento (entrada, saída, transferência, ajuste, baixa de requisição, recebimento)
            que toque este local (INVENTORY_LOCATION_FROZEN_BY_COUNT). */}
        <Alert tone="warning">
          Enquanto este inventário estiver aberto, o local fica congelado: nenhuma movimentação de estoque nele é aceita até a contagem ser concluída.
        </Alert>
        <FormField label="Local" required>
          <Select value={newLocationId} onChange={(e) => setNewLocationId(e.target.value)}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        {newLocationNeedsProject ? (
          newLocation?.project ? (
            // Achado real (auditoria Marco 7, rodada final): a obra era pedida de novo aqui,
            // podendo divergir da obra real já vinculada ao canteiro no cadastro. A obra do
            // canteiro é sempre a fonte de verdade — mostramos, não pedimos de novo.
            <FormField label="Obra" helper="Preenchida automaticamente pelo cadastro do canteiro.">
              <Input value={newLocation.project.name} disabled readOnly />
            </FormField>
          ) : (
            <Alert tone="danger">
              Este canteiro ainda não está vinculado a uma obra no cadastro. Vincule a obra no cadastro do local antes de abrir o inventário aqui.
            </Alert>
          )
        ) : null}
        </>
        )}
      </Modal>
    </AppShell>
  );
}
