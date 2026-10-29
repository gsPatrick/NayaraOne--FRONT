import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import Button from "@/components/atoms/Button/Button";
import { freshnessDisplay } from "@/lib/analytics/freshness";
import { itemLabel } from "@/lib/analytics/panelLabels";
import styles from "./BiTableWidget.module.css";

// M9-D634 — tabela de um indicador do painel (por corretor, por provider, por tipo). Linhas e colunas vêm prontas da API, já formatadas.
export default function BiTableWidget({ widget, users, onDetail }) {
  const { metric, view, drilldown } = widget;
  const display = freshnessDisplay(metric);
  const hidden = metric.incomplete || !display.showValue;
  const rows = hidden ? [] : view.items || [];
  const columns = view.columns || [];
  return (
    <article className={styles.card} data-bi-widget={widget.metricCode} data-bi-incomplete={metric.incomplete ? "true" : "false"} title={`${metric.name || widget.title} (${metric.metricCode}), versão ${metric.version ?? "-"}`}>
      <header className={styles.top}>
        <h3 className={styles.title}>{widget.title}</h3>
        {metric.valueNatureLabel ? <span className={styles.nature}>{metric.valueNatureLabel}</span> : null}
      </header>
      {metric.incomplete ? <p className={styles.incomplete} data-bi-value>{metric.incompleteText}</p> : null}
      {!metric.incomplete && !display.showValue ? <p className={styles.incomplete}>{display.text}</p> : null}
      {!hidden ? <p className={styles.total} data-bi-value>{metric.formatted}</p> : null}
      {rows.length ? (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{widget.config?.labelKind === "USER" ? "Corretor" : "Item"}</th>
                {columns.map((c) => <th key={c.key || "principal"} scope="col" className={styles.num}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{itemLabel(row, widget.config?.group, view.labelKind, users)}</th>
                  {(row.cells || []).map((cell) => <td key={cell.key || "principal"} className={styles.num}>{cell.formatted ?? "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!hidden && !rows.length ? <p className={styles.empty}>Sem registros no período.</p> : null}
      {!hidden && (view.facts || []).length ? <p className={styles.facts}>{view.facts.map((f) => `${f.label}: ${f.formatted}`).join(" · ")}</p> : null}
      <footer className={styles.footer}>
        <FreshnessBadge metric={metric} />
        {drilldown && drilldown.enabled && drilldown.allowed ? <Button size="sm" variant="secondary" onClick={() => onDetail(widget)}>Ver detalhe</Button> : null}
      </footer>
    </article>
  );
}
