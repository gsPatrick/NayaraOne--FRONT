"use client";

import { useEffect, useState } from "react";
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
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MEASUREMENT_STATUS_LABELS,
  MEASUREMENT_STATUS_TONE,
} from "@/lib/mock/construction";
import {
  getProject,
  getProjectStage,
  listStageMeasurements,
  createStageMeasurement,
  decideStageMeasurement,
} from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function EtapaDetalhePage({ params }) {
  const [project, setProject] = useState(null);
  const [stage, setStage] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({
    measuredPct: "",
    measuredAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getProject(params.id), getProjectStage(params.stageId), apiFetch("/users")])
      .then(([p, s, u]) => {
        if (cancelled) return;
        setProject(p);
        setStage(s);
        setUsers(u || []);
        return listStageMeasurements(s.id).then((m) => {
          if (cancelled) return;
          setMeasurements(m || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar a etapa.");
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
  }, [params.id, params.stageId]);

  function reloadStageAndMeasurements() {
    Promise.all([getProjectStage(params.stageId), listStageMeasurements(params.stageId)]).then(([s, m]) => {
      setStage(s);
      setMeasurements(m || []);
    });
  }

  if (loading) {
    return (
      <AppShell title="Etapa" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError && (!project || !stage)) {
    return (
      <AppShell title="Etapa" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar a etapa">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project || !stage) {
    return (
      <AppShell title="Etapa" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Etapa não encontrada">Não existe nenhuma etapa com este identificador.</Alert>
      </AppShell>
    );
  }

  async function handleApprove(measurement) {
    setBusyId(measurement.id);
    setActionError("");
    try {
      await decideStageMeasurement(measurement.id, { decision: "APPROVED" });
      reloadStageAndMeasurements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar a medição.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    setRejecting(true);
    setActionError("");
    try {
      await decideStageMeasurement(rejectTarget.id, {
        decision: "REJECTED",
        rejectionReason: rejectReason.trim() || undefined,
      });
      setRejectTarget(null);
      setRejectReason("");
      reloadStageAndMeasurements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível rejeitar a medição.");
    } finally {
      setRejecting(false);
    }
  }

  function openMeasurementModal() {
    setMeasurementForm({ measuredPct: "", measuredAt: new Date().toISOString().slice(0, 10), notes: "" });
    setMeasurementOpen(true);
  }

  const isMeasurementValid =
    measurementForm.measuredPct !== "" &&
    Number(measurementForm.measuredPct) >= 0 &&
    Number(measurementForm.measuredPct) <= 100 &&
    measurementForm.measuredAt;

  async function handleCreateMeasurement() {
    if (!isMeasurementValid) return;
    setSavingMeasurement(true);
    setActionError("");
    try {
      await createStageMeasurement(stage.id, {
        measuredPct: Number(measurementForm.measuredPct),
        measuredAt: measurementForm.measuredAt,
        notes: measurementForm.notes.trim() || undefined,
      });
      setMeasurementOpen(false);
      reloadStageAndMeasurements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a medição.");
    } finally {
      setSavingMeasurement(false);
    }
  }

  return (
    <AppShell title={stage.name} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={STAGE_STATUS_TONE[stage.status]}>{STAGE_STATUS_LABELS[stage.status]}</Badge>
          </div>
          <div className={styles.actions}>
            <Button onClick={openMeasurementModal}>
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
                const measuredBy = m.measuredByUserId ? users.find((u) => u.id === m.measuredByUserId) : null;
                const decidedBy = m.approvedByUserId ? users.find((u) => u.id === m.approvedByUserId) : null;
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
                          <Button size="sm" variant="secondary" onClick={() => handleApprove(m)} loading={busyId === m.id}>Aprovar</Button>
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
            <Button variant="danger" onClick={handleRejectConfirm} loading={rejecting}>Rejeitar medição</Button>
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

      <Modal
        open={measurementOpen}
        onClose={() => setMeasurementOpen(false)}
        title="Registrar medição"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMeasurementOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateMeasurement} loading={savingMeasurement} disabled={!isMeasurementValid}>Registrar medição</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Percentual medido (%)" htmlFor="m-meas-pct" required>
            <Input id="m-meas-pct" type="number" min="0" max="100" value={measurementForm.measuredPct} onChange={(e) => setMeasurementForm((p) => ({ ...p, measuredPct: e.target.value }))} />
          </FormField>
          <FormField label="Data da medição" htmlFor="m-meas-date" required>
            <Input id="m-meas-date" type="date" value={measurementForm.measuredAt} onChange={(e) => setMeasurementForm((p) => ({ ...p, measuredAt: e.target.value }))} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Observações" htmlFor="m-meas-notes" helper="Opcional">
              <textarea
                id="m-meas-notes"
                className={styles.textarea}
                rows={3}
                value={measurementForm.notes}
                onChange={(e) => setMeasurementForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
