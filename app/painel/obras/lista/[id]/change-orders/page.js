"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { CHANGE_ORDER_STATUS_LABELS, CHANGE_ORDER_STATUS_TONE, CHANGE_ORDER_REASON_LABELS } from "@/lib/mock/construction";
import { getProject, listBudgets, listChangeOrders, createChangeOrder, decideChangeOrder } from "@/lib/api/construction";
import { uploadFile } from "@/lib/api/legal";
import { formatBRL, toNumber } from "@/lib/format";
import styles from "./page.module.css";

export default function ChangeOrdersObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [budget, setBudget] = useState(null);
  const [changeOrders, setChangeOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [viewerFileId, setViewerFileId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const [coOpen, setCoOpen] = useState(false);
  const [coForm, setCoForm] = useState({ reasonCode: "", description: "", budgetImpact: "", scheduleImpactDays: "", file: null });
  const [savingCo, setSavingCo] = useState(false);
  const [decidingCoId, setDecidingCoId] = useState(null);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getProject(params.id)
      .catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      })
      .then((p) => {
        if (cancelled || !p) return;
        setProject(p);
        return Promise.all([listBudgets(p.id), listChangeOrders(p.id)]).then(([budgets, cos]) => {
          if (cancelled) return;
          setBudget((budgets || [])[0] || null);
          setChangeOrders(cos || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os Change Orders.");
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
      <AppShell title="Change Orders" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Change Orders" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar os Change Orders">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Change Orders" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  function openChangeOrderModal() {
    setCoForm({ reasonCode: "", description: "", budgetImpact: "", scheduleImpactDays: "", file: null });
    setCoOpen(true);
  }

  const isChangeOrderValid =
    coForm.reasonCode !== "" && coForm.description.trim() !== "" && coForm.budgetImpact !== "" && !Number.isNaN(toNumber(coForm.budgetImpact));

  async function handleCreateChangeOrder() {
    // BUG REAL CORRIGIDO (auditoria Marco 6, Ciclo 9): duplo-clique nativo criava 2 Change
    // Orders duplicados — createChangeOrder é um INSERT simples, sem checagem de duplicidade
    // no backend.
    if (savingCo) return;
    if (!isChangeOrderValid) return;
    setSavingCo(true);
    setActionError("");
    try {
      let evidenceFileIds;
      if (coForm.file) {
        const uploaded = await uploadFile(coForm.file);
        evidenceFileIds = [uploaded.id];
      }
      const created = await createChangeOrder(project.id, {
        reasonCode: coForm.reasonCode,
        description: coForm.description.trim(),
        budgetImpact: toNumber(coForm.budgetImpact),
        scheduleImpactDays: coForm.scheduleImpactDays !== "" ? Number(coForm.scheduleImpactDays) : undefined,
        evidenceFileIds,
      });
      setChangeOrders((prev) => [created, ...prev]);
      setCoOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o Change Order.");
    } finally {
      setSavingCo(false);
    }
  }

  async function handleDecideChangeOrder(changeOrder, decision) {
    const isApprove = decision === "APPROVE";
    const ok = await confirm({
      title: isApprove ? "Aprovar este aditivo (Change Order)?" : "Rejeitar este aditivo (Change Order)?",
      message: isApprove
        ? "O aditivo será aprovado e o orçamento da obra será atualizado de acordo."
        : "O aditivo será rejeitado e o orçamento da obra não será alterado por ele.",
      confirmLabel: isApprove ? "Aprovar" : "Rejeitar",
      tone: isApprove ? "primary" : "danger",
    });
    if (!ok) return;

    setDecidingCoId(changeOrder.id);
    setActionError("");
    try {
      const updated = await decideChangeOrder(changeOrder.id, decision);
      setChangeOrders((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (decision === "APPROVE") {
        const budgets = await listBudgets(project.id);
        setBudget((budgets || [])[0] || null);
      }
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir o Change Order.");
    } finally {
      setDecidingCoId(null);
    }
  }

  return (
    <AppShell title={`Change Orders — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <Card
          title="Change Orders"
          subtitle="Mudanças de escopo/prazo/custo — só alteram a baseline aprovada quando decididas"
          actions={
            <Button size="sm" variant="secondary" onClick={openChangeOrderModal} disabled={!budget}>
              <Icon name="plus" size={14} /> Novo Change Order
            </Button>
          }
        >
          {!budget ? (
            <EmptyState icon="document" title="Sem orçamento" description="Crie o orçamento agregado da obra antes de registrar Change Orders." />
          ) : changeOrders.length === 0 ? (
            <EmptyState icon="document" title="Sem Change Orders" description="Nenhum Change Order registrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {changeOrders.map((co) => (
                <div key={co.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>
                      {CHANGE_ORDER_REASON_LABELS[co.reasonCode] || co.reasonCode} · {formatBRL(co.budgetImpact)}
                      {co.scheduleImpactDays ? ` · ${co.scheduleImpactDays} dia(s) de prazo` : ""}
                    </span>
                    <span className={styles.rowSubtitle}>{co.description}</span>
                    {co.evidenceFileIds?.length ? (
                      <span className={styles.rowSubtitle}>
                        {co.evidenceFileIds.length} evidência(s) anexada(s) —{" "}
                        {co.evidenceFileIds.map((fid, idx) => (
                          <button
                            key={fid}
                            type="button"
                            style={{ background: "none", border: "none", padding: 0, color: "var(--color-brand)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                            onClick={() => setViewerFileId(fid)}
                          >
                            {idx > 0 ? ", " : ""}ver {idx + 1}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.rowRight}>
                    <Badge tone={CHANGE_ORDER_STATUS_TONE[co.status]}>{CHANGE_ORDER_STATUS_LABELS[co.status] || co.status}</Badge>
                    {co.status === "PENDING_APPROVAL" ? (
                      <div className={styles.quickActions}>
                        <Button size="sm" variant="secondary" onClick={() => handleDecideChangeOrder(co, "APPROVE")} loading={decidingCoId === co.id}>Aprovar</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDecideChangeOrder(co, "REJECT")} loading={decidingCoId === co.id}>Rejeitar</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={coOpen}
        onClose={() => setCoOpen(false)}
        title="Novo Change Order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateChangeOrder} loading={savingCo} disabled={!isChangeOrderValid}>Criar Change Order</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Motivo" htmlFor="m-co-reason" required>
            <Select id="m-co-reason" value={coForm.reasonCode} onChange={(e) => setCoForm((p) => ({ ...p, reasonCode: e.target.value }))}>
              <option value="">Selecione…</option>
              {Object.entries(CHANGE_ORDER_REASON_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Impacto financeiro (R$)" htmlFor="m-co-impact" required helper="Positivo aumenta o orçamento, negativo reduz">
            <DecimalInput id="m-co-impact" value={coForm.budgetImpact} onChange={(e) => setCoForm((p) => ({ ...p, budgetImpact: e.target.value }))} placeholder="0,00" />
          </FormField>
          <FormField label="Impacto de prazo (dias)" htmlFor="m-co-schedule" helper="Opcional">
            <Input id="m-co-schedule" type="number" value={coForm.scheduleImpactDays} onChange={(e) => setCoForm((p) => ({ ...p, scheduleImpactDays: e.target.value }))} placeholder="0" />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-co-description" required>
              <textarea
                id="m-co-description"
                className={styles.textarea}
                rows={3}
                value={coForm.description}
                onChange={(e) => setCoForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Detalhe a mudança de escopo/condição que motiva este Change Order"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Evidência" htmlFor="m-co-file">
              <FileDropInput
                id="m-co-file"
                fileNames={coForm.file ? [coForm.file.name] : []}
                onFiles={(files) => setCoForm((p) => ({ ...p, file: files[0] || null }))}
                onRemove={() => setCoForm((p) => ({ ...p, file: null }))}
                helper="Opcional — foto, documento ou planilha que sustente o pedido"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <ConfirmDialog />

      <FileViewerModal
        open={!!viewerFileId}
        onClose={() => setViewerFileId(null)}
        fileId={viewerFileId}
      />
    </AppShell>
  );
}
