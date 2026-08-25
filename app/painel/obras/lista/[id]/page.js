"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import {
  PROJECTS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  PROJECT_STATUS_FLOW,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  QUALITY_STATUS_LABELS,
  QUALITY_STATUS_TONE,
  stagesOf,
  reportsOf,
  budgetLinesOf,
  qualityItemsOf,
} from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function ObraDetalhePage({ params }) {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const project = PROJECTS.find((p) => p.id === params.id);

  const stages = useMemo(() => (project ? stagesOf(project.id) : []), [project, forceUpdate]);
  const reports = useMemo(() => (project ? reportsOf(project.id).slice(0, 5) : []), [project, forceUpdate]);
  const budgetLines = useMemo(() => (project ? budgetLinesOf(project.id) : []), [project, forceUpdate]);
  const qualityItems = useMemo(() => (project ? qualityItemsOf(project.id) : []), [project, forceUpdate]);

  if (!project) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">
          Não existe nenhuma obra com este identificador.
        </Alert>
      </AppShell>
    );
  }

  const property = project.propertyId ? PROPERTIES.find((p) => p.id === project.propertyId) : null;
  const responsible = project.responsibleUserId ? USERS.find((u) => u.id === project.responsibleUserId) : null;
  const nextStatuses = PROJECT_STATUS_FLOW[project.status] || [];

  function rerender() {
    forceUpdate((n) => n + 1);
  }

  function handleAdvanceStatus(nextStatus) {
    project.status = nextStatus;
    rerender();
  }

  function handleDelete() {
    const idx = PROJECTS.findIndex((p) => p.id === project.id);
    if (idx >= 0) PROJECTS.splice(idx, 1);
    router.push("/painel/obras/lista");
  }

  function handleQualityQuickAction(item, status) {
    item.status = status;
    item.checkedAt = new Date().toISOString();
    rerender();
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
                <Button key={status} variant="secondary" onClick={() => handleAdvanceStatus(status)}>
                  <Icon name="arrowUpCircle" size={16} /> {PROJECT_STATUS_LABELS[status]}
                </Button>
              ))
            ) : null}
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
          actions={<Button size="sm" variant="secondary" href={`/painel/obras/lista/${project.id}/etapas/nova`}>
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
          actions={<Button size="sm" variant="secondary" href={`/painel/obras/lista/${project.id}/rdo/novo`}>
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
          actions={<Button size="sm" variant="secondary" href={`/painel/obras/lista/${project.id}/orcamento/novo`}>
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
          actions={<Button size="sm" variant="secondary" href={`/painel/obras/lista/${project.id}/qualidade/novo`}>
            <Icon name="plus" size={14} /> Novo item de checklist
          </Button>}
        >
          {qualityItems.length === 0 ? (
            <EmptyState icon="check" title="Sem itens de checklist" description="Nenhum item de qualidade cadastrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {qualityItems.map((q) => {
                const checkedBy = q.checkedByUserId ? USERS.find((u) => u.id === q.checkedByUserId) : null;
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
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir a obra <strong>{project.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
