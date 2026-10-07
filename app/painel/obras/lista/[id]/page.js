"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Select from "@/components/atoms/Select/Select";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  PROJECT_STATUS_FLOW,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MAINTENANCE_ESCALATION_LABELS,
} from "@/lib/mock/construction";
import {
  getProject,
  updateProject,
  transitionProject,
  removeProject,
  deliverProject,
  closeProjectWarranty,
  listProjectStages,
  createProjectStage,
  updateProjectStage,
  listDailyReports,
  listBudgetLines,
  listBudgets,
  listChangeOrders,
  getProjectHealth,
  getNayObrasSummary,
  getNayObrasPostObraSummary,
} from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listCostCenters } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { formatBRL, formatPercent, formatDate, formatDateTime, dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, toNumber } from "@/lib/format";
import styles from "./page.module.css";

// Visão geral da obra — depois da divisão do antigo monólito (orçamento, change orders, RDO/
// diário, medições, materiais e qualidade/NC agora moram em subrotas dedicadas, veja
// app/painel/obras/lista/[id]/{orcamento,change-orders,diario,medicoes,materiais,qualidade}/
// page.js). Esta tela mantém: dados gerais da obra, ações de status/entrega/garantia, saúde da
// obra, resumo do NAY Obras, e a lista/CRUD de etapas (cronograma físico), com atalhos para
// cada subrotina.
export default function ObraDetalhePage({ params }) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [stages, setStages] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [budgetLinesCount, setBudgetLinesCount] = useState(0);
  const [changeOrdersCount, setChangeOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", propertyId: "", responsibleUserId: "", costCenterId: "", budgetAmount: "", startsAt: "", endsAtPlanned: "" });
  const [editDateErrors, setEditDateErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [budgetApproved, setBudgetApproved] = useState(false);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ name: "", sequence: "1", plannedPct: "", startsAt: "", endsAt: "" });
  // FIX (auditoria externa Marco 6, 2026-10-07): o caderno exige prazo (início/fim) por
  // etapa e o backend (projectStages.service.js) já valida/persiste startsAt/endsAt — o
  // formulário de etapa simplesmente não expunha esses campos. Mesmo padrão de validação de
  // <input type="date"> usado no formulário da obra (editDateErrors).
  const [stageDateErrors, setStageDateErrors] = useState({});
  // FIX (homologação 23/09/2026): etapa só podia ser CRIADA. Guardar o id em edição faz o
  // mesmo modal servir pra criar e pra editar.
  const [editingStageId, setEditingStageId] = useState(null);
  const [savingStage, setSavingStage] = useState(false);

  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");

  // NAY Obras (M6-101) — componente nomeado exigido pela fonte, resumo determinístico
  // (rule-based, nunca decide) sobre os read models de saúde já existentes. Achado numa
  // auditoria do Front do Marco 6: o endpoint existia, mas nenhuma tela o exibia.
  const [nayObras, setNayObras] = useState(null);
  const [nayObrasError, setNayObrasError] = useState("");
  const [postObraHealth, setPostObraHealth] = useState(null);

  // Entrega da obra — gate dedicado (bloqueia com NC crítica aberta).
  const [delivering, setDelivering] = useState(false);
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);

  // Fechamento de garantia — gate dedicado (bloqueia com MaintenanceCase ainda aberto).
  const [closingWarranty, setClosingWarranty] = useState(false);
  const [warrantyCloseBlocked, setWarrantyCloseBlocked] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getProject(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      listProperties(),
      apiFetch("/users?status=ACTIVE"),
      // Centro de custo é opcional — não pode derrubar a página inteira se o usuário não tiver
      // permissão finance:read (o formulário de edição só perde essa opção específica).
      listCostCenters().catch(() => []),
    ])
      .then(([p, props, u, cc]) => {
        if (cancelled || !p) return;
        setProject(p);
        setProperties(props || []);
        setUsers(u || []);
        setCostCenters(cc || []);
        return Promise.all([
          listProjectStages(p.id),
          listDailyReports(p.id),
          listBudgetLines(p.id),
          listChangeOrders(p.id),
          listBudgets(p.id),
        ]).then(([st, rd, bl, cos, budgets]) => {
          if (cancelled) return;
          setStages(st || []);
          setReportsCount((rd || []).length);
          setBudgetLinesCount((bl || []).length);
          setChangeOrdersCount((cos || []).length);
          setBudgetApproved(((budgets || [])[0]?.status) === "APPROVED");
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar a obra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  function loadHealth() {
    setHealthError("");
    getProjectHealth(params.id)
      .then((h) => setHealth(h || null))
      .catch((err) => setHealthError(err?.message || "Não foi possível carregar a saúde da obra."));
  }

  function loadNayObras() {
    setNayObrasError("");
    getNayObrasSummary(params.id)
      .then((s) => setNayObras(s || null))
      .catch((err) => setNayObrasError(err?.message || "Não foi possível carregar o resumo do NAY Obras."));
    getNayObrasPostObraSummary(params.id)
      .then((s) => setPostObraHealth(s || null))
      .catch(() => setPostObraHealth(null));
  }

  useEffect(() => {
    loadHealth();
    loadNayObras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <SkeletonDetail sections={4} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Não foi possível carregar a obra">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const property = project.propertyId ? properties.find((p) => p.id === project.propertyId) : null;
  const responsible = project.responsibleUserId ? users.find((u) => u.id === project.responsibleUserId) : null;
  const nextStatuses = PROJECT_STATUS_FLOW[project.status] || [];

  async function handleAdvanceStatus(nextStatus) {
    setBusy(true);
    setActionError("");
    try {
      const updated = await transitionProject(project.id, nextStatus);
      setProject(updated);
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o status da obra.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError("");
    try {
      await removeProject(project.id);
      router.push("/painel/obras/lista");
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir a obra.");
      setBusy(false);
    }
  }

  function openEditModal() {
    setEditForm({
      name: project.name,
      propertyId: project.propertyId || "",
      responsibleUserId: project.responsibleUserId || "",
      costCenterId: project.costCenterId || "",
      budgetAmount: project.budgetAmount != null ? String(project.budgetAmount) : "",
      startsAt: project.startsAt ? project.startsAt.slice(0, 10) : "",
      endsAtPlanned: project.endsAtPlanned ? project.endsAtPlanned.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    setActionError("");
    try {
      const updated = await updateProject(project.id, {
        name: editForm.name.trim(),
        propertyId: editForm.propertyId || null,
        responsibleUserId: editForm.responsibleUserId || null,
        costCenterId: editForm.costCenterId || null,
        // FIX (auditoria E2E de browser, ciclo 5, 02/10/2026): com orçamento já aprovado
        // (baseline imutável), o backend agora rejeita qualquer alteração de budgetAmount —
        // omite o campo do payload nesse caso (igual ao padrão já usado em
        // updateBudgetLine/plannedAmount), senão salvar OUTRO campo do modal (ex.: nome)
        // quebraria também, mesmo sem o usuário ter mexido no orçamento.
        ...(!budgetApproved
          ? { budgetAmount: editForm.budgetAmount !== "" ? toNumber(editForm.budgetAmount) : null }
          : {}),
        startsAt: dateOnlyInputToIso(editForm.startsAt) || null,
        endsAtPlanned: dateOnlyInputToIso(editForm.endsAtPlanned) || null,
      });
      setProject(updated);
      setEditOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setSavingEdit(false);
    }
  }

  function openStageModal() {
    setEditingStageId(null);
    setStageForm({ name: "", sequence: String(stages.length + 1), plannedPct: "", startsAt: "", endsAt: "" });
    setStageDateErrors({});
    setStageOpen(true);
  }

  // FIX (homologação 23/09/2026): não existia NENHUMA forma de editar uma etapa de obra pela
  // interface — a etapa só podia ser criada. PATCH /construction/stages/:id já existia na API
  // e em lib/api/construction.js (updateProjectStage), mas nenhuma tela consumia. Corrigir
  // nome, sequência ou percentual planejado de uma etapa era impossível pelo sistema.
  function openStageEditModal(stage) {
    setEditingStageId(stage.id);
    setStageForm({
      name: stage.name || "",
      sequence: stage.sequence != null ? String(stage.sequence) : "",
      plannedPct: stage.plannedPct != null ? String(Number(stage.plannedPct)) : "",
      startsAt: stage.startsAt ? stage.startsAt.slice(0, 10) : "",
      endsAt: stage.endsAt ? stage.endsAt.slice(0, 10) : "",
    });
    setStageDateErrors({});
    setStageOpen(true);
  }

  async function handleSaveStage() {
    // BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 8, 2026-10-06): duplo-clique
    // nativo (2 cliques no mesmo tick JS) disparava o handler 2x antes do React re-renderizar o
    // `disabled` do botão, criando 2 etapas duplicadas — nenhum backend bloqueava, pois é um
    // INSERT simples sem checagem de duplicidade. Guarda de reentrância explícita.
    if (savingStage) return;
    if (!stageForm.name.trim() || stageForm.sequence === "") return;
    setSavingStage(true);
    setActionError("");
    try {
      const payload = {
        name: stageForm.name.trim(),
        sequence: Number(stageForm.sequence),
        plannedPct: stageForm.plannedPct !== "" ? toNumber(stageForm.plannedPct) : undefined,
        startsAt: dateOnlyInputToIso(stageForm.startsAt) || null,
        endsAt: dateOnlyInputToIso(stageForm.endsAt) || null,
      };
      if (editingStageId) {
        const updated = await updateProjectStage(editingStageId, payload);
        setStages((prev) => prev.map((s) => (s.id === editingStageId ? updated : s)));
      } else {
        const created = await createProjectStage(project.id, payload);
        setStages((prev) => [...prev, created]);
      }
      setStageOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a etapa.");
    } finally {
      setSavingStage(false);
    }
  }

  // Entrega da obra (M6-25/...) — se a API recusar por NC crítica em aberto, mostramos um
  // aviso com link direto pra seção de Não Conformidades na subrota de Qualidade, nunca o
  // código de erro técnico cru.
  async function handleDeliver() {
    if (delivering) return;
    setDelivering(true);
    setActionError("");
    setDeliveryBlocked(false);
    try {
      const updated = await deliverProject(project.id);
      setProject(updated);
    } catch (err) {
      if (err?.code === "PROJECT_DELIVERY_BLOCKED_BY_CRITICAL_NONCONFORMITY") {
        setDeliveryBlocked(true);
      } else {
        setActionError(err?.message || "Não foi possível entregar a obra.");
      }
    } finally {
      setDelivering(false);
    }
  }

  // Fechamento de garantia (M6-...) — se a API recusar por caso de garantia ainda aberto, mostra
  // um aviso claro em vez do código de erro técnico cru.
  async function handleCloseWarranty() {
    if (closingWarranty) return;
    setClosingWarranty(true);
    setActionError("");
    setWarrantyCloseBlocked(false);
    try {
      const updated = await closeProjectWarranty(project.id);
      setProject(updated);
    } catch (err) {
      if (err?.code === "PROJECT_WARRANTY_CLOSE_BLOCKED_BY_OPEN_CASE") {
        setWarrantyCloseBlocked(true);
      } else {
        setActionError(err?.message || "Não foi possível encerrar a garantia da obra.");
      }
    } finally {
      setClosingWarranty(false);
    }
  }

  return (
    <AppShell title={project.name} backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}
        {deliveryBlocked ? (
          <Alert tone="danger" title="Entrega bloqueada">
            Não é possível entregar a obra: existe pelo menos uma não conformidade{" "}
            <strong>crítica em aberto</strong> vinculada a este projeto. Resolva e feche a(s)
            pendência(s) na seção{" "}
            <Link href={`/painel/obras/lista/${project.id}/qualidade#nao-conformidades`} className={styles.infoLink}>Não Conformidades</Link>{" "}
            antes de tentar entregar novamente.
          </Alert>
        ) : null}
        {warrantyCloseBlocked ? (
          <Alert tone="danger" title="Encerramento de garantia bloqueado">
            Não é possível encerrar a garantia da obra: existe pelo menos um{" "}
            <strong>chamado de garantia ainda aberto</strong> vinculado a este projeto. Feche
            todos os chamados em{" "}
            <a href="/painel/obras/pos-obra" className={styles.infoLink}>Pós-obra</a>{" "}
            antes de tentar encerrar novamente.
          </Alert>
        ) : null}

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {nextStatuses.length > 0 ? (
              nextStatuses.map((status) =>
                // FIX (auditoria E2E de browser, ciclo 4, 02/10/2026): "Cancelar" é a única
                // transição destrutiva/irreversível deste conjunto (as demais são progresso
                // normal da obra) — executava na hora, sem confirmação nenhuma, rotulada com o
                // nome do estado-alvo ("Cancelada") em vez de um verbo de ação.
                status === "CANCELLED" ? (
                  <Button key={status} variant="danger" onClick={() => setCancelConfirmOpen(true)} loading={busy}>
                    <Icon name="arrowUpCircle" size={16} /> Cancelar obra
                  </Button>
                ) : (
                  <Button key={status} variant="secondary" onClick={() => handleAdvanceStatus(status)} loading={busy}>
                    <Icon name="arrowUpCircle" size={16} /> {PROJECT_STATUS_LABELS[status]}
                  </Button>
                )
              )
            ) : null}
            {project.status === "FINAL_INSPECTION" ? (
              <Button variant="primary" onClick={handleDeliver} loading={delivering} disabled={delivering}>
                <Icon name="check" size={16} /> Entregar obra
              </Button>
            ) : null}
            {project.status === "WARRANTY" ? (
              <Button variant="primary" onClick={handleCloseWarranty} loading={closingWarranty} disabled={closingWarranty}>
                <Icon name="check" size={16} /> Encerrar garantia
              </Button>
            ) : null}
            <Button variant="secondary" onClick={openEditModal}>
              <Icon name="pencil" size={16} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
        </div>

        <Card title="Informações gerais">
          <div className={styles.infoGrid}>
            <div>
              <p className={styles.infoLabel}>Imóvel vinculado</p>
              <p className={styles.infoValue}>
                {property ? (
                  <a href={`/painel/imoveis/${property.id}`} className={styles.infoLink}>{property.name}</a>
                ) : "—"}
              </p>
            </div>
            <div>
              <p className={styles.infoLabel}>Responsável</p>
              <p className={styles.infoValue}>{responsible?.name || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Centro de custo</p>
              <p className={styles.infoValue}>{costCenters.find((c) => c.id === project.costCenterId)?.name || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Orçamento planejado</p>
              <p className={styles.infoValue}>{formatBRL(project.budgetAmount)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Início</p>
              <p className={styles.infoValue}>{formatDate(project.startsAt)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Previsão de término</p>
              <p className={styles.infoValue}>{formatDate(project.endsAtPlanned)}</p>
            </div>
          </div>
        </Card>

        <Card title="Saúde da obra" subtitle="Read model de custo e progresso (calculado em tempo real)">
          {healthError ? (
            <Alert tone="danger">{healthError}</Alert>
          ) : !health ? (
            <p className={styles.infoLabel}>Carregando…</p>
          ) : (
            <>
              <div className={styles.infoGrid}>
                <div>
                  <p className={styles.infoLabel}>Orçamento base (baseline)</p>
                  <p className={styles.infoValue}>{formatBRL(health.baselineBudget)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Mudanças aprovadas</p>
                  <p className={styles.infoValue}>{formatBRL(health.approvedChanges)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo comprometido</p>
                  <p className={styles.infoValue}>{formatBRL(health.committedCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo financeiro realizado</p>
                  <p className={styles.infoValue}>{formatBRL(health.actualFinancialCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo de estoque consumido</p>
                  <p className={styles.infoValue}>{formatBRL(health.consumedInventoryCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Previsão para concluir</p>
                  <p className={styles.infoValue}>{formatBRL(health.forecastToComplete)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo total projetado</p>
                  <p className={styles.infoValue}>{formatBRL(health.projectedTotalCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Margem projetada</p>
                  <p className={styles.infoValue}>
                    {formatBRL(health.projectedMargin)}
                    {health.marginPct != null ? ` (${health.marginPct}%)` : ""}
                  </p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Atualizado em</p>
                  <p className={styles.infoValue}>{formatDateTime(health.updatedAt)}</p>
                </div>
              </div>
              {health.belowMinMargin ? (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Alert tone="danger" title="Margem projetada abaixo da regra mínima">
                    Margem projetada atual de {health.marginPct}% está abaixo do mínimo configurado de {health.minMarginPct}%.
                    Revise o custo da obra ou o orçamento com a diretoria.
                  </Alert>
                </div>
              ) : null}
              <div className={styles.infoGrid} style={{ marginTop: "var(--space-4)" }}>
                <div>
                  <p className={styles.infoLabel}>Progresso físico medido</p>
                  <p className={styles.infoValue}>{health.kpis?.physicalProgressPct != null ? `${health.kpis.physicalProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Progresso planejado</p>
                  <p className={styles.infoValue}>{health.kpis?.plannedProgressPct != null ? `${health.kpis.plannedProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Progresso do cronograma</p>
                  <p className={styles.infoValue}>{health.kpis?.scheduleProgressPct != null ? `${health.kpis.scheduleProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Situação de prazo</p>
                  <p className={styles.infoValue}>
                    {/* BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 8, 2026-10-06):
                        atraso aparecia só como texto preto comum dentro do card, sem nenhum
                        destaque visual — mesmo sinal que já é um Badge vermelho no dashboard. */}
                    {health.kpis?.isOverdue ? (
                      <Badge tone="danger">{`Atrasada (${health.kpis?.scheduleDelayDays ?? 0} dias)`}</Badge>
                    ) : (
                      "Em dia"
                    )}
                  </p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Contas a pagar pendentes</p>
                  <p className={styles.infoValue}>{formatBRL(health.kpis?.payablePendingTotal)}</p>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card title="NAY Obras" subtitle="Resumo determinístico (rule-based) de progresso, custos e riscos — NAY sugere, nunca decide">
          {nayObrasError ? (
            <Alert tone="danger">{nayObrasError}</Alert>
          ) : !nayObras ? (
            <p className={styles.infoLabel}>Carregando…</p>
          ) : (
            <>
              {nayObras.risks?.length ? (
                <div className={styles.rowList} style={{ marginBottom: "var(--space-3)" }}>
                  {nayObras.risks.map((r, i) => (
                    <Alert key={i} tone="warning">{r}</Alert>
                  ))}
                </div>
              ) : (
                <Alert tone="success">Nenhum risco identificado no momento.</Alert>
              )}
              {postObraHealth?.summary?.totalCases > 0 ? (
                <div className={styles.infoGrid} style={{ marginTop: "var(--space-3)" }}>
                  <div>
                    <p className={styles.infoLabel}>Chamados de garantia (total)</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.totalCases}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Chamados em aberto</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.openCases}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Tempo médio de atendimento</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.avgResolutionHours != null ? `${postObraHealth.summary.avgResolutionHours}h` : "—"}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Custo total de garantia</p>
                    <p className={styles.infoValue}>{formatBRL(postObraHealth.summary.totalWarrantyCost)}</p>
                  </div>
                  {/* BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 35, 2026-10-05): o
                      backend (postObraHealth.service.js) já calculava totalLaborCost,
                      totalMaterialCost e casesByEscalationLevel — exatamente os campos exigidos
                      pelo contrato ("Pós-obra possui SLA, causa, materiais, mão de obra, custo e
                      evidências") — mas eles nunca eram exibidos, só totalWarrantyCost agregado. */}
                  <div>
                    <p className={styles.infoLabel}>Custo de mão de obra</p>
                    <p className={styles.infoValue}>{formatBRL(postObraHealth.summary.totalLaborCost)}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Custo de materiais</p>
                    <p className={styles.infoValue}>{formatBRL(postObraHealth.summary.totalMaterialCost)}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Chamados por nível de SLA</p>
                    <p className={styles.infoValue}>
                      {/* BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 4, 2026-10-06):
                          renderizava o código cru do enum (NONE/WARNING/CRITICAL/OVERDUE) sem
                          tradução — mesma Categoria 6 do catálogo já corrigida em outras telas. */}
                      {Object.entries(postObraHealth.summary.casesByEscalationLevel || {})
                        .filter(([, count]) => count > 0)
                        .map(([level, count]) => `${MAINTENANCE_ESCALATION_LABELS[level] || level}: ${count}`)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card
          title="Etapas"
          subtitle="Cronograma físico da obra"
          actions={<Button size="sm" variant="secondary" onClick={openStageModal}>
            <Icon name="plus" size={14} /> Nova etapa
          </Button>}
        >
          {stages.length === 0 ? (
            <EmptyState icon="layers" title="Sem etapas" description="Nenhuma etapa cadastrada para esta obra ainda." />
          ) : (
            <div className={styles.rowList}>
              {stages.map((s) => (
                <a key={s.id} href={`/painel/obras/lista/${project.id}/etapas/${s.id}`} className={styles.row}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{s.sequence}. {s.name}</span>
                    <span className={styles.rowSubtitle}>
                      Planejado {formatPercent(s.plannedPct)} · Medido {formatPercent(s.measuredPct)}
                    </span>
                  </div>
                  <Badge tone={STAGE_STATUS_TONE[s.status]}>{STAGE_STATUS_LABELS[s.status]}</Badge>
                  <button
                    type="button"
                    className={styles.rowEditBtn}
                    aria-label={`Editar etapa ${s.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openStageEditModal(s);
                    }}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="Áreas da obra" subtitle="Orçamento, aditivos, diário, medições, materiais e qualidade — agora em páginas dedicadas">
          <div className={styles.rowList}>
            <Link href={`/painel/obras/lista/${project.id}/orcamento`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Orçamento</span>
                <span className={styles.rowSubtitle}>{budgetLinesCount} linha(s) de orçamento</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
            <Link href={`/painel/obras/lista/${project.id}/change-orders`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Change Orders</span>
                <span className={styles.rowSubtitle}>{changeOrdersCount} registro(s)</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
            <Link href={`/painel/obras/lista/${project.id}/diario`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Diário de obra (RDO)</span>
                <span className={styles.rowSubtitle}>{reportsCount} relatório(s)</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
            <Link href={`/painel/obras/lista/${project.id}/medicoes`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Medições</span>
                <span className={styles.rowSubtitle}>Medições registradas por etapa</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
            <Link href={`/painel/obras/lista/${project.id}/materiais`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Materiais</span>
                <span className={styles.rowSubtitle}>Requisições e perdas/devoluções de material</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
            <Link href={`/painel/obras/lista/${project.id}/qualidade`} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Qualidade</span>
                <span className={styles.rowSubtitle}>Checklist de qualidade e não conformidades</span>
              </div>
              <Icon name="arrowUpCircle" size={16} />
            </Link>
          </div>
        </Card>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} loading={savingEdit} disabled={!editForm.name.trim() || editDateErrors.startsAt || editDateErrors.endsAtPlanned}>Salvar alterações</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Nome da obra" htmlFor="e-name" required>
              <Input id="e-name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Imóvel vinculado" htmlFor="e-property" helper="Opcional">
            <Select id="e-property" value={editForm.propertyId} onChange={(e) => setEditForm((p) => ({ ...p, propertyId: e.target.value }))}>
              <option value="">Nenhum</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável" htmlFor="e-responsible" helper="Opcional">
            <Select id="e-responsible" value={editForm.responsibleUserId} onChange={(e) => setEditForm((p) => ({ ...p, responsibleUserId: e.target.value }))}>
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Centro de custo" htmlFor="e-cost-center" helper="Opcional — usado no relatório de margem por obra">
            <Select id="e-cost-center" value={editForm.costCenterId} onChange={(e) => setEditForm((p) => ({ ...p, costCenterId: e.target.value }))}>
              <option value="">Nenhum</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Orçamento (R$)"
            htmlFor="e-budget"
            helper={budgetApproved ? "Baseline já aprovada — valor só muda via Change Order." : "Opcional"}
          >
            <DecimalInput
              id="e-budget"
              value={editForm.budgetAmount}
              onChange={(e) => setEditForm((p) => ({ ...p, budgetAmount: e.target.value }))}
              disabled={budgetApproved}
            />
          </FormField>
          <FormField
            label="Início"
            htmlFor="e-starts"
            helper={editDateErrors.startsAt ? undefined : "Opcional"}
            error={editDateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="e-starts"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={editDateErrors.startsAt}
              value={editForm.startsAt}
              onChange={(e) => {
                setEditDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }));
                setEditForm((p) => ({ ...p, startsAt: e.target.value }));
              }}
              onBlur={(e) => setEditDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
          <FormField
            label="Previsão de término"
            htmlFor="e-ends"
            helper={editDateErrors.endsAtPlanned ? undefined : "Opcional"}
            error={editDateErrors.endsAtPlanned ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="e-ends"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={editDateErrors.endsAtPlanned}
              value={editForm.endsAtPlanned}
              onChange={(e) => {
                setEditDateErrors((p) => ({ ...p, endsAtPlanned: isDateInputInvalid(e.target.validity) }));
                setEditForm((p) => ({ ...p, endsAtPlanned: e.target.value }));
              }}
              onBlur={(e) => setEditDateErrors((p) => ({ ...p, endsAtPlanned: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir a obra <strong>{project.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title="Cancelar obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelConfirmOpen(false)}>Voltar</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                await handleAdvanceStatus("CANCELLED");
                setCancelConfirmOpen(false);
              }}
            >
              Cancelar obra
            </Button>
          </>
        }
      >
        <p>Tem certeza que deseja cancelar a obra <strong>{project.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title={editingStageId ? "Editar etapa" : "Nova etapa"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStageOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveStage} loading={savingStage} disabled={!stageForm.name.trim() || stageForm.sequence === "" || stageDateErrors.startsAt || stageDateErrors.endsAt}>{editingStageId ? "Salvar alterações" : "Criar etapa"}</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Nome da etapa" htmlFor="m-stage-name" required>
              <Input id="m-stage-name" value={stageForm.name} onChange={(e) => setStageForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Fundação e estrutura" />
            </FormField>
          </div>
          <FormField label="Sequência" htmlFor="m-stage-seq" required>
            <Input id="m-stage-seq" type="number" min="1" value={stageForm.sequence} onChange={(e) => setStageForm((p) => ({ ...p, sequence: e.target.value }))} />
          </FormField>
          <FormField label="Percentual planejado (%)" htmlFor="m-stage-pct" helper="Opcional">
            <DecimalInput id="m-stage-pct" value={stageForm.plannedPct} onChange={(e) => setStageForm((p) => ({ ...p, plannedPct: e.target.value }))} />
          </FormField>
          <FormField
            label="Início previsto"
            htmlFor="m-stage-start"
            helper={stageDateErrors.startsAt ? undefined : "Opcional"}
            error={stageDateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="m-stage-start"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={stageDateErrors.startsAt}
              value={stageForm.startsAt}
              onChange={(e) => {
                setStageDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }));
                setStageForm((p) => ({ ...p, startsAt: e.target.value }));
              }}
              onBlur={(e) => setStageDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
          <FormField
            label="Término previsto"
            htmlFor="m-stage-end"
            helper={stageDateErrors.endsAt ? undefined : "Opcional"}
            error={stageDateErrors.endsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="m-stage-end"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={stageDateErrors.endsAt}
              value={stageForm.endsAt}
              onChange={(e) => {
                setStageDateErrors((p) => ({ ...p, endsAt: isDateInputInvalid(e.target.validity) }));
                setStageForm((p) => ({ ...p, endsAt: e.target.value }));
              }}
              onBlur={(e) => setStageDateErrors((p) => ({ ...p, endsAt: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
        </div>
      </Modal>
    </AppShell>
  );
}
