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
import { listAssets, createAsset, transferAsset, loanTool, returnTool, listInventoryLocations } from "@/lib/api/inventory";
import { formatBRL, formatDate, toNumber } from "@/lib/format";

const STATUS_LABELS = { AVAILABLE: "Disponível", IN_USE: "Em uso", LOANED: "Emprestado", MAINTENANCE: "Em manutenção" };
const STATUS_TONE = { AVAILABLE: "success", IN_USE: "info", LOANED: "warning", MAINTENANCE: "danger" };

export default function PatrimonioPage() {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", assetTag: "", currentLocationId: "", acquisitionValue: "" });

  const [transferTarget, setTransferTarget] = useState(null);
  const [transferLocationId, setTransferLocationId] = useState("");

  const [loanTarget, setLoanTarget] = useState(null);
  const [loanPersonId, setLoanPersonId] = useState("");
  const [loanDueAt, setLoanDueAt] = useState("");

  const [returnTarget, setReturnTarget] = useState(null);
  const [returnCondition, setReturnCondition] = useState("OK");

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listAssets(), listInventoryLocations()])
      .then(([a, l]) => {
        setAssets(a || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o patrimônio."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    setActionError("");
    try {
      await createAsset({
        name: form.name,
        assetTag: form.assetTag || undefined,
        currentLocationId: form.currentLocationId || undefined,
        acquisitionValue: form.acquisitionValue ? toNumber(form.acquisitionValue) : undefined,
      });
      setCreateOpen(false);
      setForm({ name: "", assetTag: "", currentLocationId: "", acquisitionValue: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cadastrar o patrimônio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer() {
    setBusyId(transferTarget.id);
    setActionError("");
    try {
      await transferAsset(transferTarget.id, { destinationLocationId: transferLocationId });
      setTransferTarget(null);
      setTransferLocationId("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível transferir o patrimônio.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLoan() {
    setBusyId(loanTarget.id);
    setActionError("");
    try {
      await loanTool(loanTarget.id, { personUserId: loanPersonId, dueAt: loanDueAt || undefined });
      setLoanTarget(null);
      setLoanPersonId("");
      setLoanDueAt("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível emprestar a ferramenta.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReturn() {
    setBusyId(returnTarget.id);
    setActionError("");
    try {
      // returnTarget aqui é o asset — na API o return é pelo loanId, então buscamos via lista de loans.
      const { listToolLoans } = await import("@/lib/api/inventory");
      const loans = await listToolLoans({ assetId: returnTarget.id });
      const openLoan = loans.find((l) => l.status === "OPEN" || l.status === "OVERDUE");
      if (!openLoan) throw new Error("Nenhum empréstimo aberto encontrado para este patrimônio.");
      await returnTool(openLoan.id, { conditionCode: returnCondition });
      setReturnTarget(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível devolver a ferramenta.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  const columns = [
    { key: "tag", label: "QR / Tag", width: "14%", render: (row) => row.assetTag || "—" },
    { key: "name", label: "Nome", width: "22%" },
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status] || row.status}</Badge> },
    { key: "location", label: "Local", width: "16%", render: (row) => (row.currentLocationId ? locationName(row.currentLocationId) : "—") },
    { key: "value", label: "Valor aquisição", width: "12%", render: (row) => (row.acquisitionValue != null ? formatBRL(row.acquisitionValue) : "—") },
    {
      key: "actions",
      label: "",
      width: "22%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" onClick={() => setTransferTarget(row)}>Transferir</Button>
          {row.status === "AVAILABLE" ? (
            <Button size="sm" onClick={() => setLoanTarget(row)}>Emprestar</Button>
          ) : row.status === "LOANED" ? (
            <Button size="sm" variant="secondary" onClick={() => setReturnTarget(row)}>Devolver</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Patrimônio & QR Code" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o patrimônio">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Patrimônio" subtitle="Ferramentas e ativos individualizáveis por QR Code">
        <Table columns={columns} rows={loading ? [] : assets} loading={loading} emptyMessage="Nenhum patrimônio cadastrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Novo patrimônio
        </Button>
      </StickyActionBar>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo patrimônio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.name.trim()}>Criar</Button>
          </>
        }
      >
        <FormField label="Nome" required>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </FormField>
        <FormField label="Tag / QR Code" helper="Código único — bloqueia duplicidade (EST-TS-04).">
          <Input value={form.assetTag} onChange={(e) => setForm((p) => ({ ...p, assetTag: e.target.value }))} />
        </FormField>
        <FormField label="Local atual">
          <Select value={form.currentLocationId} onChange={(e) => setForm((p) => ({ ...p, currentLocationId: e.target.value }))}>
            <option value="">Nenhum</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Valor de aquisição (R$)">
          <DecimalInput value={form.acquisitionValue} onChange={(e) => setForm((p) => ({ ...p, acquisitionValue: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        title="Transferir patrimônio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferTarget(null)}>Cancelar</Button>
            <Button onClick={handleTransfer} loading={busyId === transferTarget?.id} disabled={!transferLocationId}>Transferir</Button>
          </>
        }
      >
        <FormField label="Novo local" required>
          <Select value={transferLocationId} onChange={(e) => setTransferLocationId(e.target.value)}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
      </Modal>

      <Modal
        open={Boolean(loanTarget)}
        onClose={() => setLoanTarget(null)}
        title="Emprestar ferramenta"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLoanTarget(null)}>Cancelar</Button>
            <Button onClick={handleLoan} loading={busyId === loanTarget?.id} disabled={!loanPersonId.trim()}>Emprestar</Button>
          </>
        }
      >
        <FormField label="Responsável (ID do usuário)" required>
          <Input value={loanPersonId} onChange={(e) => setLoanPersonId(e.target.value)} />
        </FormField>
        <FormField label="Data prevista de devolução">
          <Input type="date" value={loanDueAt} onChange={(e) => setLoanDueAt(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        title="Devolver ferramenta"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancelar</Button>
            <Button onClick={handleReturn} loading={busyId === returnTarget?.id}>Devolver</Button>
          </>
        }
      >
        <FormField label="Condição" required helper="DANIFICADA abre ordem de manutenção automaticamente.">
          <Select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
            <option value="OK">OK</option>
            <option value="DAMAGED">Danificada</option>
          </Select>
        </FormField>
      </Modal>
    </AppShell>
  );
}
