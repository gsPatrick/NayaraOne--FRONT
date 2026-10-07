"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StatTile from "@/components/molecules/StatTile/StatTile";
import FormField from "@/components/molecules/FormField/FormField";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import {
  getCount, addCountItem, completeCount, applyCountAdjustment,
  listInventoryItems, listInventoryLocations,
} from "@/lib/api/inventory";
import { listProjects } from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, formatQuantity, toNumber } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_LABELS = { OPEN: "Em contagem", COMPLETED: "Fechado" };
const STATUS_TONE = { OPEN: "warning", COMPLETED: "success" };

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "—";
}

export default function ContagemDetailPage() {
  const { id } = useParams();
  const { confirm, ConfirmDialog } = useConfirm();

  const [count, setCount] = useState(null);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLineId, setBusyLineId] = useState(null);

  const [lineForm, setLineForm] = useState({ inventoryItemId: "", countedQuantity: "" });

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      getCount(id),
      listInventoryItems(),
      listInventoryLocations(),
      listProjects().catch(() => []),
      apiFetch("/users").catch(() => []),
    ])
      .then(([c, i, l, p, u]) => {
        setCount(c);
        setItems(i || []);
        setLocations(l || []);
        setProjects(p || []);
        setUsers(u || []);
      })
      .catch((err) => {
        if (err?.status === 404) { setNotFoundFlag(true); return; }
        setLoadError(err?.message || "Não foi possível carregar o inventário.");
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (notFoundFlag) return notFound();

  function locationName(locId) {
    return locations.find((l) => l.id === locId)?.name || "—";
  }
  function itemName(itemId) {
    return items.find((i) => i.id === itemId)?.name || "—";
  }
  function projectName(projId) {
    return projects.find((p) => p.id === projId)?.name || "—";
  }

  async function handleAddLine() {
    if (!lineForm.inventoryItemId || lineForm.countedQuantity === "") return;
    setBusy(true);
    setActionError("");
    try {
      await addCountItem(count.id, { inventoryItemId: lineForm.inventoryItemId, countedQuantity: toNumber(lineForm.countedQuantity) });
      setLineForm({ inventoryItemId: "", countedQuantity: "" });
      const full = await getCount(count.id);
      setCount(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível adicionar a contagem.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    const ok = await confirm({
      title: "Fechar esta contagem?",
      message: "O inventário será fechado e as divergências serão calculadas. Fechar não altera o saldo de estoque diretamente — cada ajuste ainda precisa ser aplicado individualmente.",
      confirmLabel: "Fechar contagem",
    });
    if (!ok) return;

    setBusy(true);
    setActionError("");
    try {
      const full = await completeCount(count.id);
      setCount(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar o inventário.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdjust(line) {
    const ok = await confirm({
      title: "Aplicar este ajuste de estoque?",
      message: `O saldo de "${itemName(line.inventoryItemId)}" será ajustado em ${formatQuantity(line.divergence)} pra bater com o que foi contado fisicamente. Esta ação movimenta estoque de verdade e não pode ser desfeita pelo mesmo fluxo.`,
      confirmLabel: "Aplicar ajuste",
      tone: "danger",
    });
    if (!ok) return;

    setBusyLineId(line.id);
    setActionError("");
    try {
      await applyCountAdjustment(line.id);
      const full = await getCount(count.id);
      setCount(full);
    } catch (err) {
      setActionError(err?.message || "Não foi possível aplicar o ajuste.");
    } finally {
      setBusyLineId(null);
    }
  }

  const countLines = count?.items || [];
  const divergentLines = countLines.filter((l) => l.expectedQuantity != null && Number(l.divergence) !== 0);
  const pendingAdjustments = divergentLines.filter((l) => !l.adjustmentMovementId);
  const appliedAdjustments = divergentLines.filter((l) => l.adjustmentMovementId);
  const matchingLines = countLines.filter((l) => l.expectedQuantity != null && Number(l.divergence) === 0);

  const statusDistribution = [
    { label: "Sem divergência", value: matchingLines.length, color: "var(--color-success)" },
    { label: "Divergência pendente", value: pendingAdjustments.length, color: "var(--color-danger)" },
    { label: "Ajustado", value: appliedAdjustments.length, color: "var(--color-info)" },
  ].filter((d) => d.value > 0);

  const divergenceByItem = divergentLines.map((l) => ({
    label: itemName(l.inventoryItemId),
    value: Math.abs(Number(l.divergence)),
    displayValue: formatQuantity(l.divergence),
    color: Number(l.divergence) < 0 ? "var(--color-danger)" : "var(--color-success)",
  }));

  const countedByItem = countLines.map((l) => ({
    label: itemName(l.inventoryItemId),
    value: Number(l.countedQuantity) || 0,
    displayValue: formatQuantity(l.countedQuantity),
  }));

  return (
    <AppShell title={count ? `Inventário — ${locationName(count.locationId)}` : "Inventário"} backHref="/painel/estoque/contagem">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o inventário">{loadError}</Alert> : null}
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : !count ? null : (
        <div className={styles.wrap}>
          <div className={styles.grid}>
            <StatTile label="Status" value={STATUS_LABELS[count.status]} tone={count.status === "OPEN" ? "warning" : "success"} icon="layers" />
            <StatTile label="Itens contados" value={countLines.length} icon="document" />
            <StatTile label="Divergências pendentes" value={pendingAdjustments.length} tone={pendingAdjustments.length > 0 ? "danger" : "success"} icon="shield" />
            <StatTile label="Ajustes aplicados" value={appliedAdjustments.length} tone="success" icon="check" />
          </div>

          <Card title="Informações do inventário">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Local</span>
                <span className={styles.infoValue}>{locationName(count.locationId)}</span>
              </div>
              {count.projectId ? (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Obra vinculada</span>
                  <span className={styles.infoValue}>{projectName(count.projectId)}</span>
                </div>
              ) : null}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status</span>
                <span className={styles.infoValue}><Badge tone={STATUS_TONE[count.status]}>{STATUS_LABELS[count.status]}</Badge></span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Aberto em</span>
                <span className={styles.infoValue}>{formatDateTime(count.created_at)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Aberto por</span>
                <span className={styles.infoValue}>{userName(users, count.createdBy)}</span>
              </div>
              {count.status === "COMPLETED" ? (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Fechado em</span>
                  <span className={styles.infoValue}>{formatDateTime(count.countedAt || count.updated_at)}</span>
                </div>
              ) : null}
            </div>
          </Card>

          {countLines.length > 0 ? (
            <div className={styles.chartGrid}>
              <Card title="Contado por item" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={countedByItem} defaultType="column" />
              </Card>
              {divergenceByItem.length > 0 ? (
                <Card title="Divergência por item" subtitle="Vermelho = faltou, verde = sobrou">
                  <SwitchableChart items={divergenceByItem} defaultType="bar" />
                </Card>
              ) : (
                <Card title="Divergência por item">
                  <EmptyState icon="check" title="Sem divergência" description="Todos os itens contados batem com o saldo esperado." />
                </Card>
              )}
              {statusDistribution.length > 0 ? (
                <Card title="Distribuição por status" subtitle="Troque o tipo de gráfico" className={styles.chartGridFull}>
                  <SwitchableChart items={statusDistribution} defaultType="donut" />
                </Card>
              ) : null}
            </div>
          ) : null}

          {count.status === "OPEN" ? (
            <Card title="Lançar contagem de item">
              <div className={styles.addLineRow}>
                <FormField label="Item" className={styles.addLineField}>
                  <Select value={lineForm.inventoryItemId} onChange={(e) => setLineForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Quantidade contada" className={styles.addLineQty}>
                  <DecimalInput placeholder="0" value={lineForm.countedQuantity} onChange={(e) => setLineForm((p) => ({ ...p, countedQuantity: e.target.value }))} />
                </FormField>
                <Button onClick={handleAddLine} loading={busy} disabled={!lineForm.inventoryItemId || lineForm.countedQuantity === ""}>
                  <Icon name="plus" size={16} /> Adicionar
                </Button>
              </div>
            </Card>
          ) : null}

          <Card title="Itens contados" subtitle="Fechamento calcula divergência; ajuste é um ato separado e aprovado (EST-TS-09)">
            {countLines.length === 0 ? (
              <EmptyState icon="document" title="Nenhum item contado ainda" description="Lance a contagem dos itens acima." />
            ) : (
              <div className={styles.lineList}>
                {countLines.map((line) => {
                  const hasDivergence = line.expectedQuantity != null && Number(line.divergence) !== 0;
                  const isAdjusted = Boolean(line.adjustmentMovementId);
                  return (
                    <div key={line.id} className={styles.lineRow}>
                      <div className={styles.lineInfo}>
                        <span className={styles.lineItemName}>{itemName(line.inventoryItemId)}</span>
                        <span className={styles.lineMeta}>Contado: {formatQuantity(line.countedQuantity)}</span>
                      </div>
                      {line.expectedQuantity != null ? (
                        <div className={styles.lineDivergence}>
                          <span className={styles.lineMeta}>Esperado: {formatQuantity(line.expectedQuantity)}</span>
                          <span className={hasDivergence ? styles.divergenceValue : styles.lineMeta}>
                            Divergência: {formatQuantity(line.divergence)}
                          </span>
                        </div>
                      ) : null}
                      <div className={styles.lineAction}>
                        {hasDivergence && !isAdjusted ? (
                          <Button size="sm" variant="danger" onClick={() => handleAdjust(line)} loading={busyLineId === line.id}>Ajustar</Button>
                        ) : isAdjusted ? (
                          <Badge tone="success">Ajustado</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {count?.status === "OPEN" ? (
        <StickyActionBar>
          <Button onClick={handleComplete} loading={busy}>
            <Icon name="check" size={16} /> Fechar contagem
          </Button>
        </StickyActionBar>
      ) : null}

      <ConfirmDialog />
    </AppShell>
  );
}
