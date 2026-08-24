import styles from "./ColumnChart.module.css";

const DEFAULT_COLOR = "var(--color-brand)";

export default function ColumnChart({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={styles.wrap}>
      <div className={styles.plot}>
        {items.map((item) => (
          <div key={item.label} className={styles.colGroup}>
            <span className={[styles.colValue, item.ghost ? styles.colValueGhost : ""].filter(Boolean).join(" ")}>
              {item.ghost ? "—" : item.displayValue !== undefined ? item.displayValue : item.value}
            </span>
            <div className={styles.colTrack}>
              {item.ghost ? (
                <div className={styles.colGhost} />
              ) : (
                <div
                  className={styles.col}
                  style={{ height: `${Math.max(4, (item.value / max) * 100)}%`, background: item.color || DEFAULT_COLOR }}
                />
              )}
            </div>
            <span className={styles.colLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
