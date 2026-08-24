"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./StepHeader.module.css";

const PAGE_SIZE = 4;

export default function StepHeader({ steps, activeIndex, completion }) {
  const totalPages = Math.ceil(steps.length / PAGE_SIZE);
  const [page, setPage] = useState(Math.floor(activeIndex / PAGE_SIZE));

  useEffect(() => {
    setPage(Math.floor(activeIndex / PAGE_SIZE));
  }, [activeIndex]);

  const start = page * PAGE_SIZE;
  const visibleSteps = steps.slice(start, start + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className={styles.wrap}>
      {totalPages > 1 ? (
        <button
          type="button"
          className={styles.navBtn}
          disabled={!canPrev}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Etapas anteriores"
        >
          <Icon name="chevronRight" size={16} className={styles.navIconPrev} />
        </button>
      ) : null}

      <ol className={styles.list}>
        {visibleSteps.map((step, i) => {
          const index = start + i;
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
          const percent = completion ? Math.round(completion[index] ?? 0) : null;
          return (
            <li key={step.id} className={styles.item}>
              <div className={styles.itemInner}>
                <span className={[styles.bullet, styles[state]].join(" ")}>
                  {state === "done" ? <Icon name="check" size={14} /> : index + 1}
                </span>
                <span className={[styles.label, styles[state]].join(" ")}>{step.label}</span>
                {percent !== null ? (
                  <span className={styles.tooltip} role="tooltip">
                    {percent}% concluído
                  </span>
                ) : null}
              </div>
              {i < visibleSteps.length - 1 ? (
                <span className={[styles.connector, index < activeIndex ? styles.connectorDone : ""].filter(Boolean).join(" ")} />
              ) : null}
            </li>
          );
        })}
      </ol>

      {totalPages > 1 ? (
        <button
          type="button"
          className={styles.navBtn}
          disabled={!canNext}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          aria-label="Próximas etapas"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      ) : null}

      {totalPages > 1 ? (
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span key={i} className={[styles.dot, i === page ? styles.dotActive : ""].filter(Boolean).join(" ")} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
