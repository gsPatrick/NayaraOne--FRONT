import styles from "./PieChart.module.css";

const DEFAULT_COLORS = [
  "var(--color-brand)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-ink-muted)",
];

export default function PieChart({ items, donut = true }) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  let cursor = 0;
  const stops = items.map((item, i) => {
    const start = (cursor / total) * 360;
    cursor += item.value;
    const end = (cursor / total) * 360;
    const color = item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  });
  const gradient = items.length > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--color-canvas-sunken)";

  return (
    <div className={styles.wrap}>
      <div className={styles.pie} style={{ background: gradient }}>
        {donut ? <div className={styles.hole}><span className={styles.holeValue}>{total.toLocaleString("pt-BR")}</span></div> : null}
      </div>
      <ul className={styles.legend}>
        {items.map((item, i) => (
          <li key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
            <span className={styles.legendLabel}>{item.label}</span>
            <span className={styles.legendValue}>{item.displayValue !== undefined ? item.displayValue : item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
