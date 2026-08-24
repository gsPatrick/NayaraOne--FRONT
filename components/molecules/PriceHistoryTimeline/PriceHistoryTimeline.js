import { formatBRL, formatDate } from "@/lib/format";
import styles from "./PriceHistoryTimeline.module.css";

export default function PriceHistoryTimeline({ entries = [] }) {
  return (
    <ol className={styles.list}>
      {entries.map((entry, i) => (
        <li key={entry.id} className={styles.item}>
          <div className={styles.rail}>
            <span className={styles.dot} aria-hidden="true" />
            {i < entries.length - 1 ? <span className={styles.line} aria-hidden="true" /> : null}
          </div>
          <div className={styles.content}>
            <div className={styles.top}>
              <span className={styles.price}>{formatBRL(entry.price)}</span>
              <span className={styles.date}>{formatDate(entry.recordedAt)}</span>
            </div>
            <p className={styles.reason}>{entry.reason}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
