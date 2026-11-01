"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { getMetricDrilldown } from "@/lib/api/analytics";
import { metricTitle } from "@/lib/analytics/ptLabels";
import styles from "./BiDrilldownModal.module.css";

// M9-D690/M9-D634 — "Ver detalhe": chama GET /analytics/metrics/:code/drilldown com o item de `sourceRefs` do número. Sem permissão de detalhe a API
// responde 403 ANALYTICS_DRILLDOWN_FORBIDDEN com o agregado permitido: a tela mostra o agregado e nenhuma linha. Os campos RESTRICTED já chegam mascarados.
function columnsOf(rows) {
  const keys = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k) && typeof r[k] !== "object") keys.push(k); }));
  return keys.slice(0, 8);
}

function Aggregate({ aggregate }) {
  if (!aggregate) return <p>O detalhe não está liberado para o seu perfil.</p>;
  return (
    <p className={styles.aggregate} data-bi-aggregate>
      Total permitido: <strong>{aggregate.count ?? "-"}</strong> registro(s){aggregate.total !== undefined && aggregate.total !== null ? <> · soma <strong>{String(aggregate.total)}</strong></> : null}.
    </p>
  );
}

export default function BiDrilldownModal({ widget, onClose }) {
  const [state, setState] = useState({ loading: true, data: null, forbidden: null, error: "" });
  const sourceRef = widget?.drilldown?.sourceRef;

  useEffect(() => {
    if (!widget || !sourceRef) return undefined;
    let cancelled = false;
    setState({ loading: true, data: null, forbidden: null, error: "" });
    getMetricDrilldown(widget.metricCode, sourceRef)
      .then((data) => { if (!cancelled) setState({ loading: false, data, forbidden: null, error: "" }); })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === "ANALYTICS_DRILLDOWN_FORBIDDEN") setState({ loading: false, data: null, forbidden: err.details?.aggregate ?? {}, error: "" });
        else setState({ loading: false, data: null, forbidden: null, error: err?.message || "Não foi possível abrir o detalhe." });
      });
    return () => { cancelled = true; };
  }, [widget, sourceRef]);

  if (!widget) return null;
  const rows = state.data?.rows || [];
  const columns = columnsOf(rows);
  return (
    <Modal open onClose={onClose} title={`Detalhe: ${metricTitle(widget.metricCode, widget.title)}`} size="lg">
      {state.loading ? <Spinner size="lg" /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.forbidden ? (
        <>
          <Alert tone="warning" title="Detalhe não liberado">Você vê só o total permitido deste indicador, sem as linhas.</Alert>
          <Aggregate aggregate={state.forbidden} />
        </>
      ) : null}
      {state.data ? (
        <>
          <p className={styles.description}>{state.data.description}</p>
          <Aggregate aggregate={state.data.aggregate} />
          {rows.length ? (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                <tbody>{rows.map((row, i) => <tr key={row.id || i}>{columns.map((c) => <td key={c}>{String(row[c] ?? "")}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : <p>Nenhum registro.</p>}
        </>
      ) : null}
    </Modal>
  );
}
