"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
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
import Radio from "@/components/atoms/Radio/Radio";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { BUDGET_STATUS_LABELS, BUDGET_STATUS_TONE } from "@/lib/mock/construction";
import {
  getProject,
  listBudgetLines,
  createBudgetLine,
  updateBudgetLine,
  removeBudgetLine,
  listBudgets,
  createBudget,
  approveBudget,
  getActiveMarginRule,
  createMarginRule,
} from "@/lib/api/construction";
import { formatBRL, toNumber } from "@/lib/format";
import { isInvalidNumber } from "../_components/obraShared";
import styles from "./page.module.css";

export default function OrcamentoObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [budgetLines, setBudgetLines] = useState([]);
  const [budget, setBudget] = useState(null);
  const [activeMarginRule, setActiveMarginRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "", description: "", plannedAmount: "" });
  const [editingBudgetLineId, setEditingBudgetLineId] = useState(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [deletingBudgetLineId, setDeletingBudgetLineId] = useState(null);

  const [creatingBudget, setCreatingBudget] = useState(false);
  const [approveBudgetOpen, setApproveBudgetOpen] = useState(false);
  const [approvingBudget, setApprovingBudget] = useState(false);

  const [marginRuleOpen, setMarginRuleOpen] = useState(false);
  const [marginRuleError, setMarginRuleError] = useState("");
  const [marginRulePct, setMarginRulePct] = useState("");
  const [marginEconomyPct, setMarginEconomyPct] = useState("");
  const [marginCommissionPct, setMarginCommissionPct] = useState("");
  const [marginEnforcementMode, setMarginEnforcementMode] = useState("ALERT");
  const [savingMarginRule, setSavingMarginRule] = useState(false);

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
      getActiveMarginRule().catch(() => null),
    ])
      .then(([p, marginRule]) => {
        if (cancelled || !p) return;
        setProject(p);
        setActiveMarginRule(marginRule);
        return Promise.all([listBudgetLines(p.id), listBudgets(p.id)]).then(([bl, budgets]) => {
          if (cancelled) return;
          setBudgetLines(bl || []);
          setBudget((budgets || [])[0] || null);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o orçamento.");
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
      <AppShell title="Orçamento" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Orçamento" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar o orçamento">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Orçamento" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  function openBudgetModal() {
    setEditingBudgetLineId(null);
    setBudgetForm({ category: "", description: "", plannedAmount: "" });
    setBudgetOpen(true);
  }

  async function handleDeleteBudgetLine(line) {
    if (deletingBudgetLineId) return;
    const ok = await confirm({
      title: "Excluir linha de orçamento?",
      message: `A linha "${line.category}" será removida. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setActionError("");
    setDeletingBudgetLineId(line.id);
    try {
      await removeBudgetLine(line.id);
      setBudgetLines((prev) => prev.filter((l) => l.id !== line.id));
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir a linha de orçamento.");
    } finally {
      setDeletingBudgetLineId(null);
    }
  }

  function openBudgetLineEditModal(line) {
    setEditingBudgetLineId(line.id);
    setBudgetForm({
      category: line.category || "",
      description: line.description || "",
      plannedAmount: line.plannedAmount != null ? String(Number(line.plannedAmount)).replace(".", ",") : "",
    });
    setBudgetOpen(true);
  }

  async function handleCreateBudgetLine() {
    // BUG REAL CORRIGIDO (auditoria Marco 6, Ciclo 9): duplo-clique nativo criava 2 linhas de
    // orçamento duplicadas (ou aplicava a mesma edição 2x) — createBudgetLine/updateBudgetLine
    // são INSERTs/UPDATEs simples, sem checagem de duplicidade no backend.
    if (savingBudget) return;
    if (!budgetForm.category.trim() || isInvalidNumber(budgetForm.plannedAmount, { allowZero: true })) return;
    setSavingBudget(true);
    setActionError("");
    try {
      if (editingBudgetLineId) {
        const payload = { category: budgetForm.category.trim(), description: budgetForm.description.trim() || null };
        if (budget?.status !== "APPROVED") payload.plannedAmount = toNumber(budgetForm.plannedAmount);
        const updated = await updateBudgetLine(editingBudgetLineId, payload);
        setBudgetLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        // BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 1, 2026-10-06): era possível
        // criar uma linha de orçamento ANTES de existir o orçamento agregado — a linha nascia
        // com budgetId=null, permanentemente órfã. Quando o orçamento agregado era criado e
        // aprovado depois, approveBudget soma só as linhas com budgetId igual ao aprovado, então
        // a baseline congelada saía errada (sem a linha órfã), gerando alerta de margem negativa
        // falso no NAY Obras mesmo com orçamento e custo batendo de verdade. Fix: garante que o
        // orçamento agregado exista ANTES de criar a primeira linha, nunca manda budgetId vazio.
        let currentBudget = budget;
        if (!currentBudget) {
          currentBudget = await createBudget(project.id);
          setBudget(currentBudget);
        }
        const created = await createBudgetLine(project.id, {
          category: budgetForm.category.trim(),
          description: budgetForm.description.trim() || undefined,
          plannedAmount: toNumber(budgetForm.plannedAmount),
          budgetId: currentBudget.id,
        });
        setBudgetLines((prev) => [...prev, created]);
      }
      setBudgetOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a linha de orçamento.");
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleCreateBudget() {
    setCreatingBudget(true);
    setActionError("");
    try {
      const created = await createBudget(project.id);
      setBudget(created);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o orçamento agregado.");
    } finally {
      setCreatingBudget(false);
    }
  }

  async function handleApproveBudget() {
    if (!budget) return;
    setApprovingBudget(true);
    setActionError("");
    try {
      const updated = await approveBudget(budget.id);
      setBudget(updated);
      setApproveBudgetOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar o orçamento.");
    } finally {
      setApprovingBudget(false);
    }
  }

  function openMarginRuleModal() {
    setMarginRulePct(activeMarginRule ? String(Number(activeMarginRule.minMarginPct)).replace(".", ",") : "");
    setMarginEconomyPct(
      activeMarginRule && activeMarginRule.economyPct !== null && activeMarginRule.economyPct !== undefined
        ? String(Number(activeMarginRule.economyPct)).replace(".", ",")
        : ""
    );
    setMarginCommissionPct(
      activeMarginRule && activeMarginRule.commissionPct !== null && activeMarginRule.commissionPct !== undefined
        ? String(Number(activeMarginRule.commissionPct)).replace(".", ",")
        : ""
    );
    setMarginEnforcementMode(activeMarginRule?.enforcementMode === "BLOCK" ? "BLOCK" : "ALERT");
    setMarginRuleError("");
    setMarginRuleOpen(true);
  }

  async function handleSaveMarginRule() {
    if (marginRulePct === "" || Number.isNaN(toNumber(marginRulePct)) || toNumber(marginRulePct) < 0 || toNumber(marginRulePct) > 100) return;
    setSavingMarginRule(true);
    setMarginRuleError("");
    try {
      const rule = await createMarginRule({
        groupId: project.groupId,
        companyId: project.companyId,
        minMarginPct: toNumber(marginRulePct),
        economyPct: marginEconomyPct === "" ? null : toNumber(marginEconomyPct),
        commissionPct: marginCommissionPct === "" ? null : toNumber(marginCommissionPct),
        enforcementMode: marginEnforcementMode,
      });
      setActiveMarginRule(rule);
      setMarginRuleOpen(false);
    } catch (err) {
      // FIX (auditoria E2E de browser, ciclo 3, 02/10/2026): o erro era gravado em
      // actionError, que só é exibido na tela PRINCIPAL por trás do modal — com o modal
      // aberto por cima, o usuário não via nenhum feedback e a ação parecia travar
      // silenciosamente. Erro agora aparece dentro do próprio modal.
      setMarginRuleError(err?.message || "Não foi possível salvar a margem mínima.");
    } finally {
      setSavingMarginRule(false);
    }
  }

  const totalPlanned = budgetLines.reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
  const totalActual = budgetLines.reduce((s, b) => s + Number(b.actualAmount || 0), 0);

  return (
    <AppShell title={`Orçamento — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <Card
          title="Orçamento"
          subtitle="Linhas de orçamento por categoria"
          actions={
            <div className={styles.quickActions}>
              {!budget ? (
                <Button size="sm" variant="secondary" onClick={handleCreateBudget} loading={creatingBudget}>
                  <Icon name="plus" size={14} /> Criar orçamento agregado
                </Button>
              ) : budget.status === "DRAFT" ? (
                <Button size="sm" variant="primary" onClick={() => setApproveBudgetOpen(true)}>
                  <Icon name="check" size={14} /> Aprovar orçamento
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={openBudgetModal} disabled={budget?.status === "APPROVED"}>
                <Icon name="plus" size={14} /> Nova linha de orçamento
              </Button>
              <Button size="sm" variant="ghost" onClick={openMarginRuleModal}>
                <Icon name="key" size={14} /> Configurar margem mínima
              </Button>
            </div>
          }
        >
          {!activeMarginRule ? (
            <Alert tone="warning" title="Margem mínima não configurada">
              <>
                A aprovação de orçamento desta empresa será recusada até configurar uma margem
                mínima.{" "}
                <Button size="sm" variant="secondary" onClick={openMarginRuleModal} style={{ marginTop: "var(--space-2)" }}>
                  Configurar agora
                </Button>
              </>
            </Alert>
          ) : null}
          {budget ? (
            <div className={styles.rowStatic} style={{ marginBottom: "var(--space-3)" }}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Orçamento agregado</span>
                <span className={styles.rowSubtitle}>
                  {budget.status === "APPROVED"
                    ? `Baseline congelada em ${formatBRL(budget.baselineAmount)} — valores das linhas bloqueados (só alteram via Change Order aprovado).`
                    : "Ainda em rascunho — valores das linhas podem ser ajustados livremente até a aprovação."}
                </span>
              </div>
              <Badge tone={BUDGET_STATUS_TONE[budget.status]}>{BUDGET_STATUS_LABELS[budget.status] || budget.status}</Badge>
            </div>
          ) : (
            <Alert tone="info">Esta obra ainda não tem um orçamento agregado — crie um para poder aprovar a baseline e usar Change Orders.</Alert>
          )}
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((b) => (
                    <tr key={b.id}>
                      <td>{b.category}</td>
                      <td>{b.description || "—"}</td>
                      <td>
                        {formatBRL(b.plannedAmount)}
                        {budget?.status === "APPROVED" && b.budgetId === budget.id ? (
                          <Icon name="key" size={12} style={{ marginLeft: "var(--space-1)" }} />
                        ) : null}
                      </td>
                      <td>{formatBRL(b.actualAmount)}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className={styles.rowEditBtn}
                          aria-label={`Editar linha ${b.category}`}
                          onClick={() => openBudgetLineEditModal(b)}
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                        {!(budget?.status === "APPROVED" && b.budgetId === budget.id) ? (
                          <button
                            type="button"
                            className={styles.rowEditBtn}
                            aria-label={`Excluir linha ${b.category}`}
                            disabled={deletingBudgetLineId === b.id}
                            onClick={() => handleDeleteBudgetLine(b)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        ) : null}
                      </td>
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
      </div>

      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title={editingBudgetLineId ? "Editar linha de orçamento" : "Nova linha de orçamento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBudgetLine} loading={savingBudget} disabled={!budgetForm.category.trim() || isInvalidNumber(budgetForm.plannedAmount, { allowZero: true })}>{editingBudgetLineId ? "Salvar alterações" : "Criar linha"}</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Categoria" htmlFor="m-budget-category" required>
            <Input id="m-budget-category" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: Fundação e estrutura" />
          </FormField>
          <FormField
            label="Valor planejado (R$)"
            htmlFor="m-budget-planned"
            required
            helper={editingBudgetLineId && budget?.status === "APPROVED" ? "Baseline já aprovada — valor só muda via Change Order." : undefined}
          >
            <DecimalInput
              id="m-budget-planned"
              value={budgetForm.plannedAmount}
              onChange={(e) => setBudgetForm((p) => ({ ...p, plannedAmount: e.target.value }))}
              placeholder="0,00"
              disabled={editingBudgetLineId != null && budget?.status === "APPROVED"}
            />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-budget-description" helper="Opcional">
              <Input id="m-budget-description" value={budgetForm.description} onChange={(e) => setBudgetForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detalhes da linha de orçamento" />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={approveBudgetOpen}
        onClose={() => setApproveBudgetOpen(false)}
        title="Aprovar orçamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveBudgetOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleApproveBudget} loading={approvingBudget} disabled={!activeMarginRule}>Confirmar aprovação</Button>
          </>
        }
      >
        {!activeMarginRule ? (
          <Alert tone="warning" title="Margem mínima não configurada">
            <>
              Esta empresa ainda não tem uma margem mínima configurada — a aprovação será
              recusada até isso ser feito.{" "}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setApproveBudgetOpen(false); openMarginRuleModal(); }}
                style={{ marginTop: "var(--space-2)" }}
              >
                Configurar agora
              </Button>
            </>
          </Alert>
        ) : (
          <p>
            Tem certeza que deseja aprovar este orçamento? A baseline será <strong>congelada</strong> em{" "}
            <strong>{formatBRL(totalPlanned)}</strong> e passa a ser <strong>imutável</strong> — depois disso, o valor
            das linhas de orçamento só pode mudar através de um Change Order aprovado. Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>

      <Modal
        open={marginRuleOpen}
        onClose={() => setMarginRuleOpen(false)}
        title="Configurar margem mínima"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarginRuleOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMarginRule} loading={savingMarginRule} disabled={marginRulePct === "" || Number.isNaN(toNumber(marginRulePct)) || toNumber(marginRulePct) < 0 || toNumber(marginRulePct) > 100}>Salvar</Button>
          </>
        }
      >
        {marginRuleError ? <Alert tone="danger">{marginRuleError}</Alert> : null}
        <FormField
          label="Margem mínima exigida (%)"
          htmlFor="m-margin-pct"
          required
          helper="É obrigatório ter uma margem mínima configurada para aprovar qualquer orçamento. Depois de aprovado, a Saúde da obra compara a margem projetada (receita - custo) com este percentual e avisa quando estiver abaixo — não bloqueia a aprovação em si, pois o custo real só é conhecido durante a execução da obra. Salvar cria uma nova versão — a versão anterior fica preservada no histórico, sem afetar orçamentos já aprovados com ela. Configuração válida para toda a empresa."
        >
          <DecimalInput
            id="m-margin-pct"
            value={marginRulePct}
            onChange={(e) => setMarginRulePct(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="10,00"
          />
        </FormField>

        <FormField
          label="Economia (%)"
          htmlFor="m-economy-pct"
          helper="Opcional — percentual de economia esperado sobre o custo, usado apenas como referência informativa."
        >
          <DecimalInput
            id="m-economy-pct"
            value={marginEconomyPct}
            onChange={(e) => setMarginEconomyPct(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0,00"
          />
        </FormField>

        <FormField
          label="Comissão (%)"
          htmlFor="m-commission-pct"
          helper="Opcional — percentual de comissão considerado no cálculo de margem."
        >
          <DecimalInput
            id="m-commission-pct"
            value={marginCommissionPct}
            onChange={(e) => setMarginCommissionPct(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0,00"
          />
        </FormField>

        <FormField
          label="Comportamento quando a margem ficar abaixo do mínimo"
          htmlFor="m-enforcement-alert"
          helper="Alertar apenas avisa na Saúde da obra. Bloquear impede a aprovação do orçamento e de change orders enquanto a margem projetada estiver abaixo do mínimo."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Radio
              id="m-enforcement-alert"
              name="marginEnforcementMode"
              label="Apenas alertar"
              checked={marginEnforcementMode === "ALERT"}
              onChange={() => setMarginEnforcementMode("ALERT")}
            />
            <Radio
              id="m-enforcement-block"
              name="marginEnforcementMode"
              label="Bloquear aprovação"
              checked={marginEnforcementMode === "BLOCK"}
              onChange={() => setMarginEnforcementMode("BLOCK")}
            />
          </div>
        </FormField>
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
