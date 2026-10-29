"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { getMetric } from "@/lib/api/analytics";
import { getSession } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/rbac/permissions";
import styles from "./BiGroupScope.module.css";

// M9-D626/M9-D625 — seletor Empresa/Grupo do painel. "Empresa" é o painel como a API devolveu. "Grupo" chama GET /analytics/metrics/:code?groupId= de cada indicador que soma
// entre empresas e mostra o valor consolidado, a abertura por empresa (byCompany), a eliminação (eliminations), o aviso de empresas permitidas (warnings) e a mensagem de
// transferência entre empresas sem contrapartida. Tudo pronto da API (campos `formatted`); nenhuma conta aqui. Sem analytics:read:group (403 ANALYTICS_GROUP_SCOPE_FORBIDDEN)
// o seletor oferece só a empresa.
const UNMATCHED_CODE = "ANALYTICS_INTERCOMPANY_UNMATCHED";
const UNMATCHED_TEXT = "Há transferências entre empresas sem contrapartida";

function Consolidated({ item }) {
  const { data } = item;
  const unmatched = data.consolidatedStatus === "DEGRADED" && data.code === UNMATCHED_CODE;
  return (
    <article className={styles.card} data-bi-consolidated={item.metricCode}>
      <h3 className={styles.title}>{item.title}</h3>
      {data.value === null || data.value === undefined ? <p className={styles.muted} data-bi-value>Dado incompleto</p> : <p className={styles.value} data-bi-value>{data.formatted}</p>}
      {data.eliminationsFormatted ? <p className={styles.meta} data-bi-eliminations>Eliminação entre empresas: {data.eliminationsFormatted}</p> : null}
      {unmatched ? <Alert tone="warning" title="Consolidado incompleto">{UNMATCHED_TEXT}</Alert> : null}
      {(data.warnings || []).map((w) => <p key={w.code} className={styles.meta} role="status" data-bi-warning>{w.message}</p>)}
      <table className={styles.table}>
        <thead><tr><th scope="col">Empresa</th><th scope="col" className={styles.num}>Valor</th></tr></thead>
        <tbody>
          {(data.byCompany || []).map((c) => (
            <tr key={c.companyId}><th scope="row">{c.companyName}</th><td className={styles.num}>{c.formatted ?? "Dado incompleto"}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function BiGroupScope({ metrics, asOf }) {
  const session = typeof window === "undefined" ? null : getSession();
  const [canGroup, setCanGroup] = useState(false);
  const [scope, setScope] = useState("COMPANY");
  const [state, setState] = useState({ loading: false, items: [], error: "" });
  const groupId = session?.groupId || null;

  useEffect(() => { setCanGroup(Boolean(groupId) && hasAnyPermission(["analytics:read:group"])); }, [groupId]);

  useEffect(() => {
    if (scope !== "GROUP" || !groupId) return undefined;
    let cancelled = false;
    setState({ loading: true, items: [], error: "" });
    Promise.all(metrics.map(async (m) => ({ ...m, data: await getMetric(m.metricCode, { groupId, asOf }) })))
      .then((items) => { if (!cancelled) setState({ loading: false, items, error: "" }); })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === "ANALYTICS_GROUP_SCOPE_FORBIDDEN") { setCanGroup(false); setScope("COMPANY"); setState({ loading: false, items: [], error: "" }); return; }
        setState({ loading: false, items: [], error: err?.message || "Não foi possível carregar o consolidado." });
      });
    return () => { cancelled = true; };
  }, [scope, groupId, asOf, metrics]);

  return (
    <section className={styles.wrap} aria-label="Escopo do painel">
      <label className={styles.label} htmlFor="bi-scope">Visão</label>
      <select id="bi-scope" className={styles.select} value={scope} onChange={(e) => setScope(e.target.value)} data-bi-scope>
        <option value="COMPANY">Empresa</option>
        {canGroup ? <option value="GROUP">Grupo (consolidado)</option> : null}
      </select>
      {scope === "GROUP" ? (
        <div className={styles.group} data-bi-scope-group>
          {state.loading ? <Spinner size="lg" /> : null}
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
          {state.items.map((item) => <Consolidated key={item.metricCode} item={item} />)}
        </div>
      ) : null}
    </section>
  );
}
