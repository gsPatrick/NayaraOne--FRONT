import Tooltip from "@/components/atoms/Tooltip/Tooltip";
import { NATURE_ORDER, natureInfo, formatNatureValue } from "@/lib/analytics/valueNature";
import styles from "./NatureSeriesChart.module.css";

// M9-D610 (BI-006) — barras por natureza do valor. Recebe as séries como a API devolve (`[{ valueNature, label, points, total }]`,
// uma série por natureza, nunca somadas) e só desenha. Cada natureza tem padrão próprio (sólido, hachurado, tracejado, pontilhado),
// rótulo em português escrito na barra, na legenda e no tooltip: a cor nunca é a única distinção.

function groupByKey(series) {
  const keys = [];
  const cells = {};
  series.forEach((s) => {
    s.points.forEach((p) => {
      if (!cells[p.key]) {
        cells[p.key] = {};
        keys.push(p.key);
      }
      cells[p.key][s.valueNature] = p.value;
    });
  });
  return { keys, cells };
}

export function NatureLegend({ natures = NATURE_ORDER }) {
  return (
    <ul className={styles.legend} aria-label="Legenda das naturezas do valor">
      {natures.map((nature) => {
        const info = natureInfo(nature);
        return (
          <li key={nature} className={styles.legendItem}>
            <span className={[styles.swatch, styles[info.pattern]].join(" ")} aria-hidden="true" />
            <span>
              <strong>{info.label}</strong>
              <span className={styles.legendCaption}> — {info.caption} ({info.patternName})</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function NatureSeriesChart({ series, ariaLabel = "Valores por natureza" }) {
  const list = (series || []).filter((s) => s && s.points && s.points.length);
  if (!list.length) return <p className={styles.empty}>Ainda não há dados para este indicador.</p>;
  const { keys, cells } = groupByKey(list);
  const ceiling = Math.max(...list.flatMap((s) => s.points.map((p) => Number(p.value))), 1);
  const present = NATURE_ORDER.filter((n) => list.some((s) => s.valueNature === n));

  return (
    <figure className={styles.figure} aria-label={ariaLabel}>
      <div className={styles.plot}>
        {keys.map((key) => (
          <div key={key} className={styles.group}>
            <div className={styles.bars}>
              {present.filter((n) => cells[key][n] !== undefined).map((nature) => {
                const info = natureInfo(nature);
                const shown = formatNatureValue(cells[key][nature]);
                const height = Math.max(4, (Number(cells[key][nature]) / ceiling) * 100);
                return (
                  <Tooltip key={nature} label={`${info.label}: ${shown}`}>
                    <div className={styles.barCol} tabIndex={0} aria-label={`${key}, ${info.label}: ${shown}`}>
                      <span className={styles.barValue}>{shown}</span>
                      <div className={styles.track}>
                        <div className={[styles.bar, styles[info.pattern]].join(" ")} style={{ height: `${height}%` }} data-nature={nature} />
                      </div>
                      <span className={styles.barLabel}>{info.label}</span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
            <span className={styles.groupLabel}>{key}</span>
          </div>
        ))}
      </div>
      <NatureLegend natures={present} />
    </figure>
  );
}
