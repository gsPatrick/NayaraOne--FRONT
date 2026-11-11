"use client";

// Prazos do processo (Caderno M5 §15): lista com situação, severidade (calculada pela API), criticidade, responsável,
// vencimento em horário de Brasília e origem; novo prazo; concluir com nota (só o responsável ou quem aprova) e
// cancelar com motivo (aprovação jurídica).
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { listLegalDeadlines, updateLegalDeadline } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import {
  DEADLINE_STATUS_LABELS,
  DEADLINE_STATUS_TONE,
  DEADLINE_API_SEVERITY_LABELS,
  DEADLINE_API_SEVERITY_TONE,
  DEADLINE_CRITICALITY_LABELS,
  DEADLINE_CRITICALITY_TONE,
} from "@/lib/labels/juridico";
import { formatDateTime } from "@/lib/format";
import NewDeadlineForm from "./NewDeadlineForm";
import styles from "./page.module.css";

export const brasilia = (iso) => (iso ? `${formatDateTime(iso)} (horário de Brasília)` : "Sem data");

export default function DeadlinesCard({ legalCase, users, onChanged }) {
  const [deadlines, setDeadlines] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState(null); // { id, mode: "done" | "cancel" }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewerFileId, setViewerFileId] = useState(null);
  const canCancel = useHasPermission("legal:approve");

  useEffect(() => {
    let alive = true;
    listLegalDeadlines({ legalCaseId: legalCase.id })
      .then((list) => alive && setDeadlines(Array.isArray(list) ? list : []))
      .catch((err) => alive && setLoadError(legalErrorMessage(err, "Não foi possível carregar os prazos.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id]);

  function userName(id) {
    const u = users.find((x) => x.id === id);
    return u ? u.name || u.email : "Usuário sem acesso a esta empresa";
  }

  function start(deadline, mode) {
    setError("");
    setText("");
    setAction({ id: deadline.id, mode });
  }

  async function confirm(deadline) {
    if (!text.trim()) return;
    setError("");
    setBusy(true);
    try {
      const payload = action.mode === "done" ? { status: "DONE", conclusionNote: text.trim() } : { status: "CANCELLED", changeReason: text.trim() };
      const updated = await updateLegalDeadline(deadline.id, payload);
      const severity = action.mode === "done" ? "DONE" : "CANCELLED";
      setDeadlines((prev) => prev.map((d) => (d.id === deadline.id ? { ...d, ...updated, severity } : d)));
      setAction(null);
      setText("");
      onChanged?.();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível atualizar o prazo."));
    } finally {
      setBusy(false);
    }
  }

  function handleCreated(created) {
    setDeadlines((prev) => [...prev, { ...created, severity: created.severity || "NORMAL" }].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)));
    setCreating(false);
    onChanged?.();
  }

  const responsibleOf = (d) => d.responsibleUserId || legalCase.responsibleUserId;

  return (
    <Card
      title="Prazos"
      subtitle="Cada prazo tem origem verificável, responsável e tarefa; a severidade vem do servidor"
      actions={!creating ? <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>Novo prazo</Button> : null}
    >
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {creating ? <NewDeadlineForm legalCase={legalCase} users={users} onCreated={handleCreated} onCancel={() => setCreating(false)} /> : null}
      {deadlines.length === 0 ? (
        <EmptyState icon="calendar" title="Sem prazos" description="Nenhum prazo cadastrado." />
      ) : (
        deadlines.map((d) => (
          <div key={d.id} className={styles.deadlineRow} data-testid="deadline-row">
            <div className={styles.deadlineInfo}>
              <span className={styles.deadlineDesc}>{d.description}</span>
              <span className={styles.deadlineDue}>
                Vence em {brasilia(d.dueAt)} · Responsável: {responsibleOf(d) ? userName(responsibleOf(d)) : "sem responsável"}
                {d.responsibleUserId ? "" : " (do processo)"}
              </span>
              <span className={styles.deadlineDue}>
                {d.sourceFileId ? "Origem: documento anexado" : d.sourceEventId ? "Origem: evento registrado no sistema" : d.sourceDocument || d.sourceEvent ? `Origem: ${d.sourceDocument || d.sourceEvent}` : "Origem não registrada (prazo antigo)"}
                {d.taskId ? " · Tarefa criada para o responsável" : ""}
              </span>
              {d.status === "DONE" && d.conclusionNote ? <span className={styles.deadlineDue}>Conclusão: {d.conclusionNote}</span> : null}
              {d.status === "CANCELLED" ? <span className={styles.deadlineDue}>Cancelado{d.cancelledAt ? ` em ${brasilia(d.cancelledAt)}` : ""} — motivo: {d.cancelReason || "não informado"}</span> : null}
            </div>
            <div className={styles.badges}>
              <Badge tone={DEADLINE_STATUS_TONE[d.status] || "neutral"}>{DEADLINE_STATUS_LABELS[d.status] || "Situação desconhecida"}</Badge>
              {d.status === "PENDING" ? <Badge tone={DEADLINE_API_SEVERITY_TONE[d.severity] || "neutral"}>{DEADLINE_API_SEVERITY_LABELS[d.severity] || "No prazo"}</Badge> : null}
              <Badge tone={DEADLINE_CRITICALITY_TONE[d.criticality] || "neutral"}>Criticidade {(DEADLINE_CRITICALITY_LABELS[d.criticality] || "Média").toLowerCase()}</Badge>
            </div>
            {d.sourceFileId ? (
              <Button size="sm" variant="ghost" onClick={() => setViewerFileId(d.sourceFileId)}>Ver documento de origem</Button>
            ) : null}
            {d.status === "PENDING" && action?.id !== d.id ? (
              <div className={styles.formActions}>
                <Button size="sm" variant="secondary" onClick={() => start(d, "done")} disabled={busy}>Concluir</Button>
                {canCancel ? <Button size="sm" variant="ghost" onClick={() => start(d, "cancel")} disabled={busy}>Cancelar prazo</Button> : null}
              </div>
            ) : null}
            {d.status === "PENDING" && action?.id === d.id ? (
              <div className={styles.concludeBox}>
                <FormField
                  label={action.mode === "done" ? "Nota de conclusão (obrigatória)" : "Motivo do cancelamento (obrigatório)"}
                  htmlFor={`f-${action.mode === "done" ? "conclusion" : "cancel"}-${d.id}`}
                >
                  <Input
                    id={`f-${action.mode === "done" ? "conclusion" : "cancel"}-${d.id}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={action.mode === "done" ? "Ex.: Petição protocolada, protocolo nº 123" : "Ex.: Prazo suspenso por decisão do juízo"}
                  />
                </FormField>
                <Button size="sm" variant="secondary" onClick={() => confirm(d)} disabled={busy || !text.trim()} loading={busy}>
                  {action.mode === "done" ? "Confirmar conclusão" : "Confirmar cancelamento"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={busy}>Voltar</Button>
              </div>
            ) : null}
          </div>
        ))
      )}
      <FileViewerModal open={Boolean(viewerFileId)} onClose={() => setViewerFileId(null)} fileId={viewerFileId} file={viewerFileId ? { id: viewerFileId } : null} />
    </Card>
  );
}
