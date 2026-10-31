"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import BarList from "@/components/molecules/BarList/BarList";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { SkeletonCardGrid } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, PROJECT_TERMINAL_STATUSES, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE } from "@/lib/mock/construction";
import { listProjects, listMaintenanceCases } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatBRL, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

import { lookupFallback } from "@/lib/asyncState/lookup";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
export default function ObrasHubPage() {
  // M9-D850: carregamento, erro, 403 e offline vêm do padrão único de estados.
  // Imóveis só dão o nome do imóvel: sem properties:read a falha é registrada (lookupFallback) e o resto carrega.
  // O hub nunca é "vazio": sem obras ele ainda mostra os chamados e os atalhos (os vazios de cada cartão são tratados nele).
  const hubQuery = useAsyncState(
    async () => {
      const [projects, maintenanceCases, properties, users] = await Promise.all([listProjects(), listMaintenanceCases(), listProperties().catch(lookupFallback("os imóveis")), apiFetch("/users")]);
      return { projects: projects || [], maintenanceCases: maintenanceCases || [], properties: properties || [], users: users || [] };
    },
    { key: "obras-hub", isEmpty: () => false }
  );
  const { projects = [], maintenanceCases = [], properties = [], users = [] } = hubQuery.data || {};
  const loading = hubQuery.status === "LOADING";

  function propertyOf(id) {
    return properties.find((p) => p.id === id);
  }

  function userOf(id) {
    return users.find((u) => u.id === id);
  }

  const inProgress = useMemo(() => projects.filter((p) => p.status === "ACTIVE"), [projects]);
  const totalBudget = useMemo(() => projects.reduce((sum, p) => sum + Number(p.budgetAmount || 0), 0), [projects]);
  const overdueProjects = useMemo(
    () => projects.filter((p) => !PROJECT_TERMINAL_STATUSES.includes(p.status) && isOverdue(p.endsAtPlanned)),
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
        .filter((p) => !PROJECT_TERMINAL_STATUSES.includes(p.status) && p.endsAtPlanned)
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
      <AsyncState result={hubQuery}>
        {() => (
          <>
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
                              Início {formatDate(p.startsAt)} · Previsão {p.endsAtPlanned ? formatDate(p.endsAtPlanned) : "Sem previsão de término"} · {formatBRL(p.budgetAmount)}
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
          </>
        )}
      </AsyncState>

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
