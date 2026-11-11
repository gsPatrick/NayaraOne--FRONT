"use client";

// Linha do tempo do processo (Caderno M5 §14 "Movimentação relevante gera timeline"): derivada pela API das próprias
// entidades e da auditoria; recarrega quando outro card da tela registra algo (refreshKey).
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { getLegalCaseTimeline } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CASE_TIMELINE_TYPE_LABELS } from "@/lib/labels/juridico";
import { brasilia } from "./DeadlinesCard";
import { timelineText } from "./timelineText";
import styles from "./page.module.css";

const TONE = { CASE_OPENED: "brand", CASE_CHANGE: "info", PARTY: "neutral", DEADLINE: "warning", DEADLINE_CHANGE: "warning", EVIDENCE_PACKAGE: "success", NOTICE: "info" };

export default function CaseTimelineCard({ legalCase, users, refreshKey }) {
  const [state, setState] = useState({ items: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getLegalCaseTimeline(legalCase.id)
      .then((timeline) => {
        if (!alive) return;
        setError("");
        setState({ items: Array.isArray(timeline?.items) ? [...timeline.items].reverse() : [] });
      })
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar a linha do tempo.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id, refreshKey]);

  const userName = (id) => users.find((u) => u.id === id)?.name || null;

  return (
    <Card title="Linha do tempo" subtitle="Movimentações do processo, da mais recente para a mais antiga">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {state.items.length === 0 ? (
        <EmptyState icon="calendar" title="Sem movimentações" description="Nada registrado ainda." />
      ) : (
        <ul className={styles.timelineList} data-testid="case-timeline">
          {state.items.map((item, idx) => (
            <li key={`${item.type}-${item.auditId || item.referenceId}-${idx}`} className={styles.timelineItem}>
              <Badge tone={TONE[item.type] || "neutral"}>{CASE_TIMELINE_TYPE_LABELS[item.type] || "Movimentação"}</Badge>
              <div className={styles.deadlineInfo}>
                <span className={styles.deadlineDesc}>{timelineText(item)}</span>
                <span className={styles.deadlineDue}>
                  {item.occurredAt ? brasilia(item.occurredAt) : "Sem data registrada"}
                  {item.actorUserId && userName(item.actorUserId) ? ` · por ${userName(item.actorUserId)}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
