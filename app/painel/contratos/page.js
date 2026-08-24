"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import Alert from "@/components/molecules/Alert/Alert";
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
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function ContratosHubPage() {
  const [contracts, setContracts] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [keyDeliveries, setKeyDeliveries] = useState([]);
  const [legalCases, setLegalCases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listInspections(), listKeyDeliveries(), listLegalCases(), listProperties()])
      .then(([contractsRes, inspectionsRes, keyDeliveriesRes, legalCasesRes, propertiesRes]) => {
        if (cancelled) return;
        setContracts(contractsRes || []);
        setInspections(inspectionsRes || []);
        setKeyDeliveries(keyDeliveriesRes || []);
        setLegalCases(legalCasesRes || []);
        setProperties(propertiesRes || []);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

  if (loading) {
    return (
      <AppShell title="Contratos e Locação">
        <SkeletonDetail sections={3} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Contratos e Locação">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

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
