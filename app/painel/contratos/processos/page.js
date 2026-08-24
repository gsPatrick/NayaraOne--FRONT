"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { listProperties } from "@/lib/api/properties";
import { listLegalCases, listContracts } from "@/lib/api/legal";
import {
  CASE_TYPE_LABELS,
  CASE_TYPE_TONE,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONE,
} from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function ProcessosPage() {
  const router = useRouter();
  const [legalCases, setLegalCases] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listLegalCases(), listContracts(), listProperties()])
      .then(([casesRes, contractsRes, propertiesRes]) => {
        if (cancelled) return;
        setLegalCases(casesRes || []);
        setContracts(contractsRes || []);
        setProperties(propertiesRes || []);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar processos."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function propertyOf(id) {
    return properties.find((p) => p.id === id) || null;
  }

  function contractOf(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  const filtered = useMemo(() => {
    return legalCases.filter((c) => {
      if (query && !`${c.caseNumber} ${c.summary}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && c.caseType !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [legalCases, query, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCount = legalCases.filter((c) => c.status === "OPEN").length;

  const columns = [
    {
      key: "caseNumber",
      label: "Processo",
      width: "24%",
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.nameMain}>{row.caseNumber}</span>
          <span className={styles.nameSub}>{row.summary}</span>
        </div>
      ),
    },
    {
      key: "caseType",
      label: "Tipo",
      width: "16%",
      render: (row) => <Badge tone={CASE_TYPE_TONE[row.caseType]}>{CASE_TYPE_LABELS[row.caseType]}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      width: "14%",
      render: (row) => <Badge tone={CASE_STATUS_TONE[row.status] || "neutral"}>{CASE_STATUS_LABELS[row.status] || row.status}</Badge>,
    },
    {
      key: "related",
      label: "Contrato/Imóvel",
      width: "34%",
      render: (row) => {
        const contract = row.contractId ? contractOf(row.contractId) : null;
        const property = row.propertyId ? propertyOf(row.propertyId) : null;
        return (
          <div className={styles.nameCell}>
            <span className={styles.nameMain}>{contract?.contractNumber || "Sem contrato"}</span>
            <span className={styles.nameSub}>{property?.name || "—"}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => <RowActions onView={() => router.push(`/painel/contratos/processos/${row.id}`)} />,
    },
  ];

  if (loading) {
    return (
      <AppShell title="Processos jurídicos" backHref="/painel/contratos">
        <Spinner size="lg" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Processos jurídicos" backHref="/painel/contratos">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Total de processos" value={legalCases.length} tone="neutral" icon="scale" />
        <StatTile label="Abertos" value={openCount} tone={openCount > 0 ? "danger" : "success"} icon="filter" />
        <StatTile label="Contencioso" value={legalCases.filter((c) => c.caseType === "LITIGATION").length} tone="danger" icon="scale" />
        <StatTile label="Cobrança" value={legalCases.filter((c) => c.caseType === "COLLECTION").length} tone="warning" icon="money" />
      </div>

      <Card title="Processos jurídicos" subtitle="Contencioso, consultivo e cobrança">
        <div className={styles.toolbar}>
          <SearchInput placeholder="Buscar por número ou resumo..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Select className={styles.filter} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os tipos</option>
            {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} rows={pageItems} emptyMessage="Nenhum processo encontrado." />
        <div className={styles.paginationRow}>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          <label className={styles.pageSizeLabel}>
            Por página
            <Select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={8}>8</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
          </label>
        </div>
      </Card>

      <StickyActionBar>
        <ContractsNavMenu />
        <Button href="/painel/contratos/lista">
          <Icon name="signature" size={18} /> Ver contratos
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
