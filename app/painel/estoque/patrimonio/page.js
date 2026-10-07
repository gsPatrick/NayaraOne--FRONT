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
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { listAssets, createAsset, updateAsset, transferAsset, listAssetMovements, loanTool, returnTool, listInventoryLocations, getAssetByTag } from "@/lib/api/inventory";
import { apiFetch } from "@/lib/api/client";
import { formatBRL, formatDate, toNumber } from "@/lib/format";

const STATUS_LABELS = { AVAILABLE: "Disponível", IN_USE: "Em uso", LOANED: "Emprestado", MAINTENANCE: "Em manutenção", LOST: "Perdido/extraviado" };
const STATUS_TONE = { AVAILABLE: "success", IN_USE: "info", LOANED: "warning", MAINTENANCE: "danger", LOST: "danger" };

export default function PatrimonioPage() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 34, 2026-10-05): GET /assets/by-tag
  // existia na API (e no client) mas nenhuma tela chamava — a própria finalidade do QR Code
  // (escanear/digitar a tag e localizar o ativo na hora) nunca estava disponível na UI.
  const [tagQuery, setTagQuery] = useState("");
  const [tagSearchError, setTagSearchError] = useState("");
  const [tagSearchResult, setTagSearchResult] = useState(null);
  const [searchingTag, setSearchingTag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 50, 2026-10-05): o contrato lista
  // "aquisição... garantia" como campos do Asset — o backend já aceitava acquiredAt/
  // warrantyUntil, mas o formulário nunca os enviava, e não havia forma de editar depois.
  const [form, setForm] = useState({ name: "", assetTag: "", currentLocationId: "", acquisitionValue: "", acquiredAt: "", warrantyUntil: "" });
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ acquisitionValue: "", acquiredAt: "", warrantyUntil: "" });

  const [transferTarget, setTransferTarget] = useState(null);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 52, 2026-10-05): o contrato exige
  // rastrear o histórico de transferência de localização/custodiante do patrimônio
  // (inventory.asset_movements), e toda transferência já gerava esse registro — mas não havia
  // forma de ler o histórico de volta pra tela.
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyMovements, setHistoryMovements] = useState([]);
  const [historyError, setHistoryError] = useState("");

  async function openHistory(row) {
    setHistoryTarget(row);
    setHistoryError("");
    try {
      const movements = await listAssetMovements(row.id);
      setHistoryMovements(movements || []);
    } catch (err) {
      setHistoryError(err?.message || "Não foi possível carregar o histórico.");
    }
  }
  const [transferLocationId, setTransferLocationId] = useState("");

  const [loanTarget, setLoanTarget] = useState(null);
  const [loanPersonId, setLoanPersonId] = useState("");
  const [loanDueAt, setLoanDueAt] = useState("");

  const [returnTarget, setReturnTarget] = useState(null);
  const [returnCondition, setReturnCondition] = useState("OK");

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listAssets(), listInventoryLocations(), apiFetch("/users")])
      .then(([a, l, u]) => {
        setAssets(a || []);
        setLocations(l || []);
        setUsers(u || []);
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
        acquiredAt: form.acquiredAt || undefined,
        warrantyUntil: form.warrantyUntil || undefined,
      });
      setCreateOpen(false);
      setForm({ name: "", assetTag: "", currentLocationId: "", acquisitionValue: "", acquiredAt: "", warrantyUntil: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cadastrar o patrimônio.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setEditForm({
      acquisitionValue: row.acquisitionValue != null ? String(row.acquisitionValue) : "",
      acquiredAt: row.acquiredAt ? String(row.acquiredAt).slice(0, 10) : "",
      warrantyUntil: row.warrantyUntil ? String(row.warrantyUntil).slice(0, 10) : "",
    });
    setEditTarget(row);
  }

  async function handleEdit() {
    setSaving(true);
    setActionError("");
    try {
      await updateAsset(editTarget.id, {
        acquisitionValue: editForm.acquisitionValue ? toNumber(editForm.acquisitionValue) : null,
        acquiredAt: editForm.acquiredAt || null,
        warrantyUntil: editForm.warrantyUntil || null,
      });
      setEditTarget(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o patrimônio.");
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

  async function handleSearchByTag() {
    if (!tagQuery.trim()) return;
    setSearchingTag(true);
    setTagSearchError("");
    setTagSearchResult(null);
    try {
      const asset = await getAssetByTag(tagQuery.trim());
      setTagSearchResult(asset);
    } catch (err) {
      setTagSearchError(err?.message || "Nenhum patrimônio encontrado com essa tag/QR Code.");
    } finally {
      setSearchingTag(false);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 24, 2026-10-05): o backend sempre
  // manteve/atualizou assignedToUserId corretamente (inclusive as correções das rodadas 21/22),
  // mas a tela nunca exibia o custodiante — rastreabilidade de posse via QR Code (escopo
  // contratado de Patrimônio) ficava invisível pro usuário, que precisaria abrir a lista de
  // empréstimos manualmente pra saber quem está com a ferramenta.
  const columns = [
    { key: "tag", label: "QR / Tag", width: "12%", render: (row) => row.assetTag || "—" },
    { key: "name", label: "Nome", width: "18%" },
    { key: "status", label: "Status", width: "12%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status] || row.status}</Badge> },
    { key: "custodian", label: "Custodiante", width: "14%", render: (row) => (row.assignedToUserId ? userName(row.assignedToUserId) : "—") },
    { key: "location", label: "Local", width: "14%", render: (row) => (row.currentLocationId ? locationName(row.currentLocationId) : "—") },
    { key: "value", label: "Valor aquisição", width: "12%", render: (row) => (row.acquisitionValue != null ? formatBRL(row.acquisitionValue) : "—") },
    {
      key: "actions",
      label: "",
      width: "18%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Editar</Button>
          <Button size="sm" variant="secondary" onClick={() => openHistory(row)}>Histórico</Button>
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
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Buscar por QR Code / Tag" subtitle="Escaneie ou digite a tag impressa no patrimônio para localizá-lo na hora">
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <Input
              placeholder="Ex.: TOOL-00123"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearchByTag(); }}
            />
          </div>
          <Button onClick={handleSearchByTag} loading={searchingTag}>Buscar</Button>
        </div>
        {tagSearchError ? <Alert tone="danger" style={{ marginTop: 12 }}>{tagSearchError}</Alert> : null}
        {tagSearchResult ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>{tagSearchResult.name}</strong>
            <span>
              <Badge tone={STATUS_TONE[tagSearchResult.status]}>{STATUS_LABELS[tagSearchResult.status] || tagSearchResult.status}</Badge>
              {" — "}Custodiante: {tagSearchResult.assignedToUserId ? userName(tagSearchResult.assignedToUserId) : "—"}
              {" — "}Local: {tagSearchResult.currentLocationId ? locationName(tagSearchResult.currentLocationId) : "—"}
            </span>
          </div>
        ) : null}
      </Card>

      <Card title="Patrimônio" subtitle="Ferramentas e ativos individualizáveis por QR Code">
        <Table columns={columns} rows={loading ? [] : assets} loading={loading} emptyMessage="Nenhum patrimônio cadastrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Novo patrimônio
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
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
        <FormField
          label="Local atual"
          helper={locations.length === 0 ? "Nenhum local cadastrado ainda — você pode criar o patrimônio sem local e transferir depois, ou cadastrar um local primeiro." : undefined}
        >
          {locations.length === 0 ? (
            <Button variant="secondary" size="sm" onClick={() => router.push("/painel/estoque")} style={{ alignSelf: "flex-start" }}>
              Cadastrar local
            </Button>
          ) : (
            <Select value={form.currentLocationId} onChange={(e) => setForm((p) => ({ ...p, currentLocationId: e.target.value }))}>
              <option value="">Nenhum</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Valor de aquisição (R$)">
          <DecimalInput value={form.acquisitionValue} onChange={(e) => setForm((p) => ({ ...p, acquisitionValue: e.target.value }))} />
        </FormField>
        <FormField label="Data de aquisição">
          <Input type="date" value={form.acquiredAt} onChange={(e) => setForm((p) => ({ ...p, acquiredAt: e.target.value }))} />
        </FormField>
        <FormField label="Garantia até">
          <Input type="date" value={form.warrantyUntil} onChange={(e) => setForm((p) => ({ ...p, warrantyUntil: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Editar patrimônio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleEdit} loading={saving}>Salvar</Button>
          </>
        }
      >
        <FormField label="Valor de aquisição (R$)">
          <DecimalInput value={editForm.acquisitionValue} onChange={(e) => setEditForm((p) => ({ ...p, acquisitionValue: e.target.value }))} />
        </FormField>
        <FormField label="Data de aquisição">
          <Input type="date" value={editForm.acquiredAt} onChange={(e) => setEditForm((p) => ({ ...p, acquiredAt: e.target.value }))} />
        </FormField>
        <FormField label="Garantia até">
          <Input type="date" value={editForm.warrantyUntil} onChange={(e) => setEditForm((p) => ({ ...p, warrantyUntil: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(historyTarget)}
        onClose={() => { setHistoryTarget(null); setHistoryMovements([]); }}
        title={`Histórico — ${historyTarget?.name || ""}`}
        footer={<Button variant="secondary" onClick={() => { setHistoryTarget(null); setHistoryMovements([]); }}>Fechar</Button>}
      >
        {historyError ? <Alert tone="danger">{historyError}</Alert> : null}
        {historyMovements.length === 0 ? (
          <p style={{ color: "var(--color-ink-muted)" }}>Nenhuma transferência registrada ainda.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {historyMovements.map((m) => (
              <li key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div>{formatDate(m.movedAt || m.moved_at)}</div>
                <div style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>
                  Local: {locationName(m.sourceLocationId)} → {locationName(m.destinationLocationId)}
                  {" · "}Custodiante: {m.sourceCustodianUserId ? userName(m.sourceCustodianUserId) : "—"} → {m.destinationCustodianUserId ? userName(m.destinationCustodianUserId) : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        size="lg"
        open={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        title="Transferir patrimônio"
        footer={
          locations.length === 0 ? (
            <Button variant="secondary" onClick={() => setTransferTarget(null)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setTransferTarget(null)}>Cancelar</Button>
              <Button onClick={handleTransfer} loading={busyId === transferTarget?.id} disabled={!transferLocationId}>Transferir</Button>
            </>
          )
        }
      >
        {locations.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="mapPin" title="Nenhum local de estoque cadastrado" description="Você precisa cadastrar pelo menos um local antes de transferir este patrimônio." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar local agora</Button>
          </div>
        ) : (
        <FormField label="Novo local" required>
          <Select value={transferLocationId} onChange={(e) => setTransferLocationId(e.target.value)}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        )}
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
