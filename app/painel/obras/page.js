"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { SkeletonCardGrid } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { PROJECT_STATUS_LABELS } from "@/lib/mock/construction";
import { listProjects, listMaintenanceCases } from "@/lib/api/construction";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function ObrasHubPage() {
  const [projects, setProjects] = useState([]);
  const [maintenanceCases, setMaintenanceCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProjects(), listMaintenanceCases()])
      .then(([p, m]) => {
        if (cancelled) return;
        setProjects(p || []);
        setMaintenanceCases(m || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as obras.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inProgress = useMemo(() => projects.filter((p) => p.status === "IN_PROGRESS"), [projects]);
  const openMaintenance = useMemo(
    () => maintenanceCases.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS"),
    [maintenanceCases]
  );
  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)).slice(0, 5),
    [projects]
  );

  return (
    <AppShell title="Obras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as obras">{loadError}</Alert> : null}

      {loading ? (
        <SkeletonCardGrid count={5} />
      ) : (
        <div className={styles.grid}>
          <StatTile label="Total de obras" value={projects.length} tone="neutral" icon="building" />
          <StatTile label="Obras em andamento" value={inProgress.length} tone="info" icon="chart" />
          <StatTile
            label="Chamados de pós-obra abertos"
            value={openMaintenance.length}
            tone={openMaintenance.length > 0 ? "danger" : "success"}
            icon="key"
          />
        </div>
      )}

      <div className={styles.mainGrid}>
        <Card
          title="Obras recentes"
          subtitle="Últimas obras cadastradas"
          actions={<Link href="/painel/obras/lista" className={styles.cardLink}>Ver todas</Link>}
        >
          {loading ? (
            <SkeletonCardGrid count={3} />
          ) : recentProjects.length === 0 ? (
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
          {loading ? (
            <SkeletonCardGrid count={3} />
          ) : openMaintenance.length === 0 ? (
            <p className={styles.emptyText}>Nenhum chamado aberto.</p>
          ) : (
            <ul className={styles.list}>
              {openMaintenance.map((c) => (
                <li key={c.id}>
                  <Link href={`/painel/obras/pos-obra/${c.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="key" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{c.description}</span>
                      <span className={styles.listRowSubtitle}>Aberto em {formatDate(c.createdAt || c.created_at)}</span>
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
