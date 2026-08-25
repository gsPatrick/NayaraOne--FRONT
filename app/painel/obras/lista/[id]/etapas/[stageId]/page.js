"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import {
  PROJECTS,
  PROJECT_STAGES,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MEASUREMENT_STATUS_LABELS,
  MEASUREMENT_STATUS_TONE,
  measurementsOf,
} from "@/lib/mock/construction";
import { USERS } from "@/lib/mock/users";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function EtapaDetalhePage({ params }) {
  const [, forceUpdate] = useState(0);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const project = PROJECTS.find((p) => p.id === params.id);
  const stage = PROJECT_STAGES.find((s) => s.id === params.stageId);
  const measurements = useMemo(() => (stage ? measurementsOf(stage.id) : []), [stage, forceUpdate]);

  if (!project || !stage) {
    return (
      <AppShell title="Etapa" backHref={project ? `/painel/obras/lista/${project.id}` : "/painel/obras/lista"}>
        <Alert tone="danger" title="Etapa não encontrada">Não existe nenhuma etapa com este identificador.</Alert>
      </AppShell>
    );
  }

  function rerender() {
    forceUpdate((n) => n + 1);
  }

  function recomputeStageStatus() {
    const approved = measurementsOf(stage.id).filter((m) => m.status === "APPROVED");
    if (approved.length > 0) {
      const latest = approved.reduce((a, b) => (new Date(a.measuredAt) > new Date(b.measuredAt) ? a : b));
      stage.measuredPct = latest.measuredPct;
      stage.status = latest.measuredPct >= stage.plannedPct ? "DONE" : "IN_PROGRESS";
    }
  }

  function handleApprove(measurement) {
    measurement.status = "APPROVED";
    measurement.approvedByUserId = "user-1";
    measurement.decidedAt = new Date().toISOString();
    measurement.rejectionReason = null;
    recomputeStageStatus();
    rerender();
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    rejectTarget.status = "REJECTED";
    rejectTarget.approvedByUserId = "user-1";
    rejectTarget.decidedAt = new Date().toISOString();
    rejectTarget.rejectionReason = rejectReason.trim() || "Sem motivo informado.";
    setRejectTarget(null);
    setRejectReason("");
    rerender();
  }

  return (
    <AppShell title={stage.name} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={STAGE_STATUS_TONE[stage.status]}>{STAGE_STATUS_LABELS[stage.status]}</Badge>
          </div>
          <div className={styles.actions}>
            <Button href={`/painel/obras/lista/${project.id}/etapas/${stage.id}/medicao/nova`}>
              <Icon name="plus" size={16} /> Registrar medição
            </Button>
          </div>
        </div>

        <Card title="Informações da etapa">
          <div className={styles.infoGrid}>
            <div>
              <p className={styles.infoLabel}>Sequência</p>
              <p className={styles.infoValue}>{stage.sequence}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Planejado</p>
              <p className={styles.infoValue}>{stage.plannedPct}%</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Medido</p>
              <p className={styles.infoValue}>{stage.measuredPct != null ? `${stage.measuredPct}%` : "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Início</p>
              <p className={styles.infoValue}>{formatDate(stage.startsAt)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Fim previsto</p>
              <p className={styles.infoValue}>{formatDate(stage.endsAt)}</p>
            </div>
          </div>
        </Card>

        <Card title="Histórico de medições">
          {measurements.length === 0 ? (
            <EmptyState icon="chart" title="Sem medições" description="Nenhuma medição registrada para esta etapa ainda." />
          ) : (
            <div className={styles.rowList}>
              {measurements.map((m) => {
                const measuredBy = m.measuredByUserId ? USERS.find((u) => u.id === m.measuredByUserId) : null;
                const decidedBy = m.approvedByUserId ? USERS.find((u) => u.id === m.approvedByUserId) : null;
                return (
                  <div key={m.id} className={styles.measurementRow}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{formatDate(m.measuredAt)} · {m.measuredPct}%</span>
                      <span className={styles.rowSubtitle}>
                        Medido por {measuredBy?.name || "—"}
                        {m.notes ? ` · ${m.notes}` : ""}
                      </span>
                      {m.status !== "PENDING_APPROVAL" ? (
                        <span className={styles.rowSubtitle}>
                          {m.status === "APPROVED" ? "Aprovada" : "Rejeitada"} por {decidedBy?.name || "—"} em {formatDateTime(m.decidedAt)}
                        </span>
                      ) : null}
                      {m.rejectionReason ? (
                        <span className={styles.rejectionReason}>Motivo: {m.rejectionReason}</span>
                      ) : null}
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={MEASUREMENT_STATUS_TONE[m.status]}>{MEASUREMENT_STATUS_LABELS[m.status]}</Badge>
                      {m.status === "PENDING_APPROVAL" ? (
                        <div className={styles.quickActions}>
                          <Button size="sm" variant="secondary" onClick={() => handleApprove(m)}>Aprovar</Button>
                          <Button size="sm" variant="danger" onClick={() => { setRejectTarget(m); setRejectReason(""); }}>Rejeitar</Button>
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
        open={Boolean(rejectTarget)}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Rejeitar medição"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancelar</Button>
            <Button variant="danger" onClick={handleRejectConfirm}>Rejeitar medição</Button>
          </>
        }
      >
        <FormField label="Motivo da rejeição" htmlFor="f-reject-reason" helper="Explique por que a medição está sendo rejeitada.">
          <textarea
            id="f-reject-reason"
            className={styles.textarea}
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </FormField>
      </Modal>
    </AppShell>
  );
}
