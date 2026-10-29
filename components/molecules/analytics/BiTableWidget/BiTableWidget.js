import { Fragment } from "react";
import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import Button from "@/components/atoms/Button/Button";
import { freshnessDisplay } from "@/lib/analytics/freshness";
import { itemLabel } from "@/lib/analytics/panelLabels";
import styles from "./BiTableWidget.module.css";

// M9-D634 — tabela de um indicador do painel (por corretor, por provider, por tipo). Linhas e colunas vêm prontas da API, já formatadas.
// M9-D682 — o quadro de integrações traz o código da linha em partes (`partColumns`: fornecedor, ambiente, família) e as linhas separadas por família (`partGroups`);
// o indicador desatualizado mostra o aviso `staleText` ao lado do valor da última medição e o cartão em alerta (`view.alert`) avisa.
function LabelCells({ row, parts, users, projects, widget, view }) {
  if (!parts.length) return <th scope="row">{itemLabel(row, widget.config?.group, view.labelKind, users, projects)}</th>;
  return (row.parts || []).map((part, index) => (index === 0 ? <th key="p0" scope="row">{part}</th> : <td key={`p${index}`}>{part}</td>));
}

function Rows({ rows, parts, columns, ...rest }) {
  return rows.map((row) => (
    <tr key={row.id}>
      <LabelCells row={row} parts={parts} {...rest} />
      {(row.cells || []).map((cell) => <td key={cell.key || "principal"} className={styles.num}>{cell.formatted ?? "-"}</td>)}
    </tr>
  ));
}

export default function BiTableWidget({ widget, users, projects, onDetail }) {
  const { metric, view, drilldown } = widget;
  const display = freshnessDisplay(metric);
  const hidden = metric.incomplete || !display.showValue;
  const rows = hidden ? [] : view.items || [];
  const columns = view.columns || [];
  const parts = view.partColumns || [];
  const groups = hidden ? [] : view.partGroups || [];
  const shared = { parts, users, projects, widget, view };
  return (
    <article className={styles.card} data-bi-widget={widget.metricCode} data-bi-incomplete={metric.incomplete ? "true" : "false"} title={`${metric.name || widget.title} (${metric.metricCode}), versão ${metric.version ?? "-"}`}>
      <header className={styles.top}>
        <h3 className={styles.title}>{widget.title}</h3>
        {metric.valueNatureLabel ? <span className={styles.nature}>{metric.valueNatureLabel}</span> : null}
      </header>
      {metric.incomplete ? <p className={styles.incomplete} data-bi-value>{metric.incompleteText}</p> : null}
      {!metric.incomplete && metric.staleText ? <p className={styles.incomplete} role="status" data-bi-stale>{metric.staleText}</p> : null}
      {!metric.incomplete && !display.showValue ? <p className={styles.incomplete}>{display.text}</p> : null}
      {!hidden ? <p className={styles.total} data-bi-value>{metric.formatted}</p> : null}
      {view.alert && !hidden ? <p className={styles.alertText} role="status">Atenção: há itens que pedem ação.</p> : null}
      {rows.length || groups.length ? (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {parts.length ? parts.map((label) => <th key={label} scope="col">{label}</th>) : <th scope="col">{widget.config?.labelKind === "USER" ? "Corretor" : "Item"}</th>}
                {columns.map((c) => <th key={c.key || "principal"} scope="col" className={styles.num}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.length ? groups.map((group) => (
                <Fragment key={group.id}>
                  <tr className={styles.groupRow} data-bi-family={group.id}><th scope="colgroup" colSpan={parts.length + columns.length}>{group.label}</th></tr>
                  {group.rows.length ? <Rows rows={group.rows} {...shared} /> : <tr><td colSpan={parts.length + columns.length} className={styles.empty}>Sem integração ativa nesta família.</td></tr>}
                </Fragment>
              )) : <Rows rows={rows} {...shared} />}
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
