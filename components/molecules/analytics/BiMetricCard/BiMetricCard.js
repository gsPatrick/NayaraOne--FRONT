import Link from "next/link";
import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import Button from "@/components/atoms/Button/Button";
import { freshnessDisplay } from "@/lib/analytics/freshness";
import { itemLabel } from "@/lib/analytics/panelLabels";
import styles from "./BiMetricCard.module.css";

// M9-D634 — cartão de um indicador do painel de BI. Mostra o valor PRONTO da API (nunca calcula): "Dado incompleto" no lugar do número quando o
// indicador está DEGRADED/INCOMPLETE, rótulo de natureza, selo de atualização, versão no tooltip, séries lado a lado sem total, fatos, alerta e
// o botão "Ver detalhe" (só quando o servidor liberou).
function headlineOf(metric, view, display) {
  if (metric.incomplete) return { text: metric.incompleteText, muted: true };
  if (!display.showValue) return { text: display.text, muted: true };
  if (view.noTotal) return null;
  return { text: metric.formatted, muted: false };
}

function Series({ series, incomplete, text }) {
  return (
    <ul className={styles.series} aria-label="Valores por natureza">
      {series.map((s) => (
        <li key={s.key || "principal"} className={styles.seriesItem}>
          <span className={styles.seriesLabel}>{s.label} <small>({s.valueNatureLabel})</small></span>
          <strong className={incomplete ? styles.muted : styles.seriesValue}>{incomplete ? text : s.formatted}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function BiMetricCard({ widget, projects, onDetail }) {
  const { metric, view, drilldown } = widget;
  const display = freshnessDisplay(metric);
  const headline = headlineOf(metric, view, display);
  const hidden = metric.incomplete || !display.showValue;
  const tooltip = metric.version ? `${metric.name || widget.title} (${metric.metricCode}), versão ${metric.version}` : metric.metricCode;
  return (
    <article className={[styles.card, view.alert ? styles.alert : ""].filter(Boolean).join(" ")} data-bi-widget={widget.metricCode} data-bi-incomplete={metric.incomplete ? "true" : "false"} title={tooltip}>
      <header className={styles.top}>
        <h3 className={styles.title}>{widget.title}</h3>
        {metric.valueNatureLabel ? <span className={styles.nature}>{metric.valueNatureLabel}</span> : null}
      </header>
      {headline ? <p className={[styles.value, headline.muted ? styles.muted : ""].filter(Boolean).join(" ")} data-bi-value>{headline.text}</p> : null}
      {view.noTotal ? <Series series={view.series || []} incomplete={hidden} text={metric.incomplete ? metric.incompleteText : display.text} /> : null}
      {view.alert ? <p className={styles.alertText} role="status">Atenção: há itens que pedem ação.</p> : null}
      {!hidden && !view.noTotal && (view.series || []).length ? <Series series={view.series} incomplete={false} text="" /> : null}
      {!hidden && (view.facts || []).length ? (
        <dl className={styles.facts}>
          {view.facts.map((f) => (
            <div key={f.key} className={styles.fact}><dt>{f.label}</dt><dd>{f.formatted}</dd></div>
          ))}
        </dl>
      ) : null}
      {!hidden && (view.items || []).length ? (
        <ul className={styles.items}>
          {view.items.map((i) => (
            <li key={i.id} className={styles.item}><span>{itemLabel(i, widget.config?.group, view.labelKind, {}, projects)}</span><strong>{i.formatted}</strong></li>
          ))}
        </ul>
      ) : null}
      <footer className={styles.footer}>
        <FreshnessBadge metric={metric} />
        {view.link ? <Link href={view.link.href} className={styles.link}>{view.link.label}</Link> : null}
        {drilldown && drilldown.enabled && drilldown.allowed ? <Button size="sm" variant="secondary" onClick={() => onDetail(widget)}>Ver detalhe</Button> : null}
      </footer>
    </article>
  );
}
