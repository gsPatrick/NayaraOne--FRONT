"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { getMetricDrilldown } from "@/lib/api/analytics";
import { metricTitle } from "@/lib/analytics/ptLabels";
import styles from "./BiDrilldownModal.module.css";

// M9-D690/M9-D634 — "Ver detalhe": chama GET /analytics/metrics/:code/drilldown com o item de `sourceRefs` do número. Sem permissão de detalhe a API
// responde 403 ANALYTICS_DRILLDOWN_FORBIDDEN com o agregado permitido: a tela mostra o agregado e nenhuma linha. Os campos RESTRICTED já chegam mascarados.
// A API pagina (page/pageSize, máximo analytics.drilldown.tamanho_pagina_maximo = 200) e devolve { page, pageSize, totalPages, aggregate.count }.
// Por isso o modal expõe navegação de páginas, seletor de tamanho e uma busca local sobre as linhas da página — sem elas a lista mostrava só
// as primeiras 20 linhas, sem como chegar a uma obra específica (reteste da Nayara, 25/11).
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

function columnsOf(rows) {
  const keys = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k) && typeof r[k] !== "object") keys.push(k); }));
  return keys.slice(0, 8);
}

function Aggregate({ aggregate }) {
  if (!aggregate) return <p>O detalhe não está liberado para o seu perfil.</p>;
  // Total parcial (M9-D650): a origem marca `partial` quando há linhas sem valor que aparecem na lista mas não entram na soma; mostra quantas têm valor.
  if (aggregate.partial) {
    return (
      <p className={styles.aggregate} data-bi-aggregate data-bi-partial>
        Total parcial: <strong>{aggregate.computed ?? "-"}</strong> de <strong>{aggregate.count ?? "-"}</strong> registro(s) com valor calculado{aggregate.total !== undefined && aggregate.total !== null ? <> · soma <strong>{String(aggregate.total)}</strong></> : null}. Os demais aparecem na lista sem valor e não entram na soma.
      </p>
    );
  }
  return (
    <p className={styles.aggregate} data-bi-aggregate>
      Total permitido: <strong>{aggregate.count ?? "-"}</strong> registro(s){aggregate.total !== undefined && aggregate.total !== null ? <> · soma <strong>{String(aggregate.total)}</strong></> : null}.
    </p>
  );
}

export default function BiDrilldownModal({ widget, onClose }) {
  const [state, setState] = useState({ loading: true, data: null, forbidden: null, error: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [query, setQuery] = useState("");
  const sourceRef = widget?.drilldown?.sourceRef;

  // Troca de indicador: volta pra primeira página e limpa a busca.
  useEffect(() => { setPage(1); setQuery(""); }, [widget, sourceRef]);

  useEffect(() => {
    if (!widget || !sourceRef) return undefined;
    let cancelled = false;
    setState({ loading: true, data: null, forbidden: null, error: "" });
    getMetricDrilldown(widget.metricCode, sourceRef, { page, pageSize })
      .then((data) => { if (!cancelled) setState({ loading: false, data, forbidden: null, error: "" }); })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === "ANALYTICS_DRILLDOWN_FORBIDDEN") setState({ loading: false, data: null, forbidden: err.details?.aggregate ?? {}, error: "" });
        else setState({ loading: false, data: null, forbidden: null, error: err?.message || "Não foi possível abrir o detalhe." });
      });
    return () => { cancelled = true; };
  }, [widget, sourceRef, page, pageSize]);

  const rows = useMemo(() => state.data?.rows || [], [state.data]);
  const columns = useMemo(() => columnsOf(rows), [rows]);
  const totalPages = Math.max(1, Number(state.data?.totalPages) || 1);
  const totalCount = state.data?.aggregate?.count;

  // Busca local: filtra as linhas da página carregada por qualquer coluna textual (nome, código, id...). Com pageSize = 200 a maioria das
  // listas cabe em 1–3 páginas, então a busca + navegação cobrem o caso de achar uma obra específica.
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => columns.some((c) => String(row[c] ?? "").toLowerCase().includes(q)));
  }, [rows, columns, query]);

  if (!widget) return null;
  return (
    <Modal open onClose={onClose} title={`Detalhe: ${metricTitle(widget.metricCode, widget.title)}`} size="lg">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.forbidden ? (
        <>
          <Alert tone="warning" title="Detalhe não liberado">Você vê só o total permitido deste indicador, sem as linhas.</Alert>
          <Aggregate aggregate={state.forbidden} />
        </>
      ) : null}
      {state.data || state.loading ? (
        <>
          {state.data ? <p className={styles.description}>{state.data.description}</p> : null}
          {widget.metricCode === "obra.projected_margin" ? (
            <div className={styles.note} role="note">
              <strong>Duas margens, finalidades diferentes.</strong> Esta é a <em>Margem projetada (BI)</em> = receita contratada − projeção de custo (forecast), uma linha por obra, a partir do snapshot do BI. Já a <em>Ficha da obra (“Saúde”)</em> mostra a margem <em>operacional</em> = orçamento aprovado − custo projetado da execução, calculada ao vivo. Os valores podem diferir porque medem coisas distintas: retorno do contrato × execução da obra.
            </div>
          ) : null}
          {state.data ? <Aggregate aggregate={state.data.aggregate} /> : null}

          <div className={styles.toolbar}>
            <input
              type="search"
              className={styles.search}
              placeholder="Buscar nesta página (nome, código, id...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar nas linhas carregadas"
            />
            <label className={styles.pageSize}>
              Por página:
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Registros por página">
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          {state.loading ? <Spinner size="lg" /> : null}

          {!state.loading && state.data ? (
            visibleRows.length ? (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>{visibleRows.map((row, i) => <tr key={row.id || i}>{columns.map((c) => <td key={c}>{String(row[c] ?? "")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            ) : (
              <p>{query.trim() ? "Nenhuma linha desta página corresponde à busca. Tente outra página ou aumente os registros por página." : "Nenhum registro."}</p>
            )
          ) : null}

          {!state.loading && state.data && totalPages > 1 ? (
            <div className={styles.pager}>
              <button type="button" className={styles.pagerBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
              <span className={styles.pagerInfo}>
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                {totalCount !== undefined && totalCount !== null ? <> · {totalCount} registro(s) no total</> : null}
              </span>
              <button type="button" className={styles.pagerBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Próxima</button>
            </div>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
