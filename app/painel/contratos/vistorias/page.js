"use client";

import { useMemo, useState } from "react";
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
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { PROPERTIES } from "@/lib/mock/properties";
import {
  INSPECTIONS,
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

function propertyOf(id) {
  return PROPERTIES.find((p) => p.id === id) || null;
}

export default function VistoriasPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filtered = useMemo(() => {
    return INSPECTIONS.filter((i) => {
      const property = propertyOf(i.propertyId);
      if (query && !(property?.name || "").toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && i.inspectionType !== typeFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      return true;
    });
  }, [query, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const scheduledCount = INSPECTIONS.filter((i) => i.status === "SCHEDULED").length;
  const completedCount = INSPECTIONS.filter((i) => i.status === "COMPLETED").length;

  const columns = [
    {
      key: "property",
      label: "Imóvel",
      width: "34%",
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.nameMain}>{propertyOf(row.propertyId)?.name || "—"}</span>
          <span className={styles.nameSub}>{propertyOf(row.propertyId)?.city || ""}</span>
        </div>
      ),
    },
    {
      key: "inspectionType",
      label: "Tipo",
      width: "16%",
      render: (row) => <Badge tone={INSPECTION_TYPE_TONE[row.inspectionType]}>{INSPECTION_TYPE_LABELS[row.inspectionType]}</Badge>,
    },
    { key: "scheduledAt", label: "Data agendada", width: "18%", render: (row) => formatDate(row.scheduledAt) },
    {
      key: "status",
      label: "Status",
      width: "20%",
      render: (row) => (
        <div className={styles.statusCell}>
          <Badge tone={INSPECTION_STATUS_TONE[row.status]}>{INSPECTION_STATUS_LABELS[row.status]}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => <RowActions onView={() => router.push(`/painel/contratos/vistorias/${row.id}`)} />,
    },
  ];

  return (
    <AppShell title="Vistorias" backHref="/painel/contratos">
      <div className={styles.grid}>
        <StatTile label="Total de vistorias" value={INSPECTIONS.length} tone="neutral" icon="eye" />
        <StatTile label="Agendadas" value={scheduledCount} tone={scheduledCount > 0 ? "warning" : "success"} icon="calendar" />
        <StatTile label="Concluídas" value={completedCount} tone="success" icon="check" />
        <StatTile label="Itens com danos" value="—" tone="neutral" icon="filter" />
      </div>

      <Card title="Vistorias de entrada, saída e periódicas">
        <div className={styles.toolbar}>
          <SearchInput placeholder="Buscar por imóvel..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Select className={styles.filter} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os tipos</option>
            {Object.entries(INSPECTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            {Object.entries(INSPECTION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} rows={pageItems} emptyMessage="Nenhuma vistoria encontrada." />
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
