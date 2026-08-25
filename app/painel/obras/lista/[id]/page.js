"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
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
import Select from "@/components/atoms/Select/Select";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  PROJECT_STATUS_FLOW,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  QUALITY_STATUS_LABELS,
  QUALITY_STATUS_TONE,
} from "@/lib/mock/construction";
import {
  getProject,
  updateProject,
  transitionProject,
  removeProject,
  listProjectStages,
  createProjectStage,
  listDailyReports,
  createDailyReport,
  listBudgetLines,
  createBudgetLine,
  listQualityItems,
  createQualityItem,
  checkQualityItem,
} from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

const WEATHER_OPTIONS = ["Ensolarado", "Nublado", "Chuvoso", "Ventania"];

export default function ObraDetalhePage({ params }) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [reports, setReports] = useState([]);
  const [budgetLines, setBudgetLines] = useState([]);
  const [qualityItems, setQualityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", propertyId: "", responsibleUserId: "", budgetAmount: "", startsAt: "", endsAtPlanned: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ name: "", sequence: "1", plannedPct: "" });
  const [savingStage, setSavingStage] = useState(false);

  const [rdoOpen, setRdoOpen] = useState(false);
  const [rdoForm, setRdoForm] = useState({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "" });
  const [savingRdo, setSavingRdo] = useState(false);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "", description: "", plannedAmount: "" });
  const [savingBudget, setSavingBudget] = useState(false);

  const [qualityOpen, setQualityOpen] = useState(false);
  const [qualityForm, setQualityForm] = useState({ item: "", projectStageId: "" });
  const [savingQuality, setSavingQuality] = useState(false);

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
      apiFetch("/users"),
    ])
      .then(([p, props, u]) => {
        if (cancelled || !p) return;
        setProject(p);
        setProperties(props || []);
        setUsers(u || []);
        return Promise.all([
          listProjectStages(p.id),
          listDailyReports(p.id),
          listBudgetLines(p.id),
          listQualityItems(p.id),
        ]).then(([st, rd, bl, qi]) => {
          if (cancelled) return;
          setStages(st || []);
          setReports((rd || []).slice(0, 5));
          setBudgetLines(bl || []);
          setQualityItems(qi || []);
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
        budgetAmount: editForm.budgetAmount !== "" ? Number(editForm.budgetAmount) : null,
        startsAt: editForm.startsAt ? new Date(editForm.startsAt).toISOString() : null,
        endsAtPlanned: editForm.endsAtPlanned ? new Date(editForm.endsAtPlanned).toISOString() : null,
      });
      setProject(updated);
      setEditOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleQualityQuickAction(item, status) {
    setActionError("");
    try {
      const updated = await checkQualityItem(item.id, { status });
      setQualityItems((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o item de qualidade.");
    }
  }

  function openStageModal() {
    setStageForm({ name: "", sequence: String(stages.length + 1), plannedPct: "" });
    setStageOpen(true);
  }
  async function handleCreateStage() {
    if (!stageForm.name.trim() || stageForm.sequence === "") return;
    setSavingStage(true);
    setActionError("");
    try {
      const created = await createProjectStage(project.id, {
        name: stageForm.name.trim(),
        sequence: Number(stageForm.sequence),
        plannedPct: stageForm.plannedPct ? Number(stageForm.plannedPct) : undefined,
      });
      setStages((prev) => [...prev, created]);
      setStageOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a etapa.");
    } finally {
      setSavingStage(false);
    }
  }

  function openRdoModal() {
    setRdoForm({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "" });
    setRdoOpen(true);
  }
  async function handleCreateRdo() {
    if (!rdoForm.reportDate || !rdoForm.weather || rdoForm.workforceCount === "") return;
    setSavingRdo(true);
    setActionError("");
    try {
      const created = await createDailyReport(project.id, {
        reportDate: rdoForm.reportDate,
        weather: rdoForm.weather,
        workforceCount: Number(rdoForm.workforceCount),
        occurrences: rdoForm.occurrences.trim() || undefined,
      });
      setReports((prev) => [created, ...prev].slice(0, 5));
      setRdoOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o RDO.");
    } finally {
      setSavingRdo(false);
    }
  }

  function openBudgetModal() {
    setBudgetForm({ category: "", description: "", plannedAmount: "" });
    setBudgetOpen(true);
  }
  async function handleCreateBudgetLine() {
    if (!budgetForm.category.trim() || budgetForm.plannedAmount === "" || Number(budgetForm.plannedAmount) < 0) return;
    setSavingBudget(true);
    setActionError("");
    try {
      const created = await createBudgetLine(project.id, {
        category: budgetForm.category.trim(),
        description: budgetForm.description.trim() || undefined,
        plannedAmount: Number(budgetForm.plannedAmount),
      });
      setBudgetLines((prev) => [...prev, created]);
      setBudgetOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a linha de orçamento.");
    } finally {
      setSavingBudget(false);
    }
  }

  function openQualityModal() {
    setQualityForm({ item: "", projectStageId: "" });
    setQualityOpen(true);
  }
  async function handleCreateQualityItem() {
    if (!qualityForm.item.trim()) return;
    setSavingQuality(true);
    setActionError("");
    try {
      const created = await createQualityItem(project.id, {
        item: qualityForm.item.trim(),
        projectStageId: qualityForm.projectStageId || undefined,
      });
      setQualityItems((prev) => [...prev, created]);
      setQualityOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o item de checklist.");
    } finally {
      setSavingQuality(false);
    }
  }

  const totalPlanned = budgetLines.reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
  const totalActual = budgetLines.reduce((s, b) => s + Number(b.actualAmount || 0), 0);

  return (
    <AppShell title={project.name} backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {nextStatuses.length > 0 ? (
              nextStatuses.map((status) => (
                <Button key={status} variant="secondary" onClick={() => handleAdvanceStatus(status)} loading={busy}>
                  <Icon name="arrowUpCircle" size={16} /> {PROJECT_STATUS_LABELS[status]}
                </Button>
              ))
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
                      Planejado {s.plannedPct}% · Medido {s.measuredPct != null ? `${s.measuredPct}%` : "—"}
                    </span>
                  </div>
                  <Badge tone={STAGE_STATUS_TONE[s.status]}>{STAGE_STATUS_LABELS[s.status]}</Badge>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="RDO — Relatório Diário de Obra"
          subtitle="Últimos registros"
          actions={<Button size="sm" variant="secondary" onClick={openRdoModal}>
            <Icon name="plus" size={14} /> Novo RDO
          </Button>}
        >
          {reports.length === 0 ? (
            <EmptyState icon="document" title="Sem RDOs" description="Nenhum relatório diário de obra registrado ainda." />
          ) : (
            <div className={styles.rowList}>
              {reports.map((r) => (
                <div key={r.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{formatDate(r.reportDate)} · {r.weather}</span>
                    <span className={styles.rowSubtitle}>
                      Efetivo: {r.workforceCount} · {r.occurrences || "Sem ocorrências"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Orçamento"
          subtitle="Linhas de orçamento por categoria"
          actions={<Button size="sm" variant="secondary" onClick={openBudgetModal}>
            <Icon name="plus" size={14} /> Nova linha de orçamento
          </Button>}
        >
          {budgetLines.length === 0 ? (
            <EmptyState icon="money" title="Sem linhas de orçamento" description="Nenhuma linha de orçamento cadastrada para esta obra." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Planejado</th>
                    <th>Realizado</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((b) => (
                    <tr key={b.id}>
                      <td>{b.category}</td>
                      <td>{b.description || "—"}</td>
                      <td>{formatBRL(b.plannedAmount)}</td>
                      <td>{formatBRL(b.actualAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td><strong>{formatBRL(totalPlanned)}</strong></td>
                    <td><strong>{formatBRL(totalActual)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Qualidade"
          subtitle="Checklist de qualidade"
          actions={<Button size="sm" variant="secondary" onClick={openQualityModal}>
            <Icon name="plus" size={14} /> Novo item de checklist
          </Button>}
        >
          {qualityItems.length === 0 ? (
            <EmptyState icon="check" title="Sem itens de checklist" description="Nenhum item de qualidade cadastrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {qualityItems.map((q) => {
                const checkedBy = q.checkedByUserId ? users.find((u) => u.id === q.checkedByUserId) : null;
                return (
                  <div key={q.id} className={styles.rowStatic}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{q.item}</span>
                      <span className={styles.rowSubtitle}>
                        {checkedBy ? `Verificado por ${checkedBy.name}` : "Ainda não verificado"}
                      </span>
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={QUALITY_STATUS_TONE[q.status]}>{QUALITY_STATUS_LABELS[q.status]}</Badge>
                      {q.status === "PENDING" ? (
                        <div className={styles.quickActions}>
                          <Button size="sm" variant="secondary" onClick={() => handleQualityQuickAction(q, "OK")}>OK</Button>
                          <Button size="sm" variant="danger" onClick={() => handleQualityQuickAction(q, "NOT_OK")}>Não OK</Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} loading={savingEdit} disabled={!editForm.name.trim()}>Salvar alterações</Button>
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
          <FormField label="Orçamento (R$)" htmlFor="e-budget" helper="Opcional">
            <Input id="e-budget" type="number" min="0" step="0.01" value={editForm.budgetAmount} onChange={(e) => setEditForm((p) => ({ ...p, budgetAmount: e.target.value }))} />
          </FormField>
          <FormField label="Início" htmlFor="e-starts" helper="Opcional">
            <Input id="e-starts" type="date" value={editForm.startsAt} onChange={(e) => setEditForm((p) => ({ ...p, startsAt: e.target.value }))} />
          </FormField>
          <FormField label="Previsão de término" htmlFor="e-ends" helper="Opcional">
            <Input id="e-ends" type="date" value={editForm.endsAtPlanned} onChange={(e) => setEditForm((p) => ({ ...p, endsAtPlanned: e.target.value }))} />
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
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title="Nova etapa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStageOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateStage} loading={savingStage} disabled={!stageForm.name.trim() || stageForm.sequence === ""}>Criar etapa</Button>
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
            <Input id="m-stage-pct" type="number" min="0" max="100" value={stageForm.plannedPct} onChange={(e) => setStageForm((p) => ({ ...p, plannedPct: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={rdoOpen}
        onClose={() => setRdoOpen(false)}
        title="Novo RDO"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRdoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateRdo} loading={savingRdo} disabled={!rdoForm.reportDate || !rdoForm.weather || rdoForm.workforceCount === ""}>Registrar RDO</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Data" htmlFor="m-rdo-date" required>
            <Input id="m-rdo-date" type="date" value={rdoForm.reportDate} onChange={(e) => setRdoForm((p) => ({ ...p, reportDate: e.target.value }))} />
          </FormField>
          <FormField label="Clima" htmlFor="m-rdo-weather" required>
            <Select id="m-rdo-weather" value={rdoForm.weather} onChange={(e) => setRdoForm((p) => ({ ...p, weather: e.target.value }))}>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Efetivo (nº de trabalhadores)" htmlFor="m-rdo-workforce" required>
            <Input id="m-rdo-workforce" type="number" min="0" value={rdoForm.workforceCount} onChange={(e) => setRdoForm((p) => ({ ...p, workforceCount: e.target.value }))} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Ocorrências" htmlFor="m-rdo-occurrences" helper="Opcional">
              <textarea
                id="m-rdo-occurrences"
                className={styles.textarea}
                rows={3}
                value={rdoForm.occurrences}
                onChange={(e) => setRdoForm((p) => ({ ...p, occurrences: e.target.value }))}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Nova linha de orçamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBudgetLine} loading={savingBudget} disabled={!budgetForm.category.trim() || budgetForm.plannedAmount === ""}>Criar linha</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Categoria" htmlFor="m-budget-category" required>
            <Input id="m-budget-category" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: Fundação e estrutura" />
          </FormField>
          <FormField label="Valor planejado (R$)" htmlFor="m-budget-planned" required>
            <Input id="m-budget-planned" type="number" min="0" step="0.01" value={budgetForm.plannedAmount} onChange={(e) => setBudgetForm((p) => ({ ...p, plannedAmount: e.target.value }))} placeholder="0,00" />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-budget-description" helper="Opcional">
              <Input id="m-budget-description" value={budgetForm.description} onChange={(e) => setBudgetForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detalhes da linha de orçamento" />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={qualityOpen}
        onClose={() => setQualityOpen(false)}
        title="Novo item de checklist"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQualityOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQualityItem} loading={savingQuality} disabled={!qualityForm.item.trim()}>Criar item</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição do item" htmlFor="m-quality-item" required>
              <Input id="m-quality-item" value={qualityForm.item} onChange={(e) => setQualityForm((p) => ({ ...p, item: e.target.value }))} placeholder="Ex: Verificar prumo e nível da fundação" />
            </FormField>
          </div>
          <FormField label="Etapa vinculada" htmlFor="m-quality-stage" helper="Opcional">
            <Select id="m-quality-stage" value={qualityForm.projectStageId} onChange={(e) => setQualityForm((p) => ({ ...p, projectStageId: e.target.value }))}>
              <option value="">Obra toda</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>
    </AppShell>
  );
}
