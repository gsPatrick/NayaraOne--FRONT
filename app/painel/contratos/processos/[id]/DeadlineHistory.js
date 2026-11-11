"use client";

// Histórico do prazo (Caderno M5 §15; pedido da cliente): cadastro, reatribuições, remarcações (vencimento anterior,
// novo e motivo), conclusão, reabertura e alertas — a partir da linha do tempo do processo, que a API monta da
// auditoria append-only (summary em português, autor e data).
import { useEffect, useState } from "react";
import { getLegalCaseTimeline } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { humanizeText } from "@/lib/format";
import { brasilia } from "./DeadlinesCard";
import styles from "./page.module.css";

export default function DeadlineHistory({ legalCaseId, deadlineId, users, refreshKey }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getLegalCaseTimeline(legalCaseId)
      .then((t) => {
        if (!alive) return;
        const list = Array.isArray(t?.items) ? t.items : [];
        setItems(list.filter((i) => i.referenceId === deadlineId && (i.type === "DEADLINE" || i.type === "DEADLINE_CHANGE")).reverse());
      })
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar o histórico do prazo.")));
    return () => {
      alive = false;
    };
  }, [legalCaseId, deadlineId, refreshKey]);

  const who = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name || u.email : null;
  };

  if (error) return <p className={styles.deadlineDue} role="alert">{error}</p>;
  if (!items) return <p className={styles.deadlineDue}>Carregando o histórico…</p>;
  return (
    <ul className={styles.timelineList} data-testid="deadline-history">
      {items.length === 0 ? <li className={styles.deadlineDue}>Sem alterações registradas.</li> : null}
      {items.map((i, idx) => (
        <li key={`${i.auditId || i.type}-${idx}`} className={styles.timelineItem}>
          <span className={styles.deadlineDue}>{brasilia(i.occurredAt)}{who(i.actorUserId) ? ` · por ${who(i.actorUserId)}` : ""}</span>
          <span className={styles.deadlineDesc}>{humanizeText(i.summary)}</span>
        </li>
      ))}
    </ul>
  );
}
