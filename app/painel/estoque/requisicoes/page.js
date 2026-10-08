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
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { useRouter } from "next/navigation";
import { listRequisitions, createRequisition, decideRequisition, issueRequisition, listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { listProjects, listProjectStages } from "@/lib/api/construction";
import { formatDateTime, toNumber } from "@/lib/format";

const STATUS_LABELS = { REQUESTED: "Solicitada", APPROVED: "Aprovada", REJECTED: "Rejeitada", ISSUED: "Entregue" };
const STATUS_TONE = { REQUESTED: "neutral", APPROVED: "info", REJECTED: "danger", ISSUED: "success" };

export default function RequisicoesPage() {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY_FORM = { warehouseLocationId: "", projectLocationId: "", projectId: "", stageId: "", lines: [{ inventoryItemId: "", quantity: "" }] };
  const [form, setForm] = useState(EMPTY_FORM);

  // GAP REAL CORRIGIDO (auditoria de conformidade contratual Marco 7, 2026-10-07): EST-004 —
  // "material atribuído à obra precisa de project_id/stage_id" — o backend aceitava stageId mas
  // o formulário nunca o enviava. Etapas vêm da obra selecionada (mesma API do módulo Obras).
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stagesError, setStagesError] = useState("");

  useEffect(() => {
    if (!form.projectId) {
      setStages([]);
      setStagesError("");
      return undefined;
    }
    let cancelled = false;
    setStagesLoading(true);
    setStagesError("");
    listProjectStages(form.projectId)
      .then((s) => { if (!cancelled) setStages(s || []); })
      .catch((err) => {
        if (cancelled) return;
        setStages([]);
        setStagesError(err?.message || "Não foi possível carregar as etapas desta obra.");
      })
      .finally(() => { if (!cancelled) setStagesLoading(false); });
    return () => { cancelled = true; };
  }, [form.projectId]);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listRequisitions(), listInventoryItems(), listInventoryLocations(), listProjects().catch(() => [])])
      .then(([r, i, l, p]) => {
        setRequisitions(r || []);
        setItems(i || []);
        setLocations(l || []);
        setProjects(p || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as requisições."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function updateLine(idx, field, value) {
    setForm((p) => {
      const lines = [...p.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...p, lines };
    });
  }

  // Obra com etapas cadastradas exige escolher a etapa (EST-004: project_id/stage_id). Obra sem
  // nenhuma etapa ainda segue permitida (a API trata stageId como opcional nesse caso).
  const stageRequired = Boolean(form.projectId) && stages.length > 0;
  const isValid =
    form.warehouseLocationId &&
    (!form.projectLocationId || form.projectId) &&
    (!stageRequired || form.stageId) &&
    !stagesLoading &&
    form.lines.every((l) => l.inventoryItemId && !Number.isNaN(toNumber(l.quantity)) && toNumber(l.quantity) > 0);

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await createRequisition({
        warehouseLocationId: form.warehouseLocationId,
        projectLocationId: form.projectLocationId || undefined,
        projectId: form.projectId || undefined,
        stageId: form.projectId && form.stageId ? form.stageId : undefined,
        items: form.lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: toNumber(l.quantity) })),
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a requisição.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, decision) {
    const isApprove = decision === "APPROVED";
    const ok = await confirm({
      title: isApprove ? "Aprovar esta requisição?" : "Rejeitar esta requisição?",
      message: isApprove
        ? "A requisição será aprovada e liberada para entrega/baixa de estoque."
        : "A requisição será rejeitada e não poderá mais ser entregue.",
      confirmLabel: isApprove ? "Aprovar" : "Rejeitar",
      tone: isApprove ? "primary" : "danger",
    });
    if (!ok) return;

    setBusyId(id);
    setActionError("");
    try {
      await decideRequisition(id, decision);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir a requisição.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleIssue(id) {
    const ok = await confirm({
      title: "Entregar esta requisição?",
      message: "O estoque será baixado para os itens desta requisição. Esta ação não pode ser desfeita.",
      confirmLabel: "Entregar",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    setActionError("");
    try {
      await issueRequisition(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível entregar a requisição.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  function itemName(id) {
    return items.find((i) => i.id === id)?.name || "—";
  }

  const hasWarehouse = locations.some((l) => l.locationType === "WAREHOUSE");
  const missingPrerequisite = items.length === 0 ? "item" : !hasWarehouse ? "almoxarifado" : null;

  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 53, 2026-10-05): listRequisitions
  // (backend) só retornava o registro agregado, nunca os itens — a tela nunca mostrava quais
  // itens/quantidades foram solicitados, só o status. Agora o backend inclui "items" e a tela
  // exibe um resumo por linha.
  const columns = [
    { key: "warehouse", label: "Almoxarifado", width: "16%", render: (row) => locationName(row.warehouseLocationId) },
    { key: "project", label: "Canteiro", width: "16%", render: (row) => (row.projectLocationId ? locationName(row.projectLocationId) : "—") },
    {
      key: "items",
      label: "Itens",
      width: "22%",
      render: (row) => (
        <span style={{ fontSize: "var(--text-body-sm)" }}>
          {(row.items || []).map((it) => `${itemName(it.inventoryItemId)} (${it.quantity})`).join(", ") || "—"}
        </span>
      ),
    },
    { key: "status", label: "Status", width: "12%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criada em", width: "16%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "18%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8 }}>
          {row.status === "REQUESTED" ? (
            <>
              <Button size="sm" onClick={() => handleDecide(row.id, "APPROVED")} loading={busyId === row.id}>Aprovar</Button>
              <Button size="sm" variant="danger" onClick={() => handleDecide(row.id, "REJECTED")} loading={busyId === row.id}>Rejeitar</Button>
            </>
          ) : null}
          {row.status === "APPROVED" ? (
            <Button size="sm" onClick={() => handleIssue(row.id)} loading={busyId === row.id}>Entregar (baixa)</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Requisições de material" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as requisições">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Requisições" subtitle="Solicitação → aprovação → baixa (OUT) por obra">
        <Table columns={columns} rows={loading ? [] : requisitions} loading={loading} emptyMessage="Nenhuma requisição registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Nova requisição
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova requisição de material"
        footer={
          missingPrerequisite ? (
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar</Button>
            </>
          )
        }
      >
        {missingPrerequisite ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState
              icon={missingPrerequisite === "item" ? "layers" : "mapPin"}
              title={missingPrerequisite === "item" ? "Nenhum item de estoque cadastrado" : "Nenhum almoxarifado cadastrado"}
              description={missingPrerequisite === "item"
                ? "Você precisa cadastrar pelo menos um item antes de criar uma requisição."
                : "Você precisa cadastrar pelo menos um local do tipo Almoxarifado antes de criar uma requisição."}
            />
            <Button onClick={() => router.push("/painel/estoque")}>{missingPrerequisite === "item" ? "Cadastrar item agora" : "Cadastrar local agora"}</Button>
          </div>
        ) : (
        <>
        <FormField label="Almoxarifado (origem)" required>
          <Select value={form.warehouseLocationId} onChange={(e) => setForm((p) => ({ ...p, warehouseLocationId: e.target.value }))}>
            <option value="">Selecione...</option>
            {locations.filter((l) => l.locationType === "WAREHOUSE").map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Canteiro (destino)" helper="Opcional — se informado, exige selecionar a obra abaixo (EST-004).">
          <Select
            value={form.projectLocationId}
            onChange={(e) => {
              const value = e.target.value;
              // Sem canteiro não há vínculo com obra — a API recusa projectId sem projectLocationId,
              // então limpar o canteiro limpa obra/etapa junto.
              setForm((p) => ({ ...p, projectLocationId: value, ...(value ? {} : { projectId: "", stageId: "" }) }));
            }}
          >
            <option value="">Nenhum</option>
            {locations.filter((l) => l.locationType === "PROJECT_SITE").map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        {form.projectLocationId ? (
          <FormField label="Obra" required>
            <Select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value, stageId: "" }))}>
              <option value="">Selecione...</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>{pr.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {form.projectLocationId && form.projectId ? (
          <FormField
            label="Etapa da obra"
            required={stageRequired}
            error={stagesError || undefined}
            helper={stagesLoading
              ? "Carregando etapas..."
              : stages.length === 0 && !stagesError
                ? "Esta obra ainda não tem etapas cadastradas — a requisição fica vinculada só à obra."
                : "Etapa que vai consumir o material (EST-004: project_id/stage_id)."}
          >
            <Select value={form.stageId} disabled={stagesLoading || stages.length === 0} onChange={(e) => setForm((p) => ({ ...p, stageId: e.target.value }))}>
              <option value="">{stagesLoading ? "Carregando..." : "Selecione..."}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {/* FIX (auditoria de acessibilidade mobile, Marco 7): campos de linha repetida
               dependiam só do placeholder — adicionado aria-label por linha. */}
            <Select aria-label={`Item da linha ${idx + 1}`} value={line.inventoryItemId} onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)} style={{ flex: 2 }}>
              <option value="">Item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput aria-label={`Quantidade da linha ${idx + 1}`} placeholder="Qtd" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} style={{ flex: 1 }} />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setForm((p) => ({ ...p, lines: [...p.lines, { inventoryItemId: "", quantity: "" }] }))}>+ Adicionar item</Button>
        </>
        )}
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
