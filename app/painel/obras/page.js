"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import {
  PROJECTS,
  STAGE_MEASUREMENTS,
  DAILY_REPORTS,
  MAINTENANCE_CASES,
  PROJECT_STATUS_LABELS,
} from "@/lib/mock/construction";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

function startOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const d = new Date(now.setDate(diff));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ObrasHubPage() {
  const inProgress = useMemo(() => PROJECTS.filter((p) => p.status === "IN_PROGRESS"), []);
  const pendingMeasurements = useMemo(
    () => STAGE_MEASUREMENTS.filter((m) => m.status === "PENDING_APPROVAL"),
    []
  );
  const openMaintenance = useMemo(
    () => MAINTENANCE_CASES.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS"),
    []
  );
  const weekStart = useMemo(() => startOfWeek(), []);
  const reportsThisWeek = useMemo(
    () => DAILY_REPORTS.filter((r) => new Date(r.reportDate) >= weekStart),
    [weekStart]
  );

  const recentProjects = useMemo(
    () => [...PROJECTS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    []
  );

  return (
    <AppShell title="Obras">
      <div className={styles.grid}>
        <StatTile label="Total de obras" value={PROJECTS.length} tone="neutral" icon="building" />
        <StatTile label="Obras em andamento" value={inProgress.length} tone="info" icon="chart" />
        <StatTile label="RDOs desta semana" value={reportsThisWeek.length} tone="neutral" icon="document" />
        <StatTile
          label="Medições pendentes"
          value={pendingMeasurements.length}
          tone={pendingMeasurements.length > 0 ? "warning" : "success"}
          icon="filter"
        />
        <StatTile
          label="Chamados de pós-obra abertos"
          value={openMaintenance.length}
          tone={openMaintenance.length > 0 ? "danger" : "success"}
          icon="key"
        />
      </div>

      <div className={styles.mainGrid}>
        <Card
          title="Obras recentes"
          subtitle="Últimas obras cadastradas"
          actions={<Link href="/painel/obras/lista" className={styles.cardLink}>Ver todas</Link>}
        >
          {recentProjects.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma obra cadastrada.</p>
          ) : (
            <ul className={styles.list}>
              {recentProjects.map((p) => (
                <li key={p.id}>
                  <Link href={`/painel/obras/lista/${p.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="building" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{p.name}</span>
                      <span className={styles.listRowSubtitle}>
                        {PROJECT_STATUS_LABELS[p.status]} · Início {formatDate(p.startsAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Chamados de pós-obra abertos"
          subtitle="Aguardando atendimento"
          actions={<Link href="/painel/obras/pos-obra" className={styles.cardLink}>Ver todos</Link>}
        >
          {openMaintenance.length === 0 ? (
            <p className={styles.emptyText}>Nenhum chamado aberto.</p>
          ) : (
            <ul className={styles.list}>
              {openMaintenance.map((c) => (
                <li key={c.id}>
                  <Link href={`/painel/obras/pos-obra/${c.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="key" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{c.description}</span>
                      <span className={styles.listRowSubtitle}>Aberto em {formatDate(c.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <StickyActionBar>
        <Button variant="secondary" href="/painel/obras/lista">
          <Icon name="building" size={18} /> Ver obras
        </Button>
        <Button variant="secondary" href="/painel/obras/pos-obra">
          <Icon name="key" size={18} /> Ver pós-obra
        </Button>
        <Button href="/painel/obras/lista/novo">
          <Icon name="plus" size={18} /> Nova obra
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
