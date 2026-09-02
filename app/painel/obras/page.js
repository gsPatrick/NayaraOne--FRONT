"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import BarList from "@/components/molecules/BarList/BarList";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { SkeletonCardGrid } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE } from "@/lib/mock/construction";
import { listProjects, listMaintenanceCases } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatBRL, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

export default function ObrasHubPage() {
  const [projects, setProjects] = useState([]);
  const [maintenanceCases, setMaintenanceCases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProjects(), listMaintenanceCases(), listProperties(), apiFetch("/users")])
      .then(([p, m, props, u]) => {
        if (cancelled) return;
        setProjects(p || []);
        setMaintenanceCases(m || []);
        setProperties(props || []);
        setUsers(u || []);
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

  function propertyOf(id) {
    return properties.find((p) => p.id === id);
  }

  function userOf(id) {
    return users.find((u) => u.id === id);
  }

  const inProgress = useMemo(() => projects.filter((p) => p.status === "IN_PROGRESS"), [projects]);
  const totalBudget = useMemo(() => projects.reduce((sum, p) => sum + Number(p.budgetAmount || 0), 0), [projects]);
  const overdueProjects = useMemo(
    () => projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED" && isOverdue(p.endsAtPlanned)),
    [projects]
  );
  const openMaintenance = useMemo(
    () => maintenanceCases.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS"),
    [maintenanceCases]
  );
  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)).slice(0, 5),
    [projects]
  );
  const upcomingDeadlines = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED" && p.endsAtPlanned)
        .sort((a, b) => new Date(a.endsAtPlanned) - new Date(b.endsAtPlanned))
        .slice(0, 5),
    [projects]
  );

  const projectsByStatus = useMemo(() => {
    const counts = {};
    projects.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(PROJECT_STATUS_LABELS)
      .map(([code, label]) => ({ label, value: counts[code] || 0 }))
      .filter((item) => item.value > 0);
  }, [projects]);

  return (
    <AppShell title="Obras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as obras">{loadError}</Alert> : null}

      {loading ? (
        <SkeletonCardGrid count={5} />
      ) : (
        <div className={styles.grid}>
          <StatTile label="Total de obras" value={projects.length} tone="neutral" icon="building" />
          <StatTile label="Em andamento" value={inProgress.length} tone="info" icon="chart" />
          <StatTile
            label="Obras atrasadas"
            value={overdueProjects.length}
            tone={overdueProjects.length > 0 ? "danger" : "success"}
            icon="calendar"
          />
          <StatTile label="Orçamento total" value={formatBRL(totalBudget)} tone="neutral" icon="money" />
          <StatTile
            label="Chamados de pós-obra abertos"
            value={openMaintenance.length}
            tone={openMaintenance.length > 0 ? "danger" : "success"}
            icon="key"
          />
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.mainCol}>
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
                          {propertyOf(p.propertyId)?.name || "Sem imóvel vinculado"} · {userOf(p.responsibleUserId)?.name || "Sem responsável"}
                        </span>
                        <span className={styles.listRowSubtitle}>
                          Início {formatDate(p.startsAt)} · Previsão {p.endsAtPlanned ? formatDate(p.endsAtPlanned) : "—"} · {formatBRL(p.budgetAmount)}
                        </span>
                      </div>
                      <Badge tone={PROJECT_STATUS_TONE[p.status] || "neutral"}>{PROJECT_STATUS_LABELS[p.status] || p.status}</Badge>
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
                        <span className={styles.listRowSubtitle}>
                          {propertyOf(c.propertyId)?.name || "Sem imóvel vinculado"} · Aberto em {formatDate(c.createdAt || c.created_at)}
                        </span>
                      </div>
                      <Badge tone={MAINTENANCE_STATUS_TONE[c.status] || "neutral"}>{MAINTENANCE_STATUS_LABELS[c.status] || c.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card title="Obras por status" subtitle="Distribuição do portfólio">
            {loading ? (
              <SkeletonCardGrid count={1} />
            ) : projectsByStatus.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma obra cadastrada.</p>
            ) : (
              <BarList items={projectsByStatus} />
            )}
          </Card>

          <Card title="Próximos prazos" subtitle="Obras em andamento com previsão de término mais próxima">
            {loading ? (
              <SkeletonCardGrid count={2} />
            ) : upcomingDeadlines.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma obra com previsão de término cadastrada.</p>
            ) : (
              <ul className={styles.list}>
                {upcomingDeadlines.map((p) => (
                  <li key={p.id}>
                    <Link href={`/painel/obras/lista/${p.id}`} className={styles.listRow}>
                      <span className={styles.listRowIcon}><Icon name="calendar" size={16} /></span>
                      <div className={styles.listRowInfo}>
                        <span className={styles.listRowTitle}>{p.name}</span>
                        <span className={styles.listRowSubtitle}>{formatDate(p.endsAtPlanned)}</span>
                      </div>
                      {isOverdue(p.endsAtPlanned) ? <Badge tone="danger">Atrasada</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
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
