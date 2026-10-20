"use client";

import { useEffect, useRef, useState } from "react";
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
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { listInventoryItems, listInventoryLocations, recordInventoryMovement, getItemBalances, listInventoryMovements, proposeInventoryAdjustment, listAdjustmentProposals, decideAdjustmentProposal } from "@/lib/api/inventory";
import { listProjectStages } from "@/lib/api/construction";
import { getCurrentUser } from "@/lib/auth/session";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { formatQuantity, formatDateTime, formatBRL, toNumber } from "@/lib/format";
import styles from "../../obras/lista/page.module.css";

const MOVEMENT_TYPE_LABELS = { IN: "Entrada", OUT: "Saída", RETURN: "Devolução", TRANSFER: "Transferência", ADJUSTMENT: "Ajuste", LOSS: "Perda", DISPOSAL: "Descarte" };
const MOVEMENT_TYPE_TONE = { IN: "success", OUT: "info", RETURN: "neutral", TRANSFER: "info", ADJUSTMENT: "warning", LOSS: "danger", DISPOSAL: "danger" };
const SOURCE_REQUIRED = { OUT: "source", LOSS: "source", DISPOSAL: "source", IN: "destination", RETURN: "destination", TRANSFER: "both", ADJUSTMENT: "either" };
// BUG REAL CORRIGIDO (auditoria Nayara, Marco 7, F1): "Perda" aparecia como tipo de movimento
// registrável direto por aqui, mas o backend (EST-010) exige que toda perda venha de um caso de
// perda já APROVADO em Perdas & Extravios — registrar LOSS direto por este formulário sempre
// falha, por desenho. Removida dessa lista; o label/tone continuam existindo pra exibir no
// histórico movimentos antigos/vindos de outro fluxo.
const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_LABELS).filter(([k]) => k !== "LOSS");
// Revisão Marco 7 (19/10/2026), A6 — EST-008: ajuste e descarte manuais viram PROPOSTA; outra
// pessoa com permissão de aprovação decide (a API recusa o lançamento direto).
const PROPOSAL_TYPES = ["ADJUSTMENT", "DISPOSAL"];

export default function MovimentosPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Idempotência client-side (achado da auditoria de idempotência, Marco 7): sem isso, um
  // clique em "Registrar" cuja resposta se perde por falha de rede e é reenviado manualmente
  // pelo usuário (novo clique) gerava um SEGUNDO movimento de estoque — recordInventoryMovement
  // é um INSERT simples sem proteção de UI contra isso além do loading state. O backend
  // (movements.service.js) já deduplica por `idempotencyKey` quando informado; o front não
  // enviava nenhum. Gera um UUID no primeiro clique e reenvia o MESMO UUID em qualquer retry
  // do mesmo envio, resetando só quando o modal é reaberto para um novo registro.
  const movementIdempotencyKeyRef = useRef(null);
  // BUG REAL CORRIGIDO (auditoria Nayara, Marco 7, F3): não existia histórico/ledger de
  // movimentações em lugar nenhum — só saldo atual agregado. Seção própria, com filtros.
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyFilters, setHistoryFilters] = useState({ inventoryItemId: "", locationId: "", movementType: "" });
  const [form, setForm] = useState({
    inventoryItemId: "", movementType: "IN", quantity: "", sourceLocationId: "", destinationLocationId: "",
    responsiblePersonId: "", responsibleName: "", reason: "", stageId: "",
  });
  const currentUser = getCurrentUser();
  const [notice, setNotice] = useState("");
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState("");
  const [decidingId, setDecidingId] = useState(null);
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(false);

  function loadProposals() {
    setProposalsLoading(true);
    setProposalsError("");
    listAdjustmentProposals({ status: "PENDING" })
      .then((rows) => setProposals(rows || []))
      .catch((err) => setProposalsError(err?.message || "Não foi possível carregar os ajustes pendentes."))
      .finally(() => setProposalsLoading(false));
  }
  useEffect(() => { loadProposals(); }, []);

  async function handleDecideProposal(id, decision) {
    setDecidingId(id);
    setActionError("");
    setNotice("");
    try {
      await decideAdjustmentProposal(id, decision);
      setNotice(decision === "APPROVED" ? "Ajuste aprovado — o movimento foi registrado no estoque." : "Ajuste rejeitado — o saldo não foi alterado.");
      loadProposals();
      loadHistory();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir o ajuste.");
    } finally {
      setDecidingId(null);
    }
  }

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInventoryItems(), listInventoryLocations()])
      .then(([i, l]) => {
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    listInventoryMovements(historyFilters)
      .then((rows) => setHistory(rows || []))
      .catch((err) => setHistoryError(err?.message || "Não foi possível carregar o histórico."))
      .finally(() => setHistoryLoading(false));
  }
  useEffect(() => { loadHistory(); }, [historyFilters.inventoryItemId, historyFilters.locationId, historyFilters.movementType]);

  useEffect(() => {
    if (!form.inventoryItemId) {
      setBalances([]);
      return;
    }
    getItemBalances(form.inventoryItemId).then(setBalances).catch(() => setBalances([]));
  }, [form.inventoryItemId]);

  // A7 — EST-004/§5: saída (OUT) de um canteiro de obra exige a etapa onde o material foi usado.
  const sourceLocation = locations.find((l) => l.id === form.sourceLocationId);
  const siteProjectId = form.movementType === "OUT" && sourceLocation?.locationType === "PROJECT_SITE" ? sourceLocation.projectId : null;
  const needsStage = Boolean(siteProjectId);
  useEffect(() => {
    if (!siteProjectId) {
      setStages([]);
      return undefined;
    }
    let cancelled = false;
    setStagesLoading(true);
    listProjectStages(siteProjectId)
      .then((rows) => { if (!cancelled) setStages(rows || []); })
      .catch(() => { if (!cancelled) setStages([]); })
      .finally(() => { if (!cancelled) setStagesLoading(false); });
    return () => { cancelled = true; };
  }, [siteProjectId]);
  const isProposal = PROPOSAL_TYPES.includes(form.movementType);

  const requirement = SOURCE_REQUIRED[form.movementType];
  const needsReason = ["ADJUSTMENT", "LOSS", "DISPOSAL"].includes(form.movementType);
  const item = items.find((i) => i.id === form.inventoryItemId);
  // BUG REAL CORRIGIDO (auditoria Nayara, Marco 7, F17): responsável só era exigido pra
  // ferramenta/patrimônio — qualquer "Saída" manual de consumível passava sem controle nenhum
  // (risco "Baixa sem retirada", Caderno seção 13). Backend agora exige pra toda Saída manual.
  const needsResponsible =
    (form.movementType === "OUT") ||
    (item && ["TOOL", "ASSET"].includes(item.itemType) && form.movementType === "TRANSFER");

  const isValid =
    form.inventoryItemId &&
    form.quantity &&
    !Number.isNaN(toNumber(form.quantity)) &&
    toNumber(form.quantity) > 0 &&
    (requirement !== "source" || form.sourceLocationId) &&
    (requirement !== "destination" || form.destinationLocationId) &&
    (requirement !== "both" || (form.sourceLocationId && form.destinationLocationId)) &&
    (requirement !== "either" || form.sourceLocationId || form.destinationLocationId) &&
    (!needsReason || form.reason.trim()) &&
    (!needsResponsible || form.responsiblePersonId.trim()) &&
    (!needsStage || form.stageId);

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    if (!movementIdempotencyKeyRef.current) {
      movementIdempotencyKeyRef.current = generateIdempotencyKey();
    }
    setNotice("");
    try {
      if (isProposal) {
        await proposeInventoryAdjustment({
          inventoryItemId: form.inventoryItemId,
          movementType: form.movementType,
          quantity: toNumber(form.quantity),
          sourceLocationId: form.sourceLocationId || undefined,
          destinationLocationId: form.destinationLocationId || undefined,
          reason: form.reason || undefined,
          idempotencyKey: movementIdempotencyKeyRef.current,
        });
        setNotice("Proposta registrada — o saldo só muda depois que outra pessoa com permissão aprovar.");
      } else {
        await recordInventoryMovement({
          inventoryItemId: form.inventoryItemId,
          movementType: form.movementType,
          quantity: toNumber(form.quantity),
          sourceLocationId: form.sourceLocationId || undefined,
          destinationLocationId: form.destinationLocationId || undefined,
          responsiblePersonId: form.responsiblePersonId || undefined,
          stageId: needsStage ? form.stageId : undefined,
          reason: form.reason || undefined,
          idempotencyKey: movementIdempotencyKeyRef.current,
        });
      }
      movementIdempotencyKeyRef.current = null;
      setModalOpen(false);
      setForm({ inventoryItemId: "", movementType: "IN", quantity: "", sourceLocationId: "", destinationLocationId: "", responsiblePersonId: "", responsibleName: "", reason: "", stageId: "" });
      load();
      loadHistory();
      loadProposals();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o movimento.");
    } finally {
      setSaving(false);
    }
  }

  const balanceColumns = [
    { key: "location", label: "Local", width: "60%", render: (row) => row.location?.name || row.locationId },
    { key: "qty", label: "Saldo", width: "40%", render: (row) => formatQuantity(row.quantityOnHand) },
  ];

  const historyColumns = [
    { key: "movedAt", label: "Data", render: (row) => formatDateTime(row.movedAt) },
    { key: "type", label: "Tipo", render: (row) => <Badge tone={MOVEMENT_TYPE_TONE[row.movementType]}>{MOVEMENT_TYPE_LABELS[row.movementType] || row.movementType}</Badge> },
    { key: "item", label: "Item", render: (row) => row.inventoryItem?.name || "—" },
    { key: "qty", label: "Quantidade", render: (row) => formatQuantity(row.quantity) },
    { key: "from", label: "De", render: (row) => row.sourceLocation?.name || "—" },
    { key: "to", label: "Para", render: (row) => row.destinationLocation?.name || "—" },
    { key: "stage", label: "Etapa", render: (row) => row.stage?.name || "—" },
    { key: "cost", label: "Custo", render: (row) => (row.totalCost != null ? formatBRL(row.totalCost) : "—") },
    { key: "reason", label: "Motivo", render: (row) => row.reason || "—" },
    { key: "by", label: "Responsável", render: (row) => row.responsiblePerson?.legalName || row.movedByUser?.name || "—" },
  ];

  const proposalColumns = [
    { key: "createdAt", label: "Proposto em", render: (row) => formatDateTime(row.createdAt) },
    { key: "type", label: "Tipo", render: (row) => <Badge tone={MOVEMENT_TYPE_TONE[row.movementType]}>{MOVEMENT_TYPE_LABELS[row.movementType]}</Badge> },
    { key: "item", label: "Item", render: (row) => row.inventoryItem?.name || "—" },
    {
      key: "qty",
      label: "Quantidade",
      render: (row) => `${row.movementType === "ADJUSTMENT" && row.destinationLocationId ? "+" : "−"}${formatQuantity(row.quantity)}`,
    },
    { key: "where", label: "Local", render: (row) => row.destinationLocation?.name || row.sourceLocation?.name || "—" },
    { key: "value", label: "Valor estimado", render: (row) => (row.estimatedValue != null ? formatBRL(row.estimatedValue) : "—") },
    { key: "reason", label: "Motivo", render: (row) => row.reason },
    { key: "by", label: "Proposto por", render: (row) => row.proposedByUser?.name || "—" },
    {
      key: "actions",
      label: "",
      render: (row) => {
        if (currentUser?.id && currentUser.id === row.proposedByUserId) {
          return <span style={{ fontSize: "var(--text-body-sm)", color: "var(--color-ink-muted)" }}>Você propôs — outra pessoa decide</span>;
        }
        return (
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="sm" onClick={() => handleDecideProposal(row.id, "APPROVED")} loading={decidingId === row.id}>Aprovar</Button>
            <Button size="sm" variant="secondary" onClick={() => handleDecideProposal(row.id, "REJECTED")} loading={decidingId === row.id}>Rejeitar</Button>
          </div>
        );
      },
    },
  ];

  return (
    <AppShell title="Movimentos de estoque" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os dados">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card title="Ajustes aguardando aprovação" subtitle="Ajuste e descarte manuais só mexem no saldo depois da aprovação de outra pessoa (EST-008)">
        {proposalsError ? <Alert tone="danger" title="Não foi possível carregar os ajustes pendentes">{proposalsError}</Alert> : null}
        <Table columns={proposalColumns} rows={proposals} loading={proposalsLoading} emptyMessage="Nenhum ajuste aguardando aprovação." />
      </Card>

      <Card title="Consultar saldo por item" subtitle="Selecione um item para ver o saldo por local">
        <div className={styles.toolbar}>
          <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
            <option value="">Selecione um item...</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </div>
        {form.inventoryItemId ? (
          <Table columns={balanceColumns} rows={balances} loading={loading} emptyMessage="Sem saldo registrado para este item." />
        ) : null}
      </Card>

      <Card title="Histórico de movimentações" subtitle="Quem moveu o quê, quando, de onde pra onde e por quê">
        <div className={styles.toolbar}>
          <Select value={historyFilters.inventoryItemId} onChange={(e) => setHistoryFilters((p) => ({ ...p, inventoryItemId: e.target.value }))}>
            <option value="">Todos os itens</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
          <Select value={historyFilters.locationId} onChange={(e) => setHistoryFilters((p) => ({ ...p, locationId: e.target.value }))}>
            <option value="">Todos os locais</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
          <Select value={historyFilters.movementType} onChange={(e) => setHistoryFilters((p) => ({ ...p, movementType: e.target.value }))}>
            <option value="">Todos os tipos</option>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        {historyError ? <Alert tone="danger" title="Não foi possível carregar o histórico">{historyError}</Alert> : null}
        <Table
          columns={historyColumns}
          rows={history}
          loading={historyLoading}
          emptyMessage="Nenhuma movimentação registrada ainda."
        />
      </Card>

      <StickyActionBar>
        <Button
          onClick={() => {
            movementIdempotencyKeyRef.current = null;
            setModalOpen(true);
          }}
        >
          <Icon name="plus" size={18} /> Registrar movimento
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar movimento de estoque"
        footer={
          items.length === 0 || locations.length === 0 ? (
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} loading={saving} disabled={!isValid}>{isProposal ? "Enviar para aprovação" : "Registrar"}</Button>
            </>
          )
        }
      >
        {/* BUG REAL CORRIGIDO: sem nenhum item/local cadastrado, o modal abria com os dois
            selects vazios ("Selecione...") sem nenhuma explicação do porquê, nem como resolver —
            o usuário não tinha como saber que precisava cadastrar Item/Local primeiro. */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0", color: "var(--color-ink-muted)" }}>
            Carregando itens e locais...
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="layers" title="Nenhum item de estoque cadastrado" description="Você precisa cadastrar pelo menos um item antes de registrar um movimento." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar item agora</Button>
          </div>
        ) : locations.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="mapPin" title="Nenhum local de estoque cadastrado" description="Você precisa cadastrar pelo menos um local (depósito, obra, loja...) antes de registrar um movimento." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar local agora</Button>
          </div>
        ) : (
        <>
        <FormField label="Item" required>
          <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
            <option value="">Selecione...</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Tipo de movimento" required helper="Para registrar uma perda, use a tela Perdas & Extravios — ela conduz pela aprovação necessária antes de dar baixa no estoque.">
          <Select
            value={form.movementType}
            onChange={(e) =>
              // BUG MÉDIO REAL CORRIGIDO (auditoria Marco 7 "reval", 2026-10-16): trocar o tipo
              // de movimento não limpava "reason" nem origem/destino — motivo digitado para um
              // Ajuste (ex.: "contagem física") ficava gravado silenciosamente num movimento de
              // Saída depois, sem relação com o motivo real da saída.
              setForm((p) => ({ ...p, movementType: e.target.value, reason: "", sourceLocationId: "", destinationLocationId: "", stageId: "" }))
            }
          >
            {MOVEMENT_TYPE_OPTIONS.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Quantidade" required>
          <DecimalInput value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
        </FormField>
        {(requirement === "source" || requirement === "both" || requirement === "either") ? (
          <FormField
            label="Local de origem"
            required={requirement !== "either"}
            helper={form.movementType === "ADJUSTMENT" ? "Preencha para DIMINUIR o saldo neste local (ou preencha só o destino, nunca os dois — ajuste corrige um local por vez)." : undefined}
          >
            <Select
              value={form.sourceLocationId}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({
                  ...p,
                  sourceLocationId: value, stageId: "",
                  // Ajuste corrige UM local por vez — nunca os dois ao mesmo tempo (bug real: isso
                  // creditava o destino sem debitar a origem, criando saldo do nada).
                  destinationLocationId: p.movementType === "ADJUSTMENT" && value ? "" : p.destinationLocationId,
                }));
              }}
            >
              <option value="">Selecione...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {(requirement === "destination" || requirement === "both" || requirement === "either") ? (
          <FormField
            label="Local de destino"
            required={requirement !== "either"}
            helper={form.movementType === "ADJUSTMENT" ? "Preencha para AUMENTAR o saldo neste local (ou preencha só a origem, nunca os dois — ajuste corrige um local por vez)." : undefined}
          >
            <Select
              value={form.destinationLocationId}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({
                  ...p,
                  destinationLocationId: value,
                  sourceLocationId: p.movementType === "ADJUSTMENT" && value ? "" : p.sourceLocationId,
                }));
              }}
            >
              <option value="">Selecione...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {needsStage ? (
          <FormField label="Etapa da obra" required helper={stages.length === 0 && !stagesLoading ? "Esta obra ainda não tem etapas cadastradas — cadastre em Obras antes de registrar a saída." : "Etapa em que o material foi usado."}>
            <Select value={form.stageId} disabled={stagesLoading || stages.length === 0} onChange={(e) => setForm((p) => ({ ...p, stageId: e.target.value }))}>
              <option value="">{stagesLoading ? "Carregando..." : "Selecione..."}</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {isProposal ? (
          <Alert tone="info">Ajuste e descarte viram uma proposta: o saldo só muda depois que outra pessoa com permissão aprovar.</Alert>
        ) : null}
        {needsResponsible ? (
          <FormField label="Responsável" required helper="Quem está retirando ou recebendo o item.">
            <PersonPicker
              id="movement-responsible"
              value={form.responsibleName}
              personId={form.responsiblePersonId}
              placeholder="Buscar pessoa pelo nome..."
              unlinkedHint="Selecione um contato da lista — texto livre não é aceito, é preciso um cadastro vinculado."
              onSelect={({ name, personId }) => setForm((p) => ({ ...p, responsibleName: name, responsiblePersonId: personId || "" }))}
            />
          </FormField>
        ) : null}
        {needsReason ? (
          <FormField label="Motivo" required helper="Ajuste e descarte exigem motivo.">
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          </FormField>
        ) : null}
        {!needsReason && (form.movementType === "IN" || form.movementType === "TRANSFER") ? (
          <FormField label="Motivo" helper="Opcional — ajuda a identificar esta movimentação no histórico depois.">
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          </FormField>
        ) : null}
        </>
        )}
      </Modal>
    </AppShell>
  );
}
