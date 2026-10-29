"use client";
import { useEffect, useRef } from "react";
import Icon from "./Icon";
import s from "./Table.module.css";

// Tabela semântica: cabeçalho sticky, ordenação, seleção, linha clicável, rodapé.
export default function DataTable({
  caption, columns, rows, rowKey, sort, onSort, selected, onToggle, onToggleAll,
  onRowClick, rowActions, footer, maxHeight,
}) {
  const allRef = useRef(null);
  const selectable = !!selected;
  const nSel = rows.filter((r) => selected?.has(rowKey(r))).length;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = nSel > 0 && nSel < rows.length;
  }, [nSel, rows.length]);

  return (
    <div className={s.wrap} style={maxHeight ? { "--table-max": maxHeight } : undefined}>
      <table className={s.table}>
        <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th className={s.chk} scope="col">
                <input ref={allRef} type="checkbox" aria-label="Selecionar todas as linhas desta página" checked={rows.length > 0 && nSel === rows.length} onChange={onToggleAll} />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" className={c.align === "right" ? s.right : undefined} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.sortable ? (
                    <button type="button" className={s.sortBtn} onClick={() => onSort(c.key)} aria-label={`Ordenar por ${c.label}`}>
                      {c.label}
                      <Icon name={active ? (sort.dir === "asc" ? "sortUp" : "sortDown") : "sort"} size={12} />
                    </button>
                  ) : c.label}
                </th>
              );
            })}
            {rowActions && <th scope="col" className={s.center} style={{ width: 40 }}><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Ações</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const k = rowKey(r);
            const on = selected?.has(k);
            return (
              <tr key={k} className={`${onRowClick ? s.clickable : ""} ${on ? s.sel : ""}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {selectable && (
                  <td className={s.chk} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Selecionar ${k}`} checked={!!on} onChange={() => onToggle(k)} />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? s.right : undefined}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
                {rowActions && <td className={s.center} onClick={(e) => e.stopPropagation()}>{rowActions(r)}</td>}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className={s.empty}>Nenhum registro para os filtros aplicados.</td></tr>
          )}
        </tbody>
        {footer && <tfoot><tr>{footer}</tr></tfoot>}
      </table>
    </div>
  );
}
