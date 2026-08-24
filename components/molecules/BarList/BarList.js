import styles from "./BarList.module.css";

export default function BarList({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={styles.barList}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <div className={styles.barLabelRow}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barValue}>{item.displayValue !== undefined ? item.displayValue : item.value}</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
