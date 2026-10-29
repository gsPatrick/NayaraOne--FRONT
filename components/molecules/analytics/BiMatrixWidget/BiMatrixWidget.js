import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import Button from "@/components/atoms/Button/Button";
import { freshnessDisplay } from "@/lib/analytics/freshness";
import styles from "./BiMatrixWidget.module.css";

// M9-D626 — tabela-matriz do painel (contas a pagar e a receber em 7, 30 e 60 dias: 2 linhas x 3 colunas). Cada célula é um indicador com o valor pronto da API:
// "Dado incompleto" no lugar do número quando o indicador está DEGRADED/INCOMPLETE, selo de atualização, versão no tooltip e "Ver detalhe" só quando o servidor liberou.
function Cell({ cell, onDetail }) {
  const { metric, drilldown } = cell;
  const display = freshnessDisplay(metric);
  const hidden = metric.incomplete || !display.showValue;
  const text = metric.incomplete ? metric.incompleteText : display.showValue ? metric.formatted : display.text;
  return (
    <td className={styles.cell} data-bi-widget={cell.metricCode} data-bi-incomplete={metric.incomplete ? "true" : "false"} title={`${metric.name || cell.title} (${cell.metricCode}), versão ${metric.version ?? "-"}`}>
      <span className={hidden ? styles.muted : styles.value} data-bi-value>{text}</span>
      <span className={styles.meta}>
        <FreshnessBadge metric={metric} />
        {metric.valueNatureLabel ? <small className={styles.nature}>{metric.valueNatureLabel}</small> : null}
        {drilldown && drilldown.enabled && drilldown.allowed ? <Button size="sm" variant="secondary" onClick={() => onDetail({ ...cell })}>Ver detalhe</Button> : null}
      </span>
    </td>
  );
}

export default function BiMatrixWidget({ widget, onDetail }) {
  const { columns, rows } = widget.view.matrix;
  return (
    <article className={styles.card} data-bi-matrix={widget.metricCode}>
      <header className={styles.top}>
        <h3 className={styles.title}>{widget.title}</h3>
        {widget.metric?.valueNatureLabel ? <span className={styles.badge}>{widget.metric.valueNatureLabel}</span> : null}
      </header>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr><th scope="col"><span className={styles.sr}>Tipo</span></th>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell) => <Cell key={cell.metricCode} cell={cell} onDetail={onDetail} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
