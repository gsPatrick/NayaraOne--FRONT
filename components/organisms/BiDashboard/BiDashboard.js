"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import BiBanner from "@/components/molecules/analytics/BiBanner/BiBanner";
import BiMetricCard from "@/components/molecules/analytics/BiMetricCard/BiMetricCard";
import BiBarsWidget from "@/components/molecules/analytics/BiBarsWidget/BiBarsWidget";
import BiTableWidget from "@/components/molecules/analytics/BiTableWidget/BiTableWidget";
import BiDrilldownModal from "@/components/molecules/analytics/BiDrilldownModal/BiDrilldownModal";
import { getDashboard } from "@/lib/api/analytics";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import styles from "./BiDashboard.module.css";

// M9-D634/M9-D662 — painel de BI genérico: abre `GET /analytics/dashboards/:code` (uma resposta com todos os widgets, na ordem do servidor) e só desenha.
// A faixa de qualidade é sempre o primeiro bloco. Nenhum número é calculado aqui. O nome do corretor vem da lista de usuários quando o perfil pode lê-la.
function renderWidget(widget, props) {
  if (widget.type === "QUALITY_BANNER") return <BiBanner key={widget.position} widget={widget} />;
  if (!widget.metric) return null;
  if (widget.type === "BAR") return <BiBarsWidget key={widget.position} widget={widget} {...props} />;
  if (widget.type === "TABLE") return <BiTableWidget key={widget.position} widget={widget} {...props} />;
  return <BiMetricCard key={widget.position} widget={widget} {...props} />;
}

function userNames(list) {
  return Object.fromEntries((Array.isArray(list) ? list : []).map((u) => [u.id, u.name || u.fullName || u.email]).filter(([, name]) => name));
}

export default function BiDashboard({ code, title }) {
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState({});
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getDashboard(code)
      .then((data) => { if (!cancelled) setPanel(data); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Não foi possível carregar o painel."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    apiFetch("/users").then((list) => { if (!cancelled) setUsers(userNames(list)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [code]);

  const banner = panel?.widgets.find((w) => w.type === "QUALITY_BANNER");
  const body = (panel?.widgets || []).filter((w) => w.type !== "QUALITY_BANNER");
  return (
    <AppShell title={title}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <Spinner size="lg" /> : null}
      {!loading && !error && !panel ? <EmptyState icon="chart" title="Sem dados" description="Nenhum indicador disponível." /> : null}
      {panel ? (
        <div className={styles.page} data-bi-panel={panel.dashboardCode}>
          <p className={styles.meta}>Posição em {panel.asOfDate.split("-").reverse().join("/")} · gerado em {formatDateTime(panel.generatedAt)}</p>
          {banner ? <BiBanner widget={banner} /> : null}
          <div className={styles.grid}>
            {body.map((w) => renderWidget(w, { users, onDetail: setDetail }))}
          </div>
        </div>
      ) : null}
      {detail ? <BiDrilldownModal widget={detail} onClose={() => setDetail(null)} /> : null}
    </AppShell>
  );
}
