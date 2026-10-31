"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import Button from "@/components/atoms/Button/Button";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/mock/legal";
import { listContracts, listInspections, listKeyDeliveries, listLegalCases } from "@/lib/api/legal";
import { listProperties } from "@/lib/api/properties";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function ContratosHubPage() {
  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  // O painel é um resumo: contagem zero é resposta válida, então o estado "vazio" não substitui a página.
  const query = useAsyncState(async () => {
    const [contractsRes, inspectionsRes, keyDeliveriesRes, legalCasesRes, propertiesRes] = await Promise.all([listContracts(), listInspections(), listKeyDeliveries(), listLegalCases(), listProperties()]);
    return { contracts: contractsRes || [], inspections: inspectionsRes || [], keyDeliveries: keyDeliveriesRes || [], legalCases: legalCasesRes || [], properties: propertiesRes || [] };
  }, { key: "contratos-hub", isEmpty: () => false });
  const loaded = query.data;
  const contracts = useMemo(() => loaded?.contracts || [], [loaded]);
  const inspections = useMemo(() => loaded?.inspections || [], [loaded]);
  const keyDeliveries = useMemo(() => loaded?.keyDeliveries || [], [loaded]);
  const legalCases = useMemo(() => loaded?.legalCases || [], [loaded]);
  const properties = useMemo(() => loaded?.properties || [], [loaded]);

  function propertyOf(id) {
    return properties.find((p) => p.id === id) || null;
  }

  const activeContracts = useMemo(() => contracts.filter((c) => c.status === "ACTIVE"), [contracts]);
  const signingContracts = useMemo(() => contracts.filter((c) => c.status === "SIGNING"), [contracts]);
  const pendingInspections = useMemo(() => inspections.filter((i) => i.status === "SCHEDULED"), [inspections]);
  const pendingKeyDeliveries = useMemo(() => keyDeliveries.filter((k) => k.status === "PENDING"), [keyDeliveries]);
  const openCases = useMemo(() => legalCases.filter((c) => c.status === "OPEN"), [legalCases]);

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
      <AsyncState result={query} loadingLabel="Carregando contratos...">
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
                      <span className={styles.listRowTitle}>{propertyOf(i.propertyId)?.name || "Imóvel não encontrado"}</span>
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
      </AsyncState>

      <StickyActionBar>
        <ContractsNavMenu />
        <Button href="/painel/contratos/lista/novo">
          <Icon name="signature" size={18} /> Novo contrato
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
