import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import Button from "@/components/atoms/Button/Button";
import { freshnessDisplay } from "@/lib/analytics/freshness";
import { itemLabel } from "@/lib/analytics/panelLabels";
import styles from "./BiBarsWidget.module.css";

// M9-D634 — barras e funil de um indicador do painel. Cada linha vem pronta da API (código, valor, texto formatado, participação e extras como o
// tempo parado). A largura da barra é só desenho proporcional ao valor que a API mandou; nenhum total ou percentual é calculado aqui.
function widthOf(item, max) {
  const n = Number(item.value);
  if (!Number.isFinite(n) || n <= 0 || max <= 0) return 0;
  return Math.max((n / max) * 100, 4);
}

export default function BiBarsWidget({ widget, users, projects, onDetail }) {
  const { metric, view, drilldown } = widget;
  const display = freshnessDisplay(metric);
  const hidden = metric.incomplete || !display.showValue;
  const items = hidden ? [] : view.items || [];
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 0);
  const funnel = view.chart === "FUNNEL";
  return (
    <article className={styles.card} data-bi-widget={widget.metricCode} data-bi-incomplete={metric.incomplete ? "true" : "false"} title={`${metric.name || widget.title} (${metric.metricCode}), versão ${metric.version ?? "-"}`}>
      <header className={styles.top}>
        <h3 className={styles.title}>{widget.title}</h3>
        {metric.valueNatureLabel ? <span className={styles.nature}>{metric.valueNatureLabel}</span> : null}
      </header>
      {metric.incomplete ? <p className={styles.incomplete} data-bi-value>{metric.incompleteText}</p> : null}
      {!metric.incomplete && !display.showValue ? <p className={styles.incomplete}>{display.text}</p> : null}
      {!hidden ? <p className={styles.total} data-bi-value>{metric.formatted}</p> : null}
      {view.highlight && !hidden ? <p className={styles.highlight}>{view.highlight.label}: <strong>{view.highlight.formatted}</strong></p> : null}
      {items.length ? (
        <ul className={[styles.list, funnel ? styles.funnel : ""].filter(Boolean).join(" ")}>
          {items.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.labelRow}>
                <span>{itemLabel(item, widget.config?.group, view.labelKind, users, projects)}</span>
                <span className={styles.numbers}>
                  <strong>{item.formatted}</strong>
                  {item.share ? <small> ({item.share.formatted})</small> : null}
                </span>
              </div>
              <div className={styles.track}><div className={styles.fill} style={{ width: `${widthOf(item, max)}%` }} /></div>
              {(item.extra || []).map((x) => <span key={x.key} className={styles.extra}>{x.label}: {x.formatted}</span>)}
            </li>
          ))}
        </ul>
      ) : null}
      {!hidden && !items.length ? <p className={styles.empty}>Sem registros no período.</p> : null}
      {!hidden && (view.facts || []).length ? (
        <p className={styles.facts}>{view.facts.map((f) => `${f.label}: ${f.formatted}`).join(" · ")}</p>
      ) : null}
      <footer className={styles.footer}>
        <FreshnessBadge metric={metric} />
        {drilldown && drilldown.enabled && drilldown.allowed ? <Button size="sm" variant="secondary" onClick={() => onDetail(widget)}>Ver detalhe</Button> : null}
      </footer>
    </article>
  );
}
