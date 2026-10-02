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
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MEASUREMENT_STATUS_LABELS,
  MEASUREMENT_STATUS_TONE,
} from "@/lib/mock/construction";
import Select from "@/components/atoms/Select/Select";
import {
  getProject,
  getProjectStage,
  listProjectStages,
  listStageMeasurements,
  createStageMeasurement,
  submitStageMeasurement,
  reviewStageMeasurement,
  decideStageMeasurement,
  createStageDependency,
  listStageDependencies,
} from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatDateTime, formatPercent, formatBRL, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, toNumber } from "@/lib/format";
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
    totalAmount: "",
  });
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  // FIX (homologação 23/09/2026): este useState estava declarado lá embaixo, DEPOIS dos
  // early returns de loading/erro/não-encontrado. Na primeira renderização (loading) o
  // componente saía antes de chegar nele e registrava menos hooks; quando os dados chegavam,
  // a renderização seguinte passava a registrar um hook a mais e o React derrubava a árvore
  // com "Rendered more hooks than during the previous render" — a tela de detalhe da etapa
  // ficava COMPLETAMENTE EM BRANCO, sempre. Movido pra junto dos demais hooks, antes de
  // qualquer return condicional (Regras dos Hooks).
  const [measuredAtInvalid, setMeasuredAtInvalid] = useState(false);

  // Dependências entre etapas (M6-03/M6-19/M6-56 — sem ciclo, achado numa auditoria do Front do
  // Marco 6: a API já tinha o endpoint pronto, mas nenhuma tela chamava).
  const [allStages, setAllStages] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [depOpen, setDepOpen] = useState(false);
  const [depTargetStageId, setDepTargetStageId] = useState("");
  const [savingDep, setSavingDep] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getProject(params.id), getProjectStage(params.stageId), apiFetch("/users?status=ACTIVE")])
      .then(([p, s, u]) => {
        if (cancelled) return;
        setProject(p);
        setStage(s);
        setUsers(u || []);
        return Promise.all([
          listStageMeasurements(s.id),
          listProjectStages(p.id),
          listStageDependencies(s.id),
        ]).then(([m, stages, deps]) => {
          if (cancelled) return;
          setMeasurements(m || []);
          setAllStages(stages || []);
          setDependencies(deps || []);
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

  async function handleSubmit(measurement) {
    setBusyId(measurement.id);
    setActionError("");
    try {
      await submitStageMeasurement(measurement.id);
      reloadStageAndMeasurements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível enviar a medição para revisão.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReview(measurement) {
    setBusyId(measurement.id);
    setActionError("");
    try {
      await reviewStageMeasurement(measurement.id);
      reloadStageAndMeasurements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível marcar a medição como revisada.");
    } finally {
      setBusyId(null);
    }
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

  function openDepModal() {
    setDepTargetStageId("");
    setDepOpen(true);
  }

  async function handleCreateDependency() {
    if (!depTargetStageId) return;
    setSavingDep(true);
    setActionError("");
    try {
      const created = await createStageDependency(stage.id, { dependsOnStageId: depTargetStageId });
      setDependencies((prev) => [...prev, created]);
      setDepOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a dependência.");
    } finally {
      setSavingDep(false);
    }
  }

  function openMeasurementModal() {
    setMeasurementForm({ measuredPct: "", measuredAt: new Date().toISOString().slice(0, 10), notes: "", totalAmount: "" });
    setMeasuredAtInvalid(false);
    setMeasurementOpen(true);
  }

  const isMeasurementValid =
    measurementForm.measuredPct !== "" &&
    toNumber(measurementForm.measuredPct) >= 0 &&
    toNumber(measurementForm.measuredPct) <= 100 &&
    measurementForm.measuredAt &&
    !measuredAtInvalid;

  async function handleCreateMeasurement() {
    if (!isMeasurementValid) return;
    // FIX (auditoria E2E de browser, ciclo 6, 02/10/2026, mesma causa raiz do achado em
    // pos-obra): "Valor total" é opcional, então só a checagem `!== ""` deixava passar "," sozinho
    // (toNumber(",") = NaN) — silenciosamente virava totalAmount: null no payload sem avisar o
    // usuário que o valor digitado foi descartado.
    if (measurementForm.totalAmount !== "" && Number.isNaN(toNumber(measurementForm.totalAmount))) {
      setActionError('"Valor total (R$)" não é um número válido.');
      return;
    }
    setSavingMeasurement(true);
    setActionError("");
    try {
      await createStageMeasurement(stage.id, {
        measuredPct: toNumber(measurementForm.measuredPct),
        measuredAt: measurementForm.measuredAt,
        notes: measurementForm.notes.trim() || undefined,
        totalAmount: measurementForm.totalAmount !== "" ? toNumber(measurementForm.totalAmount) : undefined,
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
              <p className={styles.infoValue}>{formatPercent(stage.plannedPct)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Medido</p>
              <p className={styles.infoValue}>{formatPercent(stage.measuredPct)}</p>
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

        <Card
          title="Dependências"
          subtitle="Etapas que precisam estar prontas antes desta (sem ciclo)"
          actions={<Button size="sm" variant="secondary" onClick={openDepModal}>
            <Icon name="plus" size={14} /> Nova dependência
          </Button>}
        >
          {dependencies.length === 0 ? (
            <EmptyState icon="layers" title="Sem dependências" description="Esta etapa não depende de nenhuma outra." />
          ) : (
            <div className={styles.rowList}>
              {dependencies.map((d) => {
                const dependsOn = allStages.find((s) => s.id === d.dependsOnStageId);
                return (
                  <div key={d.id} className={styles.measurementRow}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>
                        {dependsOn ? `${dependsOn.sequence}. ${dependsOn.name}` : d.dependsOnStageId}
                      </span>
                    </div>
                    {dependsOn ? (
                      <Badge tone={STAGE_STATUS_TONE[dependsOn.status]}>{STAGE_STATUS_LABELS[dependsOn.status]}</Badge>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
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
                      <span className={styles.rowTitle}>{formatDate(m.measuredAt)} · {formatPercent(m.measuredPct)}</span>
                      <span className={styles.rowSubtitle}>
                        Medido por {measuredBy?.name || "—"} · Valor: {formatBRL(m.totalAmount)}
                        {m.notes ? ` · ${m.notes}` : ""}
                      </span>
                      {m.status === "PAYABLE" || m.status === "REJECTED" ? (
                        <span className={styles.rowSubtitle}>
                          {m.status === "PAYABLE" ? "Aprovada" : "Rejeitada"} por {decidedBy?.name || "—"} em {formatDateTime(m.decidedAt)}
                        </span>
                      ) : null}
                      {m.rejectionReason ? (
                        <span className={styles.rejectionReason}>Motivo: {m.rejectionReason}</span>
                      ) : null}
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={MEASUREMENT_STATUS_TONE[m.status]}>{MEASUREMENT_STATUS_LABELS[m.status]}</Badge>
                      {m.status === "DRAFT" ? (
                        <Button size="sm" variant="secondary" onClick={() => handleSubmit(m)} loading={busyId === m.id}>Enviar para revisão</Button>
                      ) : null}
                      {m.status === "SUBMITTED" ? (
                        <div className={styles.quickActions}>
                          <Button size="sm" variant="ghost" onClick={() => handleReview(m)} loading={busyId === m.id}>Marcar como revisada</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleApprove(m)} loading={busyId === m.id}>Aprovar</Button>
                          <Button size="sm" variant="danger" onClick={() => { setRejectTarget(m); setRejectReason(""); }}>Rejeitar</Button>
                        </div>
                      ) : null}
                      {m.status === "REVIEWED" ? (
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
        open={depOpen}
        onClose={() => setDepOpen(false)}
        title="Nova dependência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDepOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateDependency} loading={savingDep} disabled={!depTargetStageId}>Criar dependência</Button>
          </>
        }
      >
        <FormField label="Depende de" htmlFor="m-dep-target" required helper="Esta etapa só pode avançar depois que a etapa selecionada estiver pronta.">
          <Select id="m-dep-target" value={depTargetStageId} onChange={(e) => setDepTargetStageId(e.target.value)}>
            <option value="">Selecione a etapa...</option>
            {allStages.filter((s) => s.id !== stage.id).map((s) => (
              <option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>
            ))}
          </Select>
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
            <DecimalInput id="m-meas-pct" value={measurementForm.measuredPct} onChange={(e) => setMeasurementForm((p) => ({ ...p, measuredPct: e.target.value }))} />
          </FormField>
          <FormField
            label="Valor total (R$)"
            htmlFor="m-meas-total"
            helper="Necessário pra aprovar a medição (vira a obrigação financeira ao aprovar) — pode ser deixado em branco e preenchido depois, numa correção."
          >
            <DecimalInput id="m-meas-total" value={measurementForm.totalAmount} onChange={(e) => setMeasurementForm((p) => ({ ...p, totalAmount: e.target.value }))} placeholder="0,00" />
          </FormField>
          <FormField label="Data da medição" htmlFor="m-meas-date" required error={measuredAtInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}>
            <Input
              id="m-meas-date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={measuredAtInvalid}
              value={measurementForm.measuredAt}
              onChange={(e) => {
                setMeasuredAtInvalid(isDateInputInvalid(e.target.validity));
                setMeasurementForm((p) => ({ ...p, measuredAt: e.target.value }));
              }}
              onBlur={(e) => setMeasuredAtInvalid(isDateInputInvalid(e.target.validity))}
            />
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
