"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import Button from "@/components/atoms/Button/Button";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import {
  CONTRACTS,
  INSPECTIONS,
  KEY_DELIVERIES,
  LEGAL_CASES,
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
} from "@/lib/mock/legal";
import { PROPERTIES } from "@/lib/mock/properties";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

function propertyOf(id) {
  return PROPERTIES.find((p) => p.id === id) || null;
}

export default function ContratosHubPage() {
  const contracts = CONTRACTS;

  const activeContracts = useMemo(() => contracts.filter((c) => c.status === "ACTIVE"), [contracts]);
  const signingContracts = useMemo(() => contracts.filter((c) => c.status === "SIGNING"), [contracts]);
  const pendingInspections = useMemo(() => INSPECTIONS.filter((i) => i.status === "SCHEDULED"), []);
  const pendingKeyDeliveries = useMemo(() => KEY_DELIVERIES.filter((k) => k.status === "PENDING"), []);
  const openCases = useMemo(() => LEGAL_CASES.filter((c) => c.status === "OPEN"), []);

  const byStatus = useMemo(() => {
    const counts = {};
    contracts.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({ label: CONTRACT_STATUS_LABELS[status] || status, value, displayValue: String(value) }));
  }, [contracts]);

  const byType = useMemo(() => {
    const counts = {};
    contracts.forEach((c) => { counts[c.contractType] = (counts[c.contractType] || 0) + 1; });
    return Object.entries(counts).map(([type, value]) => ({ label: CONTRACT_TYPE_LABELS[type] || type, value, displayValue: String(value) }));
  }, [contracts]);

  const totalActiveValue = activeContracts.reduce((s, c) => s + Number(c.totalValue || 0), 0);

  return (
    <AppShell title="Contratos e Locação">
      <div className={styles.grid}>
        <StatTile label="Contratos ativos" value={activeContracts.length} tone="success" icon="signature" />
        <StatTile label="Em assinatura" value={signingContracts.length} tone="info" icon="pencil" />
        <StatTile label="Vistorias pendentes" value={pendingInspections.length} tone={pendingInspections.length > 0 ? "warning" : "success"} icon="eye" />
        <StatTile label="Chaves pendentes" value={pendingKeyDeliveries.length} tone={pendingKeyDeliveries.length > 0 ? "warning" : "success"} icon="key" />
        <StatTile label="Processos abertos" value={openCases.length} tone={openCases.length > 0 ? "danger" : "success"} icon="scale" />
        <StatTile label="Valor em contratos ativos" value={formatBRL(totalActiveValue)} tone="neutral" icon="money" />
      </div>

      <div className={styles.triGrid}>
        <Card title="Contratos por status" subtitle="Troque o tipo de gráfico">
          <SwitchableChart items={byStatus} defaultType="donut" />
        </Card>
        <Card title="Contratos por tipo" subtitle="Troque o tipo de gráfico">
          <SwitchableChart items={byType} defaultType="column" />
        </Card>
      </div>

      <div className={styles.mainGrid}>
        <Card
          title="Vistorias agendadas"
          subtitle="Ainda não concluídas"
          actions={<Link href="/painel/contratos/vistorias" className={styles.cardLink}>Ver todas</Link>}
        >
          {pendingInspections.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma vistoria pendente.</p>
          ) : (
            <ul className={styles.list}>
              {pendingInspections.map((i) => (
                <li key={i.id}>
                  <Link href={`/painel/contratos/vistorias/${i.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="eye" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{propertyOf(i.propertyId)?.name || "—"}</span>
                      <span className={styles.listRowSubtitle}>Agendada para {formatDate(i.scheduledAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Processos jurídicos abertos"
          subtitle="Aguardando andamento"
          actions={<Link href="/painel/contratos/processos" className={styles.cardLink}>Ver todos</Link>}
        >
          {openCases.length === 0 ? (
            <p className={styles.emptyText}>Nenhum processo aberto.</p>
          ) : (
            <ul className={styles.list}>
              {openCases.map((c) => (
                <li key={c.id}>
                  <Link href={`/painel/contratos/processos/${c.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="scale" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{c.caseNumber}</span>
                      <span className={styles.listRowSubtitle}>{c.summary}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <StickyActionBar>
        <ContractsNavMenu />
        <Button href="/painel/contratos/lista/novo">
          <Icon name="signature" size={18} /> Novo contrato
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
