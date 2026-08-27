"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Tabs from "@/components/molecules/Tabs/Tabs";
import BarList from "@/components/molecules/BarList/BarList";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonCardGrid } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { AVAILABILITY_STATUS_LABELS } from "@/lib/mock/properties";
import { STAGES } from "@/lib/mock/opportunities";
import { AUDIT_LOG, ACTION_LABELS, ENTITY_TYPE_LABELS } from "@/lib/mock/auditLog";
import { COMPANY_STATUS_LABELS } from "@/lib/mock/companies";
import { ROLE_LABELS, STATUS_TONE, STATUS_LABELS } from "@/lib/mock/people";
import { listProperties } from "@/lib/api/properties";
import { listOpportunities } from "@/lib/api/crm";
import { listRadars } from "@/lib/api/radar";
import { listPeople, listDuplicatePairs } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { matchRadarToProperties, PROPERTY_TYPE_LABELS } from "@/lib/radarMatching";
import { formatDateTime, formatBRL, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

const CLOSED_STAGES = ["ganho", "perdido"];

const ENTITY_HREF = {
  Property: (id) => `/painel/imoveis/${id}`,
  Person: (id) => `/painel/pessoas/${id}`,
  Company: (id) => `/painel/empresas/${id}`,
  User: (id) => `/painel/usuarios/${id}`,
  PropertyRadar: (id) => `/painel/radar/${id}`,
};

const ACTION_ICON = {
  CREATE: "plus",
  UPDATE: "settings",
  DELETE: "trash",
  LOGIN: "logout",
  STATUS_CHANGE: "shield",
};

const QUICK_ACTIONS = [
  { label: "Novo imóvel", href: "/painel/imoveis/novo", icon: "building" },
  { label: "Novo contato", href: "/painel/pessoas/novo", icon: "users" },
  { label: "Novo radar", href: "/painel/radar/novo", icon: "radar" },
  { label: "Nova empresa", href: "/painel/empresas/novo", icon: "layers" },
];

const GRADIENTS = [
  "linear-gradient(135deg, #3a2f1c 0%, #b8873a 100%)",
  "linear-gradient(135deg, #1c2a3a 0%, #3a6ab8 100%)",
  "linear-gradient(135deg, #2a1c3a 0%, #8a3ab8 100%)",
  "linear-gradient(135deg, #1c3a2a 0%, #3ab86a 100%)",
];

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash << 5) - hash + str.charCodeAt(i);
  return hash;
}

function toDisplayUserStatus(apiStatus) {
  return apiStatus === "ACTIVE" ? "Ativo" : "Suspenso";
}

function ListRow({ href, icon, avatarName, title, subtitle, right }) {
  return (
    <Link href={href} className={styles.listRow}>
      {avatarName ? (
        <Avatar name={avatarName} size="sm" />
      ) : (
        <span className={styles.listRowIcon}>
          <Icon name={icon} size={16} />
        </span>
      )}
      <div className={styles.listRowInfo}>
        <span className={styles.listRowTitle}>{title}</span>
        {subtitle ? <span className={styles.listRowSubtitle}>{subtitle}</span> : null}
      </div>
      {right ? <span className={styles.listRowRight}>{right}</span> : null}
    </Link>
  );
}

export default function PainelPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [duplicatePairs, setDuplicatePairs] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [radars, setRadars] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      listProperties(),
      listPeople(),
      listDuplicatePairs(),
      listOpportunities(),
      listRadars(),
      apiFetch("/companies"),
      apiFetch("/units"),
      apiFetch("/users"),
      apiFetch("/memberships"),
    ])
      .then(([apiProperties, apiPeople, apiDuplicates, apiOpportunities, apiRadars, apiCompanies, apiUnits, apiUsers, apiMemberships]) => {
        if (cancelled) return;
        setProperties(apiProperties || []);
        setPeople(apiPeople || []);
        setDuplicatePairs(apiDuplicates || []);
        setOpportunities(apiOpportunities || []);
        setRadars(apiRadars || []);
        setCompanies(
          (apiCompanies || []).map((c) => ({
            ...c,
            units: (apiUnits || []).filter((u) => u.companyId === c.id),
          }))
        );
        setUsers(
          (apiUsers || []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: toDisplayUserStatus(u.status),
            memberships: (apiMemberships || [])
              .filter((m) => m.userId === u.id)
              .map((m) => ({ company: m.company?.name || "—", role: m.role?.name || "Sem papel", unit: m.unit?.name || null })),
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o painel.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const personName = (id) => people.find((p) => p.id === id)?.legalName || "—";

  // ---- Overview ----
  const activeProperties = useMemo(() => properties.filter((p) => p.availabilityStatus === "AVAILABLE"), [properties]);
  const openOpportunities = useMemo(() => opportunities.filter((o) => !CLOSED_STAGES.includes(o.stage)), [opportunities]);
  const overdueOpportunities = useMemo(
    () => openOpportunities.filter((o) => isOverdue(o.nextActionDueAt)).sort((a, b) => new Date(a.nextActionDueAt) - new Date(b.nextActionDueAt)),
    [openOpportunities]
  );
  const radarsWithMatch = useMemo(() => radars.filter((r) => matchRadarToProperties(r, properties).length > 0), [radars, properties]);
  const recentActivity = useMemo(
    () => [...AUDIT_LOG].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 6),
    []
  );

  // ---- Imóveis ----
  const propertiesByType = useMemo(() => {
    const counts = {};
    properties.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [properties]);
  const propertiesByStatus = useMemo(() => {
    const counts = {};
    properties.forEach((p) => { counts[p.availabilityStatus] = (counts[p.availabilityStatus] || 0) + 1; });
    return counts;
  }, [properties]);
  const totalPortfolioValue = useMemo(
    () => properties.reduce((sum, p) => sum + (p.activeOffer?.askingPrice || 0), 0),
    [properties]
  );
  const recentProperties = useMemo(() => [...properties].slice(-6).reverse(), [properties]);

  // ---- Contatos ----
  const peoplePF = useMemo(() => people.filter((p) => p.personType === "PF").length, [people]);
  const peoplePJ = useMemo(() => people.filter((p) => p.personType === "PJ").length, [people]);
  const peopleByRole = useMemo(() => {
    const counts = {};
    people.forEach((p) => (p.roles || []).forEach((r) => { counts[r] = (counts[r] || 0) + 1; }));
    return Object.entries(counts).map(([code, value]) => ({ label: ROLE_LABELS[code] || code, value, code }));
  }, [people]);
  const duplicatesCount = duplicatePairs.length;
  const recentPeople = useMemo(() => [...people].slice(-5).reverse(), [people]);

  // ---- CRM ----
  const oppByStage = useMemo(() => {
    const counts = {};
    opportunities.forEach((o) => { counts[o.stage] = (counts[o.stage] || 0) + 1; });
    return STAGES.map((s) => ({ label: s.label, value: counts[s.key] || 0, key: s.key }));
  }, [opportunities]);
  const wonOpportunities = useMemo(() => opportunities.filter((o) => o.stage === "ganho"), [opportunities]);
  const lostOpportunities = useMemo(() => opportunities.filter((o) => o.stage === "perdido"), [opportunities]);
  const winRate = wonOpportunities.length + lostOpportunities.length > 0
    ? Math.round((wonOpportunities.length / (wonOpportunities.length + lostOpportunities.length)) * 100)
    : 0;

  // ---- Radar ----
  const radarsWithoutMatch = radars.length - radarsWithMatch.length;
  const totalMatches = useMemo(() => radars.reduce((sum, r) => sum + matchRadarToProperties(r, properties).length, 0), [radars, properties]);
  const recentRadars = useMemo(() => [...radars].slice(-5).reverse(), [radars]);

  // ---- Empresas & Unidades ----
  const activeCompanies = useMemo(() => companies.filter((c) => c.status === "ACTIVE"), [companies]);
  const totalUnits = useMemo(() => companies.reduce((sum, c) => sum + c.units.length, 0), [companies]);
  const usersByCompany = useMemo(
    () => companies.map((c) => ({ label: c.name, value: users.filter((u) => u.memberships.some((m) => m.company === c.name)).length })),
    [companies, users]
  );
  const unitsByCompany = useMemo(() => companies.map((c) => ({ label: c.name, value: c.units.length })), [companies]);

  // ---- Usuários ----
  const activeUsers = useMemo(() => users.filter((u) => u.status === "Ativo"), [users]);
  const usersByRole = useMemo(() => {
    const counts = {};
    users.forEach((u) => u.memberships.forEach((m) => { counts[m.role] = (counts[m.role] || 0) + 1; }));
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [users]);

  if (loading) {
    return (
      <AppShell title="Painel">
        <SkeletonCardGrid count={4} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Painel">
        <Alert tone="danger" title="Não foi possível carregar o painel">{loadError}</Alert>
      </AppShell>
    );
  }

  const overviewTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Imóveis ativos" value={activeProperties.length} delta={`${properties.length} no total`} tone="success" icon="building" />
        <StatTile
          label="Oportunidades abertas"
          value={openOpportunities.length}
          delta={`${overdueOpportunities.length} com ação vencida`}
          tone={overdueOpportunities.length > 0 ? "warning" : "success"}
          icon="chart"
        />
        <StatTile label="Radares com match" value={radarsWithMatch.length} delta={`de ${radars.length} radares ativos`} tone="info" icon="radar" />
        <StatTile
          label="Ações vencidas"
          value={overdueOpportunities.length}
          delta={overdueOpportunities.length > 0 ? "precisam de atenção" : "tudo em dia"}
          tone={overdueOpportunities.length > 0 ? "danger" : "success"}
          icon="document"
        />
      </div>

      <div className={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <Link href={action.href} className={styles.quickAction} key={action.href}>
            <Icon name={action.icon} size={16} />
            {action.label}
          </Link>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <Card title="Ações vencidas" subtitle={overdueOpportunities.length === 0 ? "Nenhuma pendência no momento" : "Oportunidades com próxima ação atrasada"}>
          {overdueOpportunities.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma ação vencida — bom trabalho.</p>
          ) : (
            <ul className={styles.overdueList}>
              {overdueOpportunities.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link href="/painel/crm" className={styles.overdueRow}>
                    <Avatar name={personName(o.personId)} size="sm" />
                    <div className={styles.overdueInfo}>
                      <span className={styles.overdueName}>{personName(o.personId)}</span>
                      <span className={styles.overdueAction}>{o.nextAction}</span>
                    </div>
                    <span className={styles.overdueDue}>{formatDateTime(o.nextActionDueAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Atividade recente" subtitle="Últimas movimentações do sistema" className={styles.activityCard}>
          {recentActivity.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((entry) => {
                const actor = users.find((u) => u.id === entry.userId);
                const href = ENTITY_HREF[entry.entityType]?.(entry.entityId);
                const entityLabel = ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType;
                return (
                  <li key={entry.id} className={styles.activityItem}>
                    <span className={styles.activityIcon}>
                      <Icon name={ACTION_ICON[entry.action] || "document"} size={14} />
                    </span>
                    <div className={styles.activityBody}>
                      <span className={styles.activityLabel}>
                        <strong>{actor?.name || "Sistema"}</strong> {(ACTION_LABELS[entry.action] || entry.action).toLowerCase()}
                        {entry.action !== "LOGIN" ? (
                          <>
                            {" "}
                            {entityLabel.toLowerCase()}
                            {href ? <> <Link href={href} className={styles.activityLink}>ver</Link></> : null}
                          </>
                        ) : null}
                      </span>
                      <span className={styles.activityTime}>{formatDateTime(entry.occurredAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );

  const imoveisTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Total de imóveis" value={properties.length} icon="building" />
        <StatTile label="Disponíveis" value={propertiesByStatus.AVAILABLE || 0} tone="success" icon="check" />
        <StatTile label="Alugados" value={propertiesByStatus.RENTED || 0} tone="info" icon="document" />
        <StatTile label="Valor em portfólio" value={formatBRL(totalPortfolioValue)} icon="money" />
      </div>

      <Card title="Cadastrados recentemente" subtitle="Últimos imóveis adicionados ao portfólio" className={styles.section}>
        {recentProperties.length === 0 ? (
          <p className={styles.emptyText}>Nenhum imóvel cadastrado ainda.</p>
        ) : (
          <div className={styles.carousel}>
            {recentProperties.map((p) => (
              <Link href={`/painel/imoveis/${p.id}`} className={styles.carouselCard} key={p.id}>
                <div className={styles.carouselThumb} style={{ background: GRADIENTS[Math.abs(hashCode(p.id)) % GRADIENTS.length] }}>
                  <Icon name="building" size={22} />
                </div>
                <div className={styles.carouselInfo}>
                  <span className={styles.carouselName}>{p.name}</span>
                  <span className={styles.carouselMeta}>{p.internalCode} · {p.city}</span>
                  <span className={styles.carouselPrice}>
                    {p.activeOffer ? formatBRL(p.activeOffer.askingPrice) : "—"}
                    {p.activeOffer?.offerType === "RENT" ? <span className={styles.carouselPriceSuffix}>/mês</span> : null}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className={styles.mainGrid}>
        <Card title="Por tipo" subtitle="Distribuição do portfólio">
          <BarList items={propertiesByType} />
        </Card>
        <Card title="Por status" subtitle="Situação de disponibilidade">
          <BarList
            items={Object.entries(propertiesByStatus).map(([status, value]) => ({
              label: AVAILABILITY_STATUS_LABELS[status] || status,
              value,
            }))}
          />
        </Card>
      </div>
    </>
  );

  const contatosTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Total de contatos" value={people.length} icon="users" />
        <StatTile label="Pessoas físicas" value={peoplePF} icon="users" />
        <StatTile label="Pessoas jurídicas" value={peoplePJ} icon="layers" />
        <StatTile label="Possíveis duplicatas" value={duplicatesCount} tone={duplicatesCount > 0 ? "warning" : "success"} icon="shield" />
      </div>
      <div className={styles.mainGrid}>
        <Card title="Por papel" subtitle="Clientes, proprietários, locatários e fornecedores">
          <BarList items={peopleByRole} />
        </Card>
        <Card title="Cadastrados recentemente" subtitle="Últimos contatos adicionados">
          <ul className={styles.list}>
            {recentPeople.map((p) => (
              <li key={p.id}>
                <ListRow
                  href={`/painel/pessoas/${p.id}`}
                  avatarName={p.legalName}
                  title={p.legalName}
                  subtitle={p.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                  right={<Badge tone={STATUS_TONE[p.status] || "neutral"}>{STATUS_LABELS[p.status] || p.status}</Badge>}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );

  const crmTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Oportunidades no funil" value={opportunities.length} icon="chart" />
        <StatTile label="Abertas" value={openOpportunities.length} tone="info" icon="chart" />
        <StatTile label="Taxa de conversão" value={`${winRate}%`} delta={`${wonOpportunities.length} ganhas · ${lostOpportunities.length} perdidas`} tone={winRate >= 50 ? "success" : "warning"} icon="check" />
        <StatTile label="Ações vencidas" value={overdueOpportunities.length} tone={overdueOpportunities.length > 0 ? "danger" : "success"} icon="document" />
      </div>
      <div className={styles.mainGrid}>
        <Card title="Funil de vendas" subtitle="Oportunidades por etapa">
          <BarList items={oppByStage} />
        </Card>
        <Card title="Ações vencidas" subtitle="Precisam de retorno imediato">
          {overdueOpportunities.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma ação vencida.</p>
          ) : (
            <ul className={styles.overdueList}>
              {overdueOpportunities.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link href="/painel/crm" className={styles.overdueRow}>
                    <Avatar name={personName(o.personId)} size="sm" />
                    <div className={styles.overdueInfo}>
                      <span className={styles.overdueName}>{personName(o.personId)}</span>
                      <span className={styles.overdueAction}>{o.nextAction}</span>
                    </div>
                    <span className={styles.overdueDue}>{formatDateTime(o.nextActionDueAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );

  const radarTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Radares ativos" value={radars.length} icon="radar" />
        <StatTile label="Com match" value={radarsWithMatch.length} tone="success" icon="check" />
        <StatTile label="Sem match no momento" value={radarsWithoutMatch} tone="neutral" icon="radar" />
        <StatTile label="Total de matches" value={totalMatches} tone="info" icon="chart" />
      </div>
      <Card title="Radares" subtitle="Perfis de busca e resultados">
        <ul className={styles.list}>
          {recentRadars.map((r) => {
            const matches = matchRadarToProperties(r, properties);
            return (
              <li key={r.id}>
                <ListRow
                  href={`/painel/radar/${r.id}`}
                  avatarName={personName(r.personId)}
                  title={personName(r.personId)}
                  subtitle={`${r.criteriaJson.city || "Qualquer local"} · ${PROPERTY_TYPE_LABELS[r.criteriaJson.propertyType] || r.criteriaJson.propertyType || ""}`}
                  right={<Badge tone={matches.length > 0 ? "success" : "neutral"}>{matches.length} match{matches.length === 1 ? "" : "es"}</Badge>}
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );

  const empresasTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Empresas" value={companies.length} icon="layers" />
        <StatTile label="Ativas" value={activeCompanies.length} tone="success" icon="check" />
        <StatTile label="Unidades" value={totalUnits} icon="layers" />
        <StatTile label="Usuários vinculados" value={users.length} icon="users" />
      </div>

      <Card title="Empresas do grupo" subtitle="Nayara Imóveis, Construções e Administração" className={styles.section}>
        <ul className={styles.list}>
          {companies.map((c) => (
            <li key={c.id}>
              <ListRow
                href={`/painel/empresas/${c.id}`}
                icon="layers"
                title={c.name}
                subtitle={`${c.units.length} unidade${c.units.length === 1 ? "" : "s"}`}
                right={<Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>{COMPANY_STATUS_LABELS[c.status] || c.status}</Badge>}
              />
            </li>
          ))}
        </ul>
      </Card>

      <div className={styles.mainGrid}>
        <Card title="Unidades por empresa" subtitle="Distribuição de filiais">
          <BarList items={unitsByCompany} />
        </Card>
        <Card title="Usuários por empresa" subtitle="Equipe vinculada">
          <BarList items={usersByCompany} />
        </Card>
      </div>
    </>
  );

  const usuariosTab = (
    <>
      <div className={styles.grid}>
        <StatTile label="Usuários" value={users.length} icon="users" />
        <StatTile label="Ativos" value={activeUsers.length} tone="success" icon="check" />
        <StatTile label="Suspensos" value={users.length - activeUsers.length} tone={users.length - activeUsers.length > 0 ? "danger" : "success"} icon="ban" />
        <StatTile label="Papéis distintos" value={usersByRole.length} icon="shield" />
      </div>
      <div className={styles.mainGrid}>
        <Card title="Por papel" subtitle="Distribuição de acessos">
          <BarList items={usersByRole} />
        </Card>
        <Card title="Usuários" subtitle="Equipe com acesso ao sistema">
          <ul className={styles.list}>
            {users.map((u) => (
              <li key={u.id}>
                <ListRow
                  href={`/painel/usuarios/${u.id}`}
                  avatarName={u.name}
                  title={u.name}
                  subtitle={u.email}
                  right={<Badge tone={u.status === "Ativo" ? "success" : "danger"}>{u.status}</Badge>}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );

  return (
    <AppShell title="Painel">
      <Tabs
        items={[
          { label: "Visão geral", content: overviewTab },
          { label: "Imóveis", content: imoveisTab },
          { label: "Contatos", content: contatosTab },
          { label: "CRM", content: crmTab },
          { label: "Radar", content: radarTab },
          { label: "Empresas & Unidades", content: empresasTab },
          { label: "Usuários", content: usuariosTab },
        ]}
      />
    </AppShell>
  );
}
