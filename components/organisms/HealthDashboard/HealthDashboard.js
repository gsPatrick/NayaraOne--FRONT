"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { classifyFailure } from "@/lib/asyncState/states";
import Spinner from "@/components/atoms/Spinner/Spinner";
import BiBanner from "@/components/molecules/analytics/BiBanner/BiBanner";
import BiMetricCard from "@/components/molecules/analytics/BiMetricCard/BiMetricCard";
import BiDrilldownModal from "@/components/molecules/analytics/BiDrilldownModal/BiDrilldownModal";
import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import { getDashboard } from "@/lib/api/analytics";
import { formatDateTime } from "@/lib/format";
import styles from "./HealthDashboard.module.css";

// M9-D686 — Saúde Geral: uma linha por área, com o semáforo (cor SEMPRE com o texto escrito), os 3 KPIs principais, os alertas abertos, o selo de atualização do pior
// KPI e o link para o painel da área. A cor e o motivo vêm decididos pelo servidor; nenhum limite, número ou cor é calculado aqui. Área sem acesso aparece em cinza.
function KpiCell({ kpi, onDetail }) {
  return (
    <div className={styles.kpi} data-health-kpi={kpi.metricCode}>
      <BiMetricCard widget={kpi} onDetail={onDetail} />
      {kpi.light ? <span className={styles.kpiLight} data-health-kpi-light={kpi.light.color}>{kpi.light.text}</span> : null}
    </div>
  );
}

function AreaRow({ area, onDetail }) {
  const unreadable = area.noAccess === true;
  return (
    <section className={[styles.area, styles[area.light.color]].join(" ")} data-health-area={area.key} data-health-color={area.light.color} aria-label={`${area.label}: ${area.light.text}`}>
      <div className={styles.head}>
        <h3 className={styles.name}>{unreadable ? area.label : <Link href={area.href}>{area.label}</Link>}</h3>
        <span className={[styles.light, styles[area.light.color]].join(" ")} data-health-light>{area.light.text}</span>
      </div>
      {unreadable ? null : (
        <>
          <div className={styles.info}>
            <span>{area.summary}</span>
            <span data-health-alerts>{area.openAlerts} {area.openAlerts === 1 ? "alerta aberto" : "alertas abertos"}</span>
            {area.freshness ? <FreshnessBadge metric={{ value: 1, status: "OK", freshness: area.freshness }} /> : null}
          </div>
          {area.reasons.length ? <ul className={styles.reasons}>{area.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}
          <div className={styles.kpis}>{area.kpis.map((k) => <KpiCell key={k.metricCode} kpi={k} onDetail={onDetail} />)}</div>
        </>
      )}
    </section>
  );
}

export default function HealthDashboard({ title = "Saúde Geral" }) {
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard("health")
      .then((data) => { if (!cancelled) setPanel(data); })
      .catch((err) => { if (!cancelled) setError(err || new Error("Não foi possível carregar a Saúde Geral.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const banner = panel?.widgets.find((w) => w.type === "QUALITY_BANNER");
  return (
    <AppShell title={title}>
      {/* M9-D850 (F08): a falta de permissão e as demais falhas usam o estado comum, como os outros painéis. */}
      {error ? <AsyncState result={{ status: classifyFailure(error), error, traceId: error.traceId }} /> : null}
      {loading ? <Spinner size="lg" /> : null}
      {panel ? (
        <div className={styles.page} data-bi-panel="health">
          <p className={styles.meta}>Posição em {panel.asOfDate.split("-").reverse().join("/")} · gerado em {formatDateTime(panel.generatedAt)}</p>
          {banner ? <BiBanner widget={banner} /> : null}
          <ul className={styles.summary} aria-label="Resumo das áreas">
            <li>Verde: {panel.summary.verde}</li><li>Amarelo: {panel.summary.amarelo}</li><li>Vermelho: {panel.summary.vermelho}</li><li>Cinza: {panel.summary.cinza}</li>
          </ul>
          <div className={styles.areas}>{panel.areas.map((a) => <AreaRow key={a.key} area={a} onDetail={setDetail} />)}</div>
        </div>
      ) : null}
      {detail ? <BiDrilldownModal widget={detail} onClose={() => setDetail(null)} /> : null}
    </AppShell>
  );
}
