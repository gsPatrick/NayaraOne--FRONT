import styles from "./AreaChart.module.css";

const WIDTH = 320;
const HEIGHT = 120;
const PAD = 8;

export default function AreaChart({ items, color = "var(--color-brand)" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const min = Math.min(...items.map((i) => i.value), 0);
  const range = max - min || 1;
  const stepX = items.length > 1 ? (WIDTH - PAD * 2) / (items.length - 1) : 0;

  const points = items.map((item, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - (item.value - min) / range) * (HEIGHT - PAD * 2);
    return { x, y, item };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x || 0},${HEIGHT - PAD} L${points[0]?.x || 0},${HEIGHT - PAD} Z`;

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} preserveAspectRatio="none">
        <path d={areaPath} className={styles.area} style={{ fill: color }} />
        <path d={linePath} className={styles.line} style={{ stroke: color }} />
        {points.map((p) =>
          p.item.ghost ? (
            <circle key={p.item.label} cx={p.x} cy={p.y} r={2.5} className={styles.dotGhost} />
          ) : (
            <circle key={p.item.label} cx={p.x} cy={p.y} r={3} className={styles.dot} style={{ fill: color }} />
          )
        )}
      </svg>
      <div className={styles.labels}>
        {items.map((item) => (
          <span key={item.label} className={styles.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
